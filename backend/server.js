import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🗄 MongoDB Atlas Connected"))
    .catch(() => console.log("⚠️ MongoDB Offline (Continuing without Database)"));

import express from "express";
import cors from "cors";
import { execFileSync } from "child_process";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { vtCheck } from "./vt_engine.js";
import { osintCheck } from "./osint_engine.js";
import { domainAge } from "./domain_age.js";
import { structuralRisk } from "./url_risk.js";
import { finalRisk } from "./risk_engine.js";
import { aiAdvisory } from "./ai_engine.js";
import Report from "./models/Report.js";
import multer from "multer";
import { scanDocument } from "./doc_engine.js";

// Import the new misinformation tracker router
import misinfoRouter from "./routes/misinfo.js";

const app = express();
app.use(cors());
app.use(express.json());

// Mount Misinformation Tracker
app.use("/api/misinfo", misinfoRouter);

const upload = multer({ dest: "uploads/" });

// Serve the frontend statically for deployment
app.use(express.static(path.join(__dirname, "../frontend")));

// Health check endpoint just in case
app.get("/api-status", (_, res) => res.send("🛡️ SURAKSHA National Cyber Defence AI API is LIVE"));

console.log("\n==============================");
console.log("🛡️ SURAKSHA SOC ENGINE ONLINE");
console.log("==============================");

/* ===============================
   DOCUMENT / AADHAAR / ID SCANNER
   =============================== */
app.post("/scan-doc", upload.single("image"), async (req, res) => {
    const r = await scanDocument(req.file.path);
    res.json({ result: r.verdict });
});

/* ===============================
   MAIN ANALYSIS ENGINE
   =============================== */
app.post("/analyze", async (req, res) => {
    const text = req.body.text;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 INCOMING THREAT REPORT:", text);

    const ml = JSON.parse(execFileSync("python", ["ml_engine.py", text]));
    console.log("🧠 ML:", ml.class, "| Prob:", ml.prob);

    let vt = 0, osint = 0, age = 0, struct = 0;
    const match = text.match(/((https?:\/\/)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/);

    if (match) {
        let url = match[0];
        if (!url.startsWith("http")) url = "http://" + url;

        console.log("🌐 URL:", url);
        vt = await vtCheck(url);
        osint = await osintCheck(url);
        age = await domainAge(new URL(url).hostname);
        struct = structuralRisk(url);

        console.log("🦠 VirusTotal:", vt);
        console.log("🌍 OSINT:", osint);
        console.log("⏳ Domain Age:", age);
        console.log("📐 Structural:", struct);
    }

    const risk = finalRisk(ml.prob, vt, osint, age, struct);
    const verdict = risk >= 60 ? "PHISHING" : risk >= 30 ? "SUSPICIOUS" : "LEGIT";

    console.log("📊 RISK SCORE:", risk);
    console.log("🚨 ENGINE VERDICT:", verdict);

    console.log("🤖 Requesting Gemini Cyber Officer...");
    let ai = {};
    try {
        let raw = await aiAdvisory({ text, ml, vt, osint, age, struct, risk, verdict });
        raw = raw.replace(/```json|```/g, "").trim();
        ai = JSON.parse(raw);
        console.log("🤖 Gemini Reasoning Delivered");
    } catch (e) {
        console.log("❌ Gemini AI Error:", e.message);
        ai = {
            ThreatLevel: risk >= 60 ? "RED" : "YELLOW",
            RedFlags: ["Could not fetch AI insights (invalid API key)"],
            Why: "Fallback evaluation based on manual risk scores.",
            Actions: ["Do not click the link", "Verify the sender"],
            FIR: "NO"
        };
    }

    if (risk >= 60) {
        console.log("🚨 HIGH RISK → Triggering n8n webhook...");
        try {
            const r = await fetch("http://localhost:5678/webhook/suraksha-alert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, risk, verdict, ai })
            });
            console.log("📡 n8n HTTP Status:", r.status);
        } catch (e) {
            console.log("❌ n8n connection failed:", e.message);
        }
    }

    res.json({ ml, vt, osint, age, struct, risk, verdict, ai });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

/* ===============================
   NATIONAL CYBER MAP
   =============================== */
app.post("/report", async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) throw new Error("DB Offline");
        await Report.create(req.body);
        res.json({ status: "saved" });
    } catch (e) {
        console.log("⚠️ DB Offline, mock-saved report:", req.body);
        res.json({ status: "mock_saved" });
    }
});

app.get("/reports", async (_, res) => {
    try {
        if (mongoose.connection.readyState !== 1) throw new Error("DB Offline");
        res.json(await Report.find().sort({ createdAt: -1 }));
    } catch (e) {
        console.log("⚠️ DB Offline, returning empty reports array");
        res.json([]);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 SOC LIVE → http://localhost:${PORT}`));