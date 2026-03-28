import { analyzeThreat } from "./api.js";
import { renderRisk } from "./chart.js";

/* ===============================
   VOICE INPUT (Speech-to-Text)
   =============================== */
window.startVoice = function () {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    alert("Voice input not supported in this browser");
    return;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    document.getElementById("userInput").value =
      event.results[0][0].transcript;
  };

  recognition.start();
};

/* ===============================
   MAIN SCAN FUNCTION (UNCHANGED CORE)
   =============================== */
window.startScan = async function () {
    const input = document.getElementById("userInput").value;
    if (!input.trim()) return;

    // UI Toggle
    const overlay = document.getElementById("loaderOverlay");
    const timerElem = document.getElementById("scanTimer");
    const stepsElem = document.getElementById("scanSteps");
    
    overlay.classList.remove("hidden");
    stepsElem.innerHTML = "";
    
    // Timer Start
    let startTime = Date.now();
    const timerInterval = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let ms = (elapsed % 1000).toString().padStart(3, '0');
        let sec = Math.floor((elapsed / 1000) % 60).toString().padStart(2, '0');
        let min = Math.floor(elapsed / 60000).toString().padStart(2, '0');
        timerElem.innerText = `${min}:${sec}:${ms}`;
    }, 43);

    // Sequential Steps
    const steps = ["Initializing Neural Engine...", "Extracting Metadata...", "Consulting VirusTotal Database...", "Performing OSINT Correlation...", "Generating AI Risk Advisory..."];
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
        if(stepIdx < steps.length) {
            const li = document.createElement("li");
            li.className = "scan-step active";
            li.innerText = steps[stepIdx];
            const prev = stepsElem.querySelectorAll(".scan-step");
            if(prev.length > 0) prev[prev.length-1].classList.remove("active");
            stepsElem.appendChild(li);
            stepIdx++;
        }
    }, 1500);

    try {
        const r = await analyzeThreat(input);
        
        // Stop intervals
        clearInterval(timerInterval);
        clearInterval(stepInterval);
        overlay.classList.add("hidden");

        // Global state for reporting
        window.lastRisk = r.risk;
        window.lastVerdict = r.verdict;

        // Populate Sensor Cards with descriptive labels
        const mlClass = r.ml.class ? r.ml.class.toUpperCase() : "";
        document.getElementById("mlResult").innerText = (mlClass === "PHISHING" || mlClass === "MALICIOUS") ? "🔴 MALICIOUS" : "🟢 CLEAN";
        
        const vtVal = r.vt > 0 ? `🔴 MALICIOUS (${r.vt})` : "🟢 CLEAN (0)";
        document.getElementById("vtResult").innerText = vtVal;

        const osintVal = r.osint > 40 ? "🔴 HIGH RISK" : r.osint > 20 ? "🟠 SUSPICIOUS" : "🟢 SECURE";
        document.getElementById("osintResult").innerText = osintVal;

        document.getElementById("ageResult").innerText = r.age ? `🔴 NEW DOMAIN (+${r.age} Risk)` : "🟢 MATURE";
        
        const structVal = r.struct >= 30 ? "🔴 HIGH RISK" : r.struct >= 15 ? "🟠 SUSPICIOUS" : "🟢 NORMAL";
        document.getElementById("structResult").innerText = structVal;

        // Risk Score Rendering
        document.getElementById("riskText").innerText = `Threat Context Score: ${r.risk}%`;
        renderRisk(r.risk);

        // AI Advisory
        const color = r.ai.ThreatLevel === "RED" ? "#ff4444" : r.ai.ThreatLevel === "YELLOW" ? "#ffbb33" : "#00C851";
        const bg = r.ai.ThreatLevel === "RED" ? "rgba(255, 68, 68, 0.1)" : r.ai.ThreatLevel === "YELLOW" ? "rgba(255, 187, 51, 0.1)" : "rgba(0, 200, 81, 0.1)";

        document.getElementById("aiResponse").innerHTML = `
            <div style="background:${bg}; padding: 30px; border-radius: 14px; border-left: 5px solid ${color};">
                <h2 style="color:${color}; font-size: 38px; font-weight: 800; margin-bottom: 20px; font-family: var(--font-display);">${r.ai.ThreatLevel}</h2>
                <p style="font-size: 18px; line-height: 1.6; color: var(--text-primary); margin-bottom: 25px; font-family: var(--font-display);">${r.ai.Why}</p>
                <div style="margin-bottom: 25px;">
                    <h4 style="color: var(--text-muted); text-transform: uppercase; font-size: 14px; letter-spacing: 0.1em; margin-bottom: 15px;">Safety Protocol</h4>
                    <ul style="list-style: none; padding: 0;">
                        ${r.ai.Actions.map(a => `<li style="padding: 10px 15px; background: rgba(255,255,255,0.05); margin-bottom: 8px; border-radius: 8px; color: var(--text-secondary); font-size: 15px;">⚡ ${a}</li>`).join("")}
                    </ul>
                </div>
                <div style="color: ${color}; font-weight: 700; font-size: 14px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                    🚨 COMPLIANCE: ${r.ai.FIR}
                </div>
            </div>
        `;

    } catch (e) {
        clearInterval(timerInterval);
        clearInterval(stepInterval);
        overlay.classList.add("hidden");
        document.getElementById("aiResponse").innerHTML = `<p style="color:red">ERROR: Core connection lost. Ensure server.js is running.</p>`;
    }
};

/* ===============================
   TEXT TO SPEECH (AI REPORT)
   =============================== */
window.speakReport = function () {
  const report = document.getElementById("aiResponse");
  if (!report || report.innerText.trim() === "") return;

  const utterance = new SpeechSynthesisUtterance(report.innerText);
  utterance.lang = "en-IN";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}; window.reportScam = function () {
  if (!window.lastRisk) {
    alert("Analyze a message first");
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    await fetch("/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: document.getElementById("userInput").value,
        risk: window.lastRisk,
        verdict: window.lastVerdict,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        city: "Unknown",
        state: "Unknown"
      })
    });

    alert("✅ Scam reported & added to National Cyber Map");
  });
};
