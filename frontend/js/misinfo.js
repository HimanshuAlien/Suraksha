let currentSessionId = null;

export async function analyzeMisinfo() {
    const input = document.getElementById("userInput").value;
    if (!input) {
        alert("Please enter a claim to analyze.");
        return;
    }

    const btn = document.getElementById("misinfoBtn");
    const container = document.querySelector(".misinfo-container");
    const loadingElem = document.getElementById("misinfoLoading");
    
    // UI Reset
    btn.disabled = true;
    btn.innerText = "Analyzing...";
    container.style.display = "block";
    
    // Clear previous
    document.getElementById("misinfoVerdict").innerText = "—";
    document.getElementById("misinfoScore").innerText = "0";
    document.getElementById("misinfoFindings").innerHTML = "";
    document.getElementById("misinfoSources").innerHTML = "";
    document.getElementById("misinfoExplanation").innerText = "";
    document.getElementById("misinfoChatLog").innerHTML = "";
    document.getElementById("misinfoChatInput").disabled = true;
    document.getElementById("misinfoChatBtn").disabled = true;
    currentSessionId = null;

    // Loading steps
    loadingElem.style.display = "block";
    const steps = [
        "Extracting claim...",
        "Searching news databases...",
        "Checking global fact databases (GDELT, Google Fact Check)...",
        "Evaluating credibility patterns...",
        "Synthesizing explanation..."
    ];
    
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
            loadingElem.innerText = steps[stepIndex];
            stepIndex++;
        }
    }, 1200);

    try {
        const res = await fetch("/api/misinfo/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input })
        });
        
        const data = await res.json();
        clearInterval(stepInterval);
        loadingElem.style.display = "none";
        
        if (data.error) {
            alert(data.error);
            btn.disabled = false;
            btn.innerText = "Track Misinfo";
            return;
        }

        // Render data
        document.getElementById("misinfoVerdict").innerText = data.verdict;
        let color = data.score >= 70 ? "var(--safe)" : (data.score <= 35 ? "var(--danger)" : "var(--warn)");
        document.getElementById("misinfoVerdict").style.color = color;
        
        // Animated score
        let currentScore = 0;
        const scoreInterval = setInterval(() => {
            currentScore += 3;
            if (currentScore >= data.score) {
                currentScore = data.score;
                clearInterval(scoreInterval);
            }
            document.getElementById("misinfoScore").innerText = currentScore;
        }, 30);

        document.getElementById("misinfoFindings").innerHTML = data.findings.map(f => `<li>${f}</li>`).join("");
        
        if (data.sources && data.sources.length > 0) {
            document.getElementById("misinfoSources").innerHTML = data.sources.map(s => {
                const text = typeof s === 'string' ? `<a href="${s}" target="_blank" style="color:var(--text-secondary)">${s}</a>` : `${s.publisher}: ${s.rating}`;
                return `<li>${text}</li>`;
            }).join("");
        } else {
            document.getElementById("misinfoSources").innerHTML = "<li>No direct sources found.</li>";
        }
        
        document.getElementById("misinfoExplanation").innerText = data.explanation;

        // Enable chat setup
        currentSessionId = data.sessionId;
        document.getElementById("misinfoChatInput").disabled = false;
        document.getElementById("misinfoChatBtn").disabled = false;
        
        const log = document.getElementById("misinfoChatLog");
        log.innerHTML = `<div style="color:var(--text-secondary); margin-bottom:10px;"><strong>AI:</strong> Analysis complete! Feel free to ask me follow-up questions about this claim.</div>`;
    } catch (e) {
        clearInterval(stepInterval);
        loadingElem.style.display = "none";
        alert("Misinformation analysis failed.");
    }

    btn.disabled = false;
    btn.innerText = "Track Misinfo";
}

export async function sendMisinfoChat() {
    if (!currentSessionId) return;

    const inputElem = document.getElementById("misinfoChatInput");
    const message = inputElem.value.trim();
    if (!message) return;

    const log = document.getElementById("misinfoChatLog");
    const userMsg = document.createElement("div");
    userMsg.style.cssText = "color:var(--text-primary); margin-bottom:10px; text-align:right;";
    userMsg.innerHTML = `<strong>You:</strong> ${message}`;
    log.appendChild(userMsg);
    
    inputElem.value = "";
    
    const botMsg = document.createElement("div");
    botMsg.style.cssText = "color:var(--text-secondary); margin-bottom:10px;";
    botMsg.innerHTML = `<strong>AI:</strong> <span class="typing">...</span>`;
    log.appendChild(botMsg);
    log.scrollTop = log.scrollHeight;

    try {
        const res = await fetch("/api/misinfo/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: currentSessionId, message })
        });
        
        const data = await res.json();
        
        if (data.error) {
            botMsg.innerHTML = `<strong style="color:var(--danger)">Error:</strong> ${data.error}`;
        } else {
            botMsg.innerHTML = `<strong>AI:</strong> ${data.reply}`;
        }
    } catch (e) {
        botMsg.innerHTML = `<strong style="color:var(--danger)">AI:</strong> Connection failed.`;
    }
    log.scrollTop = log.scrollHeight;
}

// Bind to window to allow HTML inline handlers without breaking modules
window.analyzeMisinfo = analyzeMisinfo;
window.sendMisinfoChat = sendMisinfoChat;
