let chart;

export function renderRisk(score) {
    const ctx = document.getElementById("riskChart");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Risk", "Safe"],
            datasets: [{ 
                data: [score, 100 - score],
                backgroundColor: ["#e06060", "#5aaa7a"],
                borderWidth: 0
            }]
        }
    });
}
