import fetch from "node-fetch";

export async function getGeminiMisinfoSummary(claim, gatheredData, scoreData) {
    try {
        const key = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
        if (!key) throw new Error("No API key");

        const prompt = `
You are a Misinformation Analyst. Analyze the claim: "${claim}"
Fact Checks: ${gatheredData.facts.matches}. News: ${gatheredData.news.articles_found}. GDELT: ${gatheredData.gdelt.mentions}. Score: ${scoreData.score}.
Provide a structured, unbiased evaluation in ONLY this JSON structure exactly:
{
  "explanation": "A concise paragraph summarizing whether this claim is true, false, misleading or unverified.",
  "findings": ["Short bullet point 1", "Short bullet point 2", "Short bullet point 3"]
}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
        });

        const data = await res.json();
        if (!data.candidates || !data.candidates[0]) {
            throw new Error(data.error?.message || "Gemini AI API problem.");
        }

        let raw = data.candidates[0].content.parts[0].text;
        raw = raw.replace(/```json|```/g, "").trim();
        return JSON.parse(raw);
    } catch (e) {
        console.error("Gemini AI Service Error:", e.message);
        
        // Dynamic procedural fallback for robust demo / bad keys
        let verdictText = scoreData.score >= 70 ? "likely true" : scoreData.score <= 35 ? "likely false or debunked" : "currently unverified";
        let reason = gatheredData.news.articles_found > 0 ? "Multiple news sources have reported on related keywords." : "No mainstream news articles were immediately found corroborating this exact phrasing.";
        
        return {
            explanation: `Based on automated heuristic analysis, this claim is ${verdictText}. ${reason} However, since our active AI synthesis engine is currently offline or unreachable, a deep contextual verification could not be rendered. Proceed with caution.`,
            findings: [
                `Automated Truth Context Score evaluated at ${scoreData.score}/100.`,
                `Fact-checking databases returned ${gatheredData.facts.matches} direct matches.`,
                `Global news indexing tracked ${gatheredData.gdelt.mentions} mentions of these keywords today.`
            ]
        };
    }
}

export async function getGeminiChatResponse(history, claimContext) {
    try {
        const key = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
        const messages = [
            { role: "user", parts: [{ text: `System Context: You are a casual, direct fact-check assistant for the claim: "${claimContext}". \n\nRULES:\n1. Speak casually, briefly, and directly (like a friend, can use 'bro').\n2. MAX 1-2 SHORT SENTENCES per answer.\n3. NO LECTURES, NO DISCLAIMERS, NO FINANCIAL ADVICE WARNINGS.\n4. Just provide raw facts or reasoning. No preachy 'you should consider' stuff.` }] },
            { role: "model", parts: [{ text: "Got it, bro. I'll keep it short, casual, and straight to the point. No lectures." }] },
            ...history
        ];

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: messages })
            }
        );

        const data = await res.json();
        
        if (!data.candidates || !data.candidates[0]) {
            throw new Error(data.error?.message || "Gemini API rejected the chat request.");
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        console.error("Gemini Chat Error:", e.message);
        return "I'm currently unable to chat because the AI connection is offline (Invalid or Missing API Key). Please update your API key inside `.env`.";
    }
}
