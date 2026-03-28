import fetch from "node-fetch";
const GEMINI_KEY = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;

export async function aiAdvisory(report) {

    const prompt = `
You are a CERT-IN cyber security officer.

Analyze this cyber threat report:

${JSON.stringify(report, null, 2)}

Your job is to protect Indian citizens.

Identify:
1. The threat level
2. The red flags detected
3. Why this is dangerous
4. What the user must do immediately

Reply ONLY in STRICT JSON format:

{
  "ThreatLevel":"GREEN|YELLOW|RED",
  "RedFlags":[
    "list of red flags found in this case"
  ],
  "Why":"Explain in simple human language why this is dangerous",
  "Actions":[
    "Step 1",
    "Step 2",
    "Step 3",
    "Step 4"
  ],
  "FIR":"YES|NO"
}
`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: prompt }] }
                ]
            })
        }
    );

    const data = await res.json();

    if (!data.candidates || !data.candidates[0]) {
        throw new Error("Gemini free endpoint blocked / invalid key");
    }

    return data.candidates[0].content.parts[0].text;
}