function startThreatLoading() {
    document.querySelectorAll(".loader").forEach(l => {
        l.style.display = "inline-block";
    });
}

function stopThreatLoading() {
    document.querySelectorAll(".loader").forEach(l => {
        l.style.display = "none";
    });
}
