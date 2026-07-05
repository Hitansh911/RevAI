// Visit http://localhost:3000/api/test-groq
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
        return NextResponse.json({ error: "GROQ_API_KEY not set in .env" });
    }

    try {
        const openai = new OpenAI({
            apiKey: key,
            baseURL: "https://api.groq.com/openai/v1",
        });

        // Test the API key by listing available models
        const listRes = await openai.models.list();
        
        const usable = listRes.data.map((m: any) => m.id);

        return NextResponse.json({ 
            success: true, 
            message: "Groq API is working!",
            availableModels: usable 
        });
    } catch (error: any) {
        return NextResponse.json({ 
            error: "Failed to list Groq models", 
            details: error.message 
        });
    }
}
