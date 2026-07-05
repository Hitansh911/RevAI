import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const googleFormUrl = formData.get("googleFormUrl") as string | null;

    let extractedText = "";

    if (googleFormUrl) {
      // Fetch Google Form HTML
      const formRes = await fetch(googleFormUrl);
      if (!formRes.ok) throw new Error("Failed to fetch Google Form URL");
      const html = await formRes.text();
      
      // Simple regex to extract human-readable text from HTML (remove scripts, styles, tags)
      extractedText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } else if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.name.endsWith(".pdf")) {
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } else if (file.name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else {
        return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or DOCX file." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "No file or URL provided." }, { status: 400 });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("Could not extract any readable text from the provided source.");
    }

    // Limit text length to avoid token limits (Groq LLaMA handles ~8k tokens, we can safely send ~15,000 characters)
    extractedText = extractedText.substring(0, 15000);

    const prompt = `You are a helpful assistant. I have provided a block of extracted text below (from a PDF, Word document, or Google Form).
Your task is to identify and extract up to 10 feedback questions from this text.

Extracted Text:
"""
${extractedText}
"""

Rules:
1. Find and extract the questions that are meant for the user/student to answer.
2. For each question, determine its type:
   - "rating": if it asks for a score, rating, or scale (1-5, yes/no, etc.)
   - "text": if it asks for open-ended feedback or suggestions.
3. Return the questions as a raw JSON array. Do not include markdown formatting or backticks.
4. Each object in the array MUST have the exact keys: "id" (generate a unique short string like "import_1"), "text" (the question itself), and "type" ("rating" or "text").
5. Extract a maximum of 10 questions. If there are fewer, just return those.

Example format:
[
  {"id": "import_1", "text": "How would you rate the instructor?", "type": "rating"},
  {"id": "import_2", "text": "What improvements do you suggest?", "type": "text"}
]
`;

    const response = await new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    }).chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an expert question extraction AI." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
    });

    const responseText = response.choices[0].message.content?.trim();
    if (!responseText) throw new Error("Empty response from AI");

    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    if (!Array.isArray(questions)) throw new Error("Invalid questions format");

    return NextResponse.json({ questions });

  } catch (error: any) {
    console.error("Extract questions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract questions." },
      { status: 500 }
    );
  }
}
