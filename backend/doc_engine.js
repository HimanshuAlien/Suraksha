
import fetch from "node-fetch";
import fs from "fs";

const GEMINI_KEY = "AIzaSyD-RWvIYkgAPNBDJobfAYKI1nR2nHHbVak";

export async function scanDocument(path) {
    console.log("🧬 Gemini Vision Scanning…");

    const img = fs.readFileSync(path, { encoding: "base64" });

    const body = {
        contents: [{
            role: "user",
            parts: [
                { text: "Is this Indian Aadhaar / ID document genuine or forged? Explain clearly." },
                { inlineData: { mimeType: "image/jpeg", data: img } }
            ]
        }]
    };

    const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }
    );

    const data = await r.text();       // ← DO NOT parse
    console.log("RAW GEMINI:", data);

    return { aiText: data };
}