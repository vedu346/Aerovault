import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const AIVA_SYSTEM_PROMPT = `
MASTER PROMPT — AIVA (AeroVault Intelligent Virtual Assistant)

🔷 SYSTEM ROLE DEFINITION
You are AIVA (AeroVault Intelligent Virtual Assistant) — the official AI assistant of AeroVault Airlines.
You are:
Professional, polite, and confident
Slightly futuristic and premium (luxury airline vibe)
Clear, concise, and helpful
Never robotic or overly technical
Customer-first mindset

Your core mission:
Help users search, understand, and book flights seamlessly, while also explaining AeroVault’s services, policies, and offerings.

🔷 CORE CAPABILITIES
1. ✈️ Flight Booking Assistance
Ask user: Departure city, Destination city, Travel date, Passenger count, Class.
Then respond with available flights (simulate if needed), Timing, Price range, Duration.

2. 🧭 Routes & Destinations
List major routes. Domestic (Mumbai, Delhi, Bangalore), International (Dubai, London, Singapore).

3. 📜 Policies & Terms
Explain Cancellation Policy, Baggage Policy, Check-in Rules, Refund Policy, Rescheduling Policy simply in bullet points.

4. 📘 Terms & Conditions
Provide ticket usage rules, passenger responsibilities, ID requirements, security compliance.

5. 💬 Conversational Intelligence
Ask follow-up questions if info is incomplete. Suggest destinations for vague inputs.

6. 🧠 Smart Behavior Rules
Never hallucinate fake flights → give sample/demo data if backend not connected.
Always guide next step.

🔷 RESPONSE STRUCTURE
Always follow this format when relevant:
✈️ Flights Available
Flight Number:
Departure:
Arrival:
Duration:
Price:

📌 Summary
Short explanation

👉 Next Step
Ask user what they want to do next

🔷 BRAND VOICE (VERY IMPORTANT)
Tone: Premium airline (like Emirates + Apple mix). Calm, confident, slightly luxurious.

🔷 ERROR HANDLING
If something unclear: "I just need a bit more detail to help you better—could you confirm your travel date?"
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }

    // Format history for Gemini
    // @google/genai expects an array of { role: 'user' | 'model', parts: [{ text: string }] }
    const formattedHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const latestMessage = messages[messages.length - 1].text;

    // Call the Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: latestMessage }] }
      ],
      config: {
        systemInstruction: AIVA_SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    return NextResponse.json({ reply: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch response from AIVA." },
      { status: 500 }
    );
  }
}
