import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

// Use a variable to track connection status for serverless efficiency
let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MONGO_URI);
        isConnected = db.connections[0].readyState === 1;
        console.log("🗄 MongoDB Atlas Connected");
    } catch (e) {
        console.log("⚠️ MongoDB Offline (Continuing without Database)");
    }
};

import express from "express";
import cors from "cors";
import { execFileSync } from "child_process";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All imports now point back to backend/
import { vtCheck } from "../backend/vt_engine.js";
import { osintCheck } from "../backend/osint_engine.js";
import { domainAge } from "../backend/domain_age.js";
import { structuralRisk } from "../backend/url_risk.js";
import { finalRisk } from "../backend/risk_engine.js";
import { aiAdvisory } from "../backend/ai_engine.js";
import Report from "../backend/models/Report.js";
import multer from "multer";
import { scanDocument } from "../backend/doc_engine.js";
import misinfoRouter from "../backend/routes/misinfo.js";

const app = express();
app.use(cors());
app.use(express.json());

// Ensure DB connection on each request (standard for Vercel/Serverless)
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Mount Misinformation Tracker
app.use("/api/misinfo", misinfoRouter);

const upload = multer({ dest: "/tmp" });

// Serve the frontend statically - Vercel handles this via vercel.json rewrites, 
// but we keep this for local compatibility if run via api/index.js
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/api-status", (_, res) => res.send("🛡️ SURAKSHA Unified AI SOC is LIVE on Vercel"));

app.post("/scan-doc", upload.single("image"), async (req, res) => {
    try {
        const r = await scanDocument(req.file.path);
        res.json({ result: r.verdict, aiText: r.aiText });
    } catch (e) {
        res.status(500).json({ error: "Document scan failed" });
    }
});

app.post("/analyze", async (req, res) => {
    const text = req.body.text;
    console.log("📥 INCOMING THREAT REPORT:", text);

    let ml = { class: "Legit", prob: 0.1 };
    // ML Logic - Python fallback is standard on Vercel
    try {
        // Only try python if not in Vercel or if explicitly configured
        if (!process.env.VERCEL) {
           ml = JSON.parse(execFileSync("python", [path.join(__dirname, "../backend/ml_engine.py"), text]));
        }
    } catch (e) {
        console.log("⚠️ Python ML Engine unavailable. Using Fallback.");
    }

    let vt = 0, osint = 0, age = 0, struct = 0;
    const match = text.match(/((https?:\/\/)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/);

    if (match) {
        let url = match[0];
        if (!url.startsWith("http")) url = "http://" + url;
        vt = await vtCheck(url);
        osint = await osintCheck(url);
        age = await domainAge(new URL(url).hostname);
        struct = structuralRisk(url);
    }

    const risk = finalRisk(ml.prob, vt, osint, age, struct);
    const verdict = risk >= 60 ? "PHISHING" : risk >= 30 ? "SUSPICIOUS" : "LEGIT";

    let ai = {};
    try {
        let raw = await aiAdvisory({ text, ml, vt, osint, age, struct, risk, verdict });
        raw = raw.replace(/```json|```/g, "").trim();
        ai = JSON.parse(raw);
    } catch (e) {
        ai = {
            ThreatLevel: risk >= 60 ? "RED" : "YELLOW",
            RedFlags: ["AI Core Unreachable"],
            Why: "Fallback verification based on risk parameters.",
            Actions: ["Verify sender", "Do not click link"],
            FIR: "NO"
        };
    }

    res.json({ ml, vt, osint, age, struct, risk, verdict, ai });
});

app.post("/report", async (req, res) => {
    try {
        await Report.create(req.body);
        res.json({ status: "saved" });
    } catch (e) {
        res.json({ status: "mock_saved", error: e.message });
    }
});

app.get("/reports", async (_, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 }).limit(50);
        res.json(reports);
    } catch (e) {
        res.json([]);
    }
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
    app.listen(PORT, () => console.log(`🚀 SOC LIVE → http://localhost:${PORT}`));
}

export default app;
