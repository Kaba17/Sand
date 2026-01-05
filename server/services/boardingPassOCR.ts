import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface BoardingPassData {
  flightNumber: string | null;
  airline: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  scheduledDeparture: Date | null;
  passengerName: string | null;
  confidence: number;
}

const OCR_PROMPT = `You are an expert at extracting flight information from boarding passes.

Analyze the provided boarding pass image and extract the following information:
- Flight number (e.g., SV123, EK456, QR789)
- Airline name
- Departure airport code and city
- Arrival airport code and city
- Scheduled departure date and time
- Passenger name

Return ONLY a valid JSON object with this exact structure:
{
  "flightNumber": "string or null if not found",
  "airline": "string or null if not found",
  "departureAirport": "IATA code (e.g., RUH) or null",
  "arrivalAirport": "IATA code (e.g., LHR) or null",
  "scheduledDeparture": "ISO 8601 datetime string or null",
  "passengerName": "string or null if not found",
  "confidence": 0-100
}

Set confidence based on how clearly you could read the information:
- 90-100: All fields clearly visible
- 70-89: Most fields visible, some inferred
- 50-69: Some fields unclear or estimated
- Below 50: Many fields missing or unreadable

If the image is not a boarding pass, return:
{
  "flightNumber": null,
  "airline": null,
  "departureAirport": null,
  "arrivalAirport": null,
  "scheduledDeparture": null,
  "passengerName": null,
  "confidence": 0
}`;

export async function extractBoardingPassData(imagePath: string): Promise<BoardingPassData> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const absolutePath = path.resolve(imagePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error("Image file not found");
  }

  const imageBuffer = fs.readFileSync(absolutePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
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
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        flightNumber: null,
        airline: null,
        departureAirport: null,
        arrivalAirport: null,
        scheduledDeparture: null,
        passengerName: null,
        confidence: 0,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      flightNumber: parsed.flightNumber || null,
      airline: parsed.airline || null,
      departureAirport: parsed.departureAirport || null,
      arrivalAirport: parsed.arrivalAirport || null,
      scheduledDeparture: parsed.scheduledDeparture ? new Date(parsed.scheduledDeparture) : null,
      passengerName: parsed.passengerName || null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    };
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw new Error("Failed to extract boarding pass data");
  }
}
