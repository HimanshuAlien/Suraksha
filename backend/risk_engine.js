export function finalRisk(ml, vt, osint, age, struct) {

    // Convert ML probability to 0–100
    ml = ml * 100;

    // Human-impact weighted fusion
    const risk =
        (ml * 0.35) +
        (vt * 6) +
        (osint * 1.8) +
        (age * 2) +
        (struct * 2);

    return Math.min(100, Math.round(risk));
}
