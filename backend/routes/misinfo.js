import express from "express";
import { checkNewsAPI } from "../services/newsService.js";
import { checkGoogleFactCheck } from "../services/factService.js";
import { checkSerpAPI } from "../services/searchService.js";
import { checkGDELT } from "../services/gdeltService.js";
import { getGeminiMisinfoSummary, getGeminiChatResponse } from "../services/aiService.js";
import { calculateScore } from "../utils/scoring.js";

const router = express.Router();

// Basic in-memory store for session-based chat history for this MVP
const chatSessions = new Map();

router.post("/analyze", async (req, res) => {
    try {
        const { input } = req.body;
        if (!input) return res.status(400).json({ error: "No input provided" });

        // Extract claim (for simplicity, we grab the first 100 chars or just use the input if it's text)
        // If it was a URL we might scrape it, but for this MVP let's assume text claims or short URLs.
        const claim = input.trim();

        // Run data fetching parallel
        const [news, facts, gdelt, search] = await Promise.all([
            checkNewsAPI(claim),
            checkGoogleFactCheck(claim),
            checkGDELT(claim),
            checkSerpAPI(claim)
        ]);

        const gatheredData = { news, facts, gdelt, search };

        // Score
        const scoreData = calculateScore(gatheredData);

        // Map score to a final verdict string
        let verdict = "Inconclusive / Mixed";
        if (scoreData.score >= 70) verdict = "Likely True / Confirmed";
        else if (scoreData.score <= 35) verdict = "Likely False / Debunked";

        // Generate final explanation via AI
        const aiSummary = await getGeminiMisinfoSummary(claim, gatheredData, scoreData);

        const responsePayload = {
            claim,
            score: scoreData.score,
            verdict,
            findings: aiSummary.findings || [],
            sources: [...facts.reviews, ...search.top_links],
            explanation: aiSummary.explanation || "No advanced explanation generated.",
            sessionId: Date.now().toString()
        };

        // Initialize chat history memory for follow-ups
        chatSessions.set(responsePayload.sessionId, {
            claim,
            history: []
        });

        res.json(responsePayload);
    } catch (e) {
        console.error("Misinfo Analyze Route Error:", e);
        res.status(500).json({ error: "Analysis process failed." });
    }
});


router.post("/chat", async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        
        if (!sessionId || !chatSessions.has(sessionId)) {
            return res.status(404).json({ error: "Session not found or expired. Please analyze again." });
        }
        
        if (!message) return res.status(400).json({ error: "Message is required." });

        const session = chatSessions.get(sessionId);
        
        session.history.push({ role: "user", parts: [{ text: message }] });

        const aiResponse = await getGeminiChatResponse(session.history, session.claim);

        session.history.push({ role: "model", parts: [{ text: aiResponse }] });

        res.json({ reply: aiResponse });
    } catch (e) {
        console.error("Misinfo Chat Route Error:", e);
        res.status(500).json({ error: "Failed to process chat message." });
    }
});

export default router;
