function speakAdvisory() {
    const text = document.getElementById("aiResponse").innerText;
    if (!text || text === "—") return;

    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "en-IN";
    msg.rate = 0.95;

    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}
