import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface DocumentVerificationResult {
  documentType: "boarding_pass" | "ticket" | "receipt" | "invoice" | "id_document" | "other" | "unknown";
  isRelevantToClaim: boolean;
  extractedData: {
    flightNumber?: string;
    airline?: string;
    passengerName?: string;
    departureAirport?: string;
    arrivalAirport?: string;
    date?: string;
    amount?: string;
    currency?: string;
    orderNumber?: string;
    companyName?: string;
  };
  verificationNotes: string;
  confidence: number;
  warnings: string[];
}

const DOCUMENT_VERIFICATION_PROMPT = `أنت خبير في تحليل المستندات والتحقق منها لمطالبات التعويض.

قم بتحليل الصورة المرفقة واستخراج المعلومات التالية:

1. نوع المستند (boarding_pass, ticket, receipt, invoice, id_document, other, unknown)
2. هل المستند ذو صلة بمطالبة تعويض (طيران/توصيل)
3. البيانات المستخرجة حسب نوع المستند
4. ملاحظات حول صحة ومصداقية المستند
5. أي تحذيرات (مستند مشبوه، بيانات غير واضحة، إلخ)

أعد الرد بصيغة JSON فقط:
{
  "documentType": "boarding_pass" | "ticket" | "receipt" | "invoice" | "id_document" | "other" | "unknown",
  "isRelevantToClaim": true/false,
  "extractedData": {
    "flightNumber": "رقم الرحلة إن وجد",
    "airline": "اسم شركة الطيران",
    "passengerName": "اسم المسافر",
    "departureAirport": "رمز مطار المغادرة",
    "arrivalAirport": "رمز مطار الوصول",
    "date": "التاريخ بصيغة YYYY-MM-DD",
    "amount": "المبلغ إن وجد",
    "currency": "العملة",
    "orderNumber": "رقم الطلب/الفاتورة",
    "companyName": "اسم الشركة"
  },
  "verificationNotes": "ملاحظات عن المستند وصحته",
  "confidence": 0-100,
  "warnings": ["قائمة التحذيرات إن وجدت"]
}

إذا لم تتمكن من قراءة المستند، أعد confidence = 0 و documentType = "unknown"`;

export async function verifyDocument(imagePath: string): Promise<DocumentVerificationResult> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const absolutePath = path.resolve(imagePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error("Image file not found");
  }

  const imageBuffer = fs.readFileSync(absolutePath);
  const base64Image = imageBuffer.toString("base64");
  
  const ext = path.extname(imagePath).toLowerCase();
  let mimeType = "image/jpeg";
  if (ext === ".png") mimeType = "image/png";
  else if (ext === ".webp") mimeType = "image/webp";
  else if (ext === ".gif") mimeType = "image/gif";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: DOCUMENT_VERIFICATION_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        documentType: "unknown",
        isRelevantToClaim: false,
        extractedData: {},
        verificationNotes: "لم نتمكن من تحليل المستند",
        confidence: 0,
        warnings: ["فشل في استخراج البيانات"],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      documentType: parsed.documentType || "unknown",
      isRelevantToClaim: !!parsed.isRelevantToClaim,
      extractedData: parsed.extractedData || {},
      verificationNotes: parsed.verificationNotes || "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch (error) {
    console.error("Document verification error:", error);
    throw new Error("Failed to verify document");
  }
}

export async function verifyMultipleDocuments(imagePaths: string[]): Promise<DocumentVerificationResult[]> {
  const results: DocumentVerificationResult[] = [];
  
  for (const imagePath of imagePaths) {
    try {
      const result = await verifyDocument(imagePath);
      results.push(result);
    } catch (error) {
      results.push({
        documentType: "unknown",
        isRelevantToClaim: false,
        extractedData: {},
        verificationNotes: `خطأ في معالجة الملف: ${imagePath}`,
        confidence: 0,
        warnings: ["فشل في معالجة الملف"],
      });
    }
  }
  
  return results;
}
