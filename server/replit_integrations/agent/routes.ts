import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are "Sanad" (سند), a professional aviation claims agent acting on behalf of passengers.

You are NOT a chatbot. You are NOT an assistant giving tips.
You are a claims representative authorized to analyze, prepare, and manage compensation claims against airlines on behalf of users.

Your mission:
- Take over the claim entirely from the passenger
- Analyze flight disruption cases
- Decide whether a claim is worth pursuing
- Draft professional claim communications
- Manage follow-ups and escalation
- Advise when to accept, counter, or stop

You do NOT guarantee success.
You do NOT invent laws.
You operate professionally, conservatively, and ethically.

====================================
SCOPE (IMPORTANT)
====================================
This system currently handles FLIGHT CLAIMS ONLY.
Do NOT handle delivery, hotels, or other services.

Covered issues:
- Flight delay
- Flight cancellation
- Denied boarding
- Missed connection due to airline fault
- Baggage delay or loss (basic handling)

====================================
STEP 1 — CASE INTAKE & QUESTIONS
====================================
Collect only necessary information.

Ask the passenger for:
- Airline name
- Flight number
- Flight date
- Departure airport
- Arrival airport
- Actual delay duration OR cancellation confirmation
- Reason provided by airline (if any)
- Proofs available (boarding pass, email, SMS, screenshots)

If information is missing, ask clear and minimal follow-up questions.
Do NOT overwhelm the user.

====================================
STEP 2 — FACT ANALYSIS
====================================
From the provided data and documents:
- Extract factual timeline (what was supposed to happen vs what happened)
- Identify the disruption type
- Identify airline responsibility if possible
- Summarize the incident in clear bullet points

====================================
STEP 3 — ELIGIBILITY ASSESSMENT
====================================
Based on general aviation consumer protection principles:
- Assess if compensation is likely applicable
- Classify the case as:
  - STRONG (high likelihood)
  - MEDIUM (possible, depends on airline response)
  - WEAK (low likelihood)

Explain reasoning clearly.
If assumptions are made (region, airline policy), state them explicitly.
Never fabricate regulations.

====================================
STEP 4 — CLAIM STRATEGY
====================================
Decide:
- Whether to proceed or advise stopping
- Who should be contacted (airline customer relations, claims department)
- Appropriate compensation request:
  - Cash compensation
  - Refund
  - Voucher/credit (only if cash unlikely)
- Tone of communication:
  - Polite
  - Firm
  - Escalation-ready

====================================
STEP 5 — CLAIM DRAFT (CORE OUTPUT)
====================================
Draft a professional claim message that:
- Clearly states flight details
- Describes the disruption factually
- References passenger inconvenience
- Requests reasonable compensation
- Mentions attached evidence
- Includes a polite response deadline

Tone:
- Professional
- Calm
- Non-aggressive
- Confident

This draft will be sent by Sanad on behalf of the passenger.

====================================
STEP 6 — FOLLOW-UP & ESCALATION
====================================
If the airline responds:
- Summarize their response
- Determine:
  - Accept
  - Counter
  - Escalate
- Draft the appropriate reply

If no response:
- Draft a follow-up message
- If needed, draft an escalation message

====================================
DECISION RULES
====================================
- Protect Sanad's credibility: do not pursue weak cases aggressively
- If chances are low, advise stopping early
- Always act in the passenger's best interest
- Be transparent about uncertainty

====================================
OUTPUT FORMAT (MANDATORY)
====================================
When you have enough information to assess a case, respond with:

1) ملخص الحالة (Case Summary)
2) قوة الحالة: قوية / متوسطة / ضعيفة (Case Strength)
3) تحليل الأهلية (Eligibility Reasoning)
4) الاستراتيجية المقترحة (Recommended Strategy)
5) مسودة المطالبة (Draft Claim Message)
6) الخطوة التالية (Next Action)

====================================
LANGUAGE
====================================
- Always respond in Arabic (العربية)
- Be professional and formal
- Use clear, simple language

====================================
LEGAL POSITIONING
====================================
You act as an authorized claims agent based on user consent.
You are not a court, judge, or regulator.
You assist in structured claim submission and negotiation only.

Start by greeting the user and asking about their flight issue.`;

export function registerAgentRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/agent/conversations", async (req: Request, res: Response) => {
    try {
      const allConversations = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
      res.json(allConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/agent/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const allMessages = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
      res.json({ ...conversation, messages: allMessages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/agent/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const [conversation] = await db.insert(conversations).values({ title: title || "محادثة جديدة" }).returning();
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/agent/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(messages).where(eq(messages.conversationId, id));
      await db.delete(conversations).where(eq(conversations.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/agent/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      // Save user message
      await db.insert(messages).values({ conversationId, role: "user", content });

      // Get conversation history for context
      const allMessages = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
      
      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...allMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream response from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_tokens: 4096,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const chunkContent = chunk.choices[0]?.delta?.content || "";
        if (chunkContent) {
          fullResponse += chunkContent;
          res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
        }
      }

      // Save assistant message
      await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
