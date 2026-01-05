import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import path from "path";
import express from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerAgentRoutes } from "./replit_integrations/agent";
import { extractBoardingPassData } from "./services/boardingPassOCR";
import { verifyFlightStatus } from "./services/flightVerification";
import OpenAI from "openai";

// Upload configuration
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // AI Agent Routes
  registerAgentRoutes(app);

  // Serve uploads statically
  app.use("/uploads", express.static("uploads"));

  // === PUBLIC ROUTES ===

  // Create Claim
  app.post(api.claims.create.path, async (req, res) => {
    try {
      const input = api.claims.create.input.parse(req.body);
      const claim = await storage.createClaim(input);
      
      // Auto-add timeline event
      await storage.createTimelineEvent({
        claimId: claim.id,
        eventType: "creation",
        message: "تم إنشاء المطالبة بنجاح", // Claim created successfully
      });

      res.status(201).json(claim);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Track Claim
  app.get("/api/claims/track/:claimId", async (req, res) => {
    try {
      const { claimId } = req.params;
      const { phone } = req.query; // Expect phone as query param since GET body is non-standard
      
      // Note: routes.ts defined input as body, but for GET it's usually query params.
      // We'll trust the query param here for simplicity in this MVP.
      
      const claim = await storage.getClaimByPublicId(claimId);
      
      if (!claim) {
        return res.status(404).json({ message: "المطالبة غير موجودة" }); // Claim not found
      }

      // Simple phone verification (in production use more robust auth)
      if (claim.customerPhone !== phone) {
         return res.status(404).json({ message: "بيانات غير مطابقة" }); // Data mismatch (security by obscurity)
      }

      const timeline = await storage.getTimelineEvents(claim.id);
      
      res.json({ claim, timeline });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get Claims History by Phone Number
  // Security: Require both phone AND a valid claimId that belongs to that phone as verification
  // This prevents phone number enumeration attacks
  app.get("/api/claims/history/:phone", async (req, res) => {
    try {
      const { phone } = req.params;
      const { verifyClaimId } = req.query;
      
      if (!phone || phone.length < 10) {
        return res.status(400).json({ message: "رقم الجوال غير صالح" });
      }
      
      // Require a verification claim ID to prove user knows at least one of their claims
      if (!verifyClaimId) {
        return res.status(401).json({ message: "يجب تقديم رقم مطالبة للتحقق من الهوية" });
      }
      
      // Verify that the provided claim ID belongs to this phone number
      const verifyClaim = await storage.getClaimByPublicId(verifyClaimId as string);
      if (!verifyClaim || verifyClaim.customerPhone !== phone) {
        return res.status(403).json({ message: "بيانات التحقق غير صحيحة" });
      }
      
      // If verification passed, return all claims for this phone
      const claims = await storage.getClaimsByPhone(phone);
      res.json(claims);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Upload Attachment (Public for now as part of creation flow)
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // If claimId is provided in body, link it immediately. 
    // Otherwise just return the path (frontend might upload before creating claim).
    // For this MVP, let's assume we return info and frontend sends it back when creating claim attachments.
    // BUT, schema says attachments need claimId. 
    // Strategy: Frontend creates claim FIRST, then uploads files with claimId.
    
    const claimId = req.body.claimId ? parseInt(req.body.claimId) : null;
    
    if (claimId) {
      const attachment = await storage.createAttachment({
        claimId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
      });
      return res.status(201).json(attachment);
    }

    // Temporary upload response if no claimId yet (though schema requires it, so this path is tricky)
    // We'll enforce claimId requirement in the upload for simplicity
    res.status(400).json({ message: "Claim ID required for upload" });
  });

  // === BOARDING PASS VERIFICATION (Admin Only) ===

  // Upload and analyze boarding pass
  app.post("/api/claims/:id/boarding-pass", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const claimId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع ملف" });
      }

      const claim = await storage.getClaim(claimId);
      if (!claim) {
        return res.status(404).json({ message: "المطالبة غير موجودة" });
      }

      // Only for flight claims
      if (claim.category !== "flight") {
        return res.status(400).json({ message: "هذه الميزة متاحة فقط لمطالبات الطيران" });
      }

      // Extract data from boarding pass using OpenAI Vision
      const ocrData = await extractBoardingPassData(req.file.path);

      // Create or update flight verification record
      const existing = await storage.getFlightVerification(claimId);
      
      if (existing) {
        const updated = await storage.updateFlightVerification(claimId, {
          flightNumber: ocrData.flightNumber,
          airline: ocrData.airline,
          departureAirport: ocrData.departureAirport,
          arrivalAirport: ocrData.arrivalAirport,
          scheduledDeparture: ocrData.scheduledDeparture,
          passengerName: ocrData.passengerName,
          ocrConfidence: ocrData.confidence,
          boardingPassPath: req.file.path,
          verificationStatus: "pending",
        });
        res.json({ verification: updated, ocrData });
      } else {
        const verification = await storage.createFlightVerification({
          claimId,
          flightNumber: ocrData.flightNumber,
          airline: ocrData.airline,
          departureAirport: ocrData.departureAirport,
          arrivalAirport: ocrData.arrivalAirport,
          scheduledDeparture: ocrData.scheduledDeparture,
          passengerName: ocrData.passengerName,
          ocrConfidence: ocrData.confidence,
          boardingPassPath: req.file.path,
          verificationStatus: "pending",
        });
        res.json({ verification, ocrData });
      }

      // Also save as attachment
      await storage.createAttachment({
        claimId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
      });

      // Add timeline event
      await storage.createTimelineEvent({
        claimId,
        eventType: "info_request",
        message: `تم رفع بطاقة الصعود وقراءة البيانات: رحلة ${ocrData.flightNumber || "غير محدد"}`,
      });

    } catch (error) {
      console.error("Boarding pass upload error:", error);
      res.status(500).json({ message: "فشل في معالجة بطاقة الصعود" });
    }
  });

  // Verify flight status from external API
  app.post("/api/claims/:id/verify-flight", isAuthenticated, async (req, res) => {
    try {
      const claimId = parseInt(req.params.id);
      
      const verification = await storage.getFlightVerification(claimId);
      if (!verification) {
        return res.status(404).json({ message: "يرجى رفع بطاقة الصعود أولاً" });
      }

      if (!verification.flightNumber || !verification.scheduledDeparture) {
        return res.status(400).json({ message: "بيانات الرحلة غير مكتملة" });
      }

      // Call external API to verify flight status
      const flightResult = await verifyFlightStatus(
        verification.flightNumber,
        new Date(verification.scheduledDeparture),
        verification.departureAirport || undefined
      );

      // Update verification record
      const updated = await storage.updateFlightVerification(claimId, {
        verificationStatus: flightResult.flightStatus === "unknown" ? "error" : "verified",
        flightStatus: flightResult.flightStatus,
        actualDeparture: flightResult.actualDeparture,
        delayMinutes: flightResult.delayMinutes,
        verificationSource: flightResult.source,
        verificationRawData: flightResult.rawData,
      });

      // Add timeline event
      let statusMessage = "";
      if (flightResult.flightStatus === "delayed" && flightResult.delayMinutes) {
        statusMessage = `تم التحقق: الرحلة ${verification.flightNumber} تأخرت ${flightResult.delayMinutes} دقيقة`;
      } else if (flightResult.flightStatus === "cancelled") {
        statusMessage = `تم التحقق: الرحلة ${verification.flightNumber} ملغاة`;
      } else if (flightResult.flightStatus === "on_time") {
        statusMessage = `تم التحقق: الرحلة ${verification.flightNumber} في موعدها`;
      } else {
        statusMessage = `لم نتمكن من التحقق من حالة الرحلة ${verification.flightNumber}`;
      }

      await storage.createTimelineEvent({
        claimId,
        eventType: "note",
        message: statusMessage,
      });

      res.json({ verification: updated, flightResult });
    } catch (error) {
      console.error("Flight verification error:", error);
      res.status(500).json({ message: "فشل في التحقق من حالة الرحلة" });
    }
  });

  // Get flight verification for a claim
  app.get("/api/claims/:id/verification", isAuthenticated, async (req, res) => {
    try {
      const claimId = parseInt(req.params.id);
      const verification = await storage.getFlightVerification(claimId);
      res.json(verification || null);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب بيانات التحقق" });
    }
  });

  // === AI FLIGHT AGENT ENDPOINT ===
  // Claim-centric AI analysis with 3 modes: analyze, draft, followup
  const flightAgentSchema = z.object({
    claimId: z.number(),
    mode: z.enum(["analyze", "draft", "followup"]),
    claimData: z.object({
      airline: z.string(),
      flightNumber: z.string(),
      date: z.string(),
      from: z.string(),
      to: z.string(),
      disruptionType: z.string(),
      delayMinutes: z.number().optional(),
      reasonText: z.string().optional(),
    }),
    evidenceText: z.string(),
    airlineResponseText: z.string().optional(),
  });

  app.post("/api/ai/flight-agent", isAuthenticated, async (req, res) => {
    try {
      const input = flightAgentSchema.parse(req.body);
      const { claimId, mode, claimData, evidenceText, airlineResponseText } = input;

      // Verify claim exists
      const claim = await storage.getClaim(claimId);
      if (!claim) {
        return res.status(404).json({ message: "المطالبة غير موجودة" });
      }

      // Generate input hash for caching
      const inputData = JSON.stringify({ claimData, evidenceText, airlineResponseText, mode });
      const inputHash = crypto.createHash("md5").update(inputData).digest("hex");

      // Check cache - if same input+mode, return cached result
      const existingOutput = await storage.getAiOutput(claimId);
      if (existingOutput && existingOutput.lastInputHash === inputHash && existingOutput.lastMode === mode) {
        return res.json({
          ai_summary: existingOutput.summary,
          ai_case_strength: existingOutput.caseStrength,
          ai_eligibility_reasoning: existingOutput.eligibilityReasoning,
          ai_claim_draft: existingOutput.claimDraft,
          ai_next_action: existingOutput.nextAction,
          cached: true,
        });
      }

      // OpenAI client setup
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      // Build the prompt based on mode
      let systemPrompt = `أنت "وكيل سند الذكي" - وكيل مطالبات طيران محترف يتصرف نيابة عن الركاب.

معلومات القضية:
- شركة الطيران: ${claimData.airline}
- رقم الرحلة: ${claimData.flightNumber}
- التاريخ: ${claimData.date}
- من: ${claimData.from}
- إلى: ${claimData.to}
- نوع المشكلة: ${claimData.disruptionType}
${claimData.delayMinutes ? `- مدة التأخير: ${claimData.delayMinutes} دقيقة` : ""}
${claimData.reasonText ? `- سبب المشكلة: ${claimData.reasonText}` : ""}

الأدلة المتاحة:
${evidenceText || "لا توجد أدلة نصية"}
`;

      let userPrompt = "";

      if (mode === "analyze") {
        userPrompt = `قم بتحليل هذه القضية وأعطني:
1. ملخص القضية (ai_summary): ملخص موجز للحالة
2. قوة القضية (ai_case_strength): اختر واحدة فقط: strong أو medium أو weak
3. تحليل الأهلية (ai_eligibility_reasoning): شرح سبب استحقاق أو عدم استحقاق التعويض
4. الخطوة التالية (ai_next_action): ما هي الخطوة المقترحة

أجب بصيغة JSON فقط مع هذه الحقول.`;
      } else if (mode === "draft") {
        userPrompt = `بناءً على تحليل القضية، قم بصياغة رسالة مطالبة رسمية للشركة تتضمن:
- تفاصيل الرحلة
- وصف المشكلة
- طلب التعويض
- موعد نهائي للرد

أعطني:
1. ai_claim_draft: نص المطالبة كاملاً
2. ai_next_action: الخطوة التالية بعد إرسال المطالبة

أجب بصيغة JSON فقط.`;
      } else if (mode === "followup") {
        systemPrompt += `\nرد شركة الطيران:
${airlineResponseText || "لا يوجد رد"}`;
        userPrompt = `بناءً على رد الشركة، قم بـ:
1. تحليل الرد
2. اقتراح: قبول / رفض / تصعيد
3. صياغة رد مناسب إذا لزم الأمر

أعطني:
1. ai_summary: ملخص الموقف الحالي
2. ai_claim_draft: نص الرد/المتابعة
3. ai_next_action: التوصية (accept/counter/escalate)

أجب بصيغة JSON فقط.`;
      }

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let aiResult: any;
      try {
        aiResult = JSON.parse(responseText);
      } catch {
        aiResult = { ai_summary: responseText };
      }

      // Normalize field names
      const normalizedResult = {
        ai_summary: aiResult.ai_summary || aiResult.summary || null,
        ai_case_strength: aiResult.ai_case_strength || aiResult.case_strength || aiResult.caseStrength || null,
        ai_eligibility_reasoning: aiResult.ai_eligibility_reasoning || aiResult.eligibility_reasoning || aiResult.eligibilityReasoning || null,
        ai_claim_draft: aiResult.ai_claim_draft || aiResult.claim_draft || aiResult.claimDraft || null,
        ai_next_action: aiResult.ai_next_action || aiResult.next_action || aiResult.nextAction || null,
      };

      // Save to database
      await storage.upsertAiOutput(claimId, {
        summary: normalizedResult.ai_summary,
        caseStrength: normalizedResult.ai_case_strength,
        eligibilityReasoning: normalizedResult.ai_eligibility_reasoning,
        claimDraft: normalizedResult.ai_claim_draft,
        nextAction: normalizedResult.ai_next_action,
        lastInputHash: inputHash,
        lastMode: mode,
      });

      // Add timeline event
      const modeLabels: Record<string, string> = {
        analyze: "تحليل الذكاء الاصطناعي",
        draft: "صياغة المطالبة",
        followup: "متابعة/تصعيد",
      };
      await storage.createTimelineEvent({
        claimId,
        eventType: "ai_action",
        message: `تم إنشاء ${modeLabels[mode]} بواسطة وكيل سند الذكي`,
      });

      res.json({ ...normalizedResult, cached: false });
    } catch (error) {
      console.error("Flight agent error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في معالجة الطلب" });
    }
  });

  // === ADMIN ROUTES (Protected) ===

  // List Claims
  app.get(api.claims.list.path, isAuthenticated, async (req, res) => {
    const claims = await storage.getClaims({
      status: req.query.status as string,
      category: req.query.category as string,
      search: req.query.search as string,
    });
    res.json(claims);
  });

  // Get Claim Details
  app.get(api.claims.get.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const claim = await storage.getClaim(id);
    
    if (!claim) {
      return res.status(404).json({ message: "Not Found" });
    }

    const [attachments, timelineEvents, communications, settlement, flightVerification, aiOutput] = await Promise.all([
      storage.getAttachments(id),
      storage.getTimelineEvents(id),
      storage.getCommunications(id),
      storage.getSettlement(id),
      storage.getFlightVerification(id),
      storage.getAiOutput(id)
    ]);

    res.json({
      ...claim,
      attachments,
      timelineEvents,
      communications,
      settlement,
      flightVerification,
      aiOutput
    });
  });

  // Update Claim
  app.patch(api.claims.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.claims.update.input.parse(req.body);
      
      const currentClaim = await storage.getClaim(id);
      if (!currentClaim) return res.status(404).json({ message: "Not Found" });

      const updated = await storage.updateClaim(id, input);

      // Log status change if happened
      if (input.status && input.status !== currentClaim.status) {
        await storage.createTimelineEvent({
          claimId: id,
          eventType: "status_change",
          message: `تم تغيير الحالة إلى ${input.status}`, // Status changed to...
        });
      }

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Add Timeline Event
  app.post(api.timeline.create.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const input = api.timeline.create.input.parse(req.body);
    const event = await storage.createTimelineEvent({ ...input, claimId: id });
    res.status(201).json(event);
  });

  // Add Communication
  app.post(api.communications.create.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const input = api.communications.create.input.parse(req.body);
    const comm = await storage.createCommunication({ ...input, claimId: id });
    res.status(201).json(comm);
  });

  // Create Settlement
  app.post(api.settlements.create.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const input = api.settlements.create.input.parse(req.body);
    
    // Check if already settled
    const existing = await storage.getSettlement(id);
    if (existing) {
      return res.status(400).json({ message: "Already settled" });
    }

    const settlement = await storage.createSettlement({ ...input, claimId: id });
    
    // Log event
    await storage.createTimelineEvent({
      claimId: id,
      eventType: "settlement",
      message: "تم تسوية المطالبة وإغلاقها", // Claim settled and closed
    });

    res.status(201).json(settlement);
  });

  // Seed Data (if empty)
  // Simple check on one category to see if we need to seed
  const existingClaims = await storage.getClaims();
  if (existingClaims.length === 0) {
    await seedDatabase();
  }

  return httpServer;
}

async function seedDatabase() {
  // Create a few sample claims
  const c1 = await storage.createClaim({
    category: "flight",
    issueType: "delay",
    companyName: "Saudi Airlines",
    referenceNumber: "SV12345",
    incidentDate: new Date(),
    description: "تأخرت الرحلة لمدة 5 ساعات مما تسبب في فوات رحلة الربط.",
    customerName: "أحمد محمد",
    customerPhone: "0501234567",
    customerEmail: "ahmed@example.com",
    flightFrom: "Riyadh",
    flightTo: "London",
    flightScheduledTime: new Date(),
  });
  
  await storage.createTimelineEvent({
    claimId: c1.id,
    eventType: "creation",
    message: "تم فتح المطالبة",
  });

  const c2 = await storage.createClaim({
    category: "delivery",
    issueType: "damaged",
    companyName: "Noon",
    referenceNumber: "ORD-998877",
    incidentDate: new Date(),
    description: "وصل المنتج مكسوراً والتغليف تالف.",
    customerName: "سارة علي",
    customerPhone: "0559988776",
    deliveryCity: "Jeddah",
  });

  await storage.createTimelineEvent({
    claimId: c2.id,
    eventType: "creation",
    message: "تم فتح المطالبة",
  });
}
