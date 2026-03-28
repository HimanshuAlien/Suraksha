let currentSessionId = null;
let isWaiting = false;
let attachedImageBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    const fileUpload = document.getElementById("fileUpload");
    const attachBtn = document.getElementById("attachBtn");
    const micBtn = document.getElementById("micBtn");
    const removeImageBtn = document.getElementById("removeImageBtn");

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    sendBtn.addEventListener("click", handleUserInput);

    // Image Upload Logic
    if(attachBtn) attachBtn.addEventListener("click", () => fileUpload.click());
    
    if(fileUpload) fileUpload.addEventListener("change", function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                attachedImageBase64 = e.target.result;
                document.getElementById("imagePreview").src = attachedImageBase64;
                document.getElementById("imagePreviewContainer").style.display = "inline-block";
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    if(removeImageBtn) removeImageBtn.addEventListener("click", () => {
        attachedImageBase64 = null;
        document.getElementById("imagePreviewContainer").style.display = "none";
        fileUpload.value = "";
    });

    // Voice Mic Logic (Web Speech API)
    if (micBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            micBtn.style.color = "var(--primary)";
            chatInput.placeholder = "Listening...";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value += (chatInput.value ? " " : "") + transcript;
            chatInput.dispatchEvent(new Event('input')); // trigger resize
        };

        recognition.onend = () => {
            micBtn.style.color = "var(--text-secondary)";
            chatInput.placeholder = "Paste a claim, drop an image, or ask a follow-up...";
        };

        micBtn.addEventListener("click", () => {
            recognition.start();
        });
    } else if(micBtn) {
        micBtn.style.display = "none"; // Hide if unsupported
    }
});

async function handleUserInput() {
    if (isWaiting) return;
    
    const inputElem = document.getElementById("chatInput");
    let message = inputElem.value.trim();
    
    if (!message && !attachedImageBase64) return;
    if (!message) message = "[Image Attached]";

    // Build chat log visually inclusive of the image
    let msgContent = message;
    if (attachedImageBase64) {
        msgContent = `<img src="${attachedImageBase64}" style="max-height: 120px; border-radius: 8px; margin-bottom: 8px; display: block;" />` + message;
    }

    inputElem.value = "";
    inputElem.style.height = "auto";
    appendMessage("user", msgContent);

    // Reset Image UI
    attachedImageBase64 = null;
    document.getElementById("imagePreviewContainer").style.display = "none";
    document.getElementById("fileUpload").value = "";

    if (!currentSessionId) {
        await runAnalysis(message);
    } else {
        await runChat(message);
    }
}

function appendMessage(role, text) {
    const chatHistory = document.getElementById("chatHistory");
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}-message fade-in`;

    const avatar = document.createElement("div");
    avatar.className = `avatar ${role}-avatar`;
    if (role === "user") {
        avatar.innerText = "👤";
    } else {
        avatar.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fill-opacity="0.2"/>
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="7" r="2" fill="currentColor"></circle>
            </svg>`;
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = text;

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatHistory.appendChild(wrapper);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return bubble;
}

async function runAnalysis(claim) {
    isWaiting = true;
    document.getElementById("sendBtn").disabled = true;
    
    // UI Panel Setup
    document.getElementById("emptyState").style.display = "none";
    document.getElementById("resultsState").style.display = "none";
    document.getElementById("loadingState").style.display = "block";
    
    // Timer Logic
    const timerElem = document.getElementById("verifyTimer");
    let startTime = Date.now();
    const timerInterval = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let ms = (elapsed % 1000).toString().padStart(3, '0');
        let sec = Math.floor((elapsed / 1000) % 60).toString().padStart(2, '0');
        let min = Math.floor(elapsed / 60000).toString().padStart(2, '0');
        timerElem.innerText = `${min}:${sec}:${ms}`;
    }, 43);

    const loadingList = document.getElementById("loadingSteps");
    loadingList.innerHTML = "";
    
    const steps = [
        "Extracting claim...",
        "Searching news databases...",
        "Checking fact databases...",
        "Evaluating credibility...",
        "Generating explanation..."
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
        if (stepIndex < steps.length) {
            const li = document.createElement("li");
            li.className = "loading-step active";
            li.innerText = steps[stepIndex];
            
            // disable previous
            const prev = loadingList.querySelectorAll(".loading-step");
            if(prev.length > 0) prev[prev.length-1].classList.remove("active");
            
            loadingList.appendChild(li);
            stepIndex++;
        }
    }, 1800);

    // Temp typing bubble
    const replyBubble = appendMessage("ai", '<span style="opacity:0.5">Initializing Analysis Core...</span>');

    try {
        const res = await fetch("/api/misinfo/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: claim })
        });
        
        const data = await res.json();
        clearInterval(interval);
        clearInterval(timerInterval); // Stop timer on success
        
        if (data.error) throw new Error(data.error);

        // Update Chat
        replyBubble.innerHTML = "Analysis complete. I've updated the intelligence dashboard. You can ask me follow-up questions about this claim.";
        currentSessionId = data.sessionId;

        // Populate Dashboard
        populateDashboard(data);

    } catch (e) {
        clearInterval(interval);
        clearInterval(timerInterval); // Stop timer on fail
        replyBubble.innerHTML = "Analysis failed: " + e.message;
        document.getElementById("loadingState").style.display = "none";
        document.getElementById("emptyState").style.display = "flex";
    }

    isWaiting = false;
    document.getElementById("sendBtn").disabled = false;
    document.getElementById("chatInput").placeholder = "Ask a follow-up question...";
}

function populateDashboard(data) {
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("resultsState").style.display = "block";

    // Verdict
    const verdictH1 = document.getElementById("finalVerdict");
    verdictH1.innerText = data.verdict;
    let vColor = "var(--warn)";
    if (data.score >= 70) vColor = "var(--safe)";
    else if (data.score <= 35) vColor = "var(--danger)";
    verdictH1.style.color = vColor;

    document.getElementById("claimBreakdown").innerText = `Claim: "${data.claim}"`;

    // Explanation
    document.getElementById("explanationText").innerText = data.explanation;

    // Findings
    document.getElementById("findingsList").innerHTML = data.findings.map(f => `<li>${f}</li>`).join("");

    // Sources
    const sourcesGrid = document.getElementById("sourcesGrid");
    if (data.sources && data.sources.length > 0) {
        sourcesGrid.innerHTML = data.sources.map(s => {
            if (typeof s === "string") {
                return `
                <a href="${s}" target="_blank" class="source-card">
                  <div class="source-card-title">${new URL(s).hostname.replace('www.', '')}</div>
                  <div class="source-card-meta">
                     <span>Web Search Result</span>
                  </div>
                </a>`;
            } else {
                return `
                <div class="source-card">
                  <div class="source-card-title">${s.publisher}</div>
                  <div class="source-card-meta">
                     <span>Fact Check Rating: <strong style="color:var(--text-primary)">${s.rating.toUpperCase()}</strong></span>
                  </div>
                </div>`;
            }
        }).join("");
    } else {
        sourcesGrid.innerHTML = "<p style='color:var(--text-secondary); font-size:14px;'>No external sources found.</p>";
    }

    // Animate Score
    animateScore(data.score, vColor);
}

function animateScore(targetScore, color) {
    let current = 0;
    const valueEl = document.getElementById("scoreValue");
    const circle = document.getElementById("scoreCircle");
    
    const scoreInterval = setInterval(() => {
        current += 2;
        if (current >= targetScore) {
            current = targetScore;
            clearInterval(scoreInterval);
        }
        valueEl.innerText = current;
        
        const deg = (current / 100) * 360;
        circle.style.background = `conic-gradient(${color} ${deg}deg, var(--bg-elevated) 0deg)`;
    }, 20);
}

async function runChat(msg) {
    isWaiting = true;
    document.getElementById("sendBtn").disabled = true;
    
    const replyBubble = appendMessage("ai", '<span style="opacity:0.5">Typing...</span>');

    try {
        const res = await fetch("/api/misinfo/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: currentSessionId, message: msg })
        });
        
        const data = await res.json();
        replyBubble.innerHTML = data.error || data.reply.replace(/\n/g, '<br>');
    } catch (e) {
        replyBubble.innerHTML = "Network connection failed.";
    }

    isWaiting = false;
    document.getElementById("sendBtn").disabled = false;
}
