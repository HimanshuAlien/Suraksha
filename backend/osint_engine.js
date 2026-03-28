import dns from "dns/promises";
import { URL } from "url";

const BRANDS = ["amazon", "paytm", "sbi", "irctc", "google", "microsoft", "whatsapp", "flipkart", "uidai", "gov"];

export async function osintCheck(raw) {
    let score = 0;
    let host;

    try { host = new URL(raw).hostname.toLowerCase(); } catch { return 0; }

    // Typosquatting / brand impersonation
    for (const b of BRANDS) {
        if (host.includes(b) && !host.endsWith(`${b}.com`) && !host.endsWith(`${b}.in`) && !host.endsWith(`${b}.co.in`)) {
            score += 35;
        }
    }

    // Suspicious keywords
    if (/secure|login|verify|update|reward|free|refund|kyc|winner|claim|alert/.test(host))
        score += 20;

    // DNS resolution reputation
    try {
        const rec = await dns.resolve(host);
        if (rec && rec.length > 0) score += 5;
    } catch {
        score += 15; // no DNS = shady
    }

    // Long / obfuscated domains
    if (host.length > 28) score += 10;
    if ((host.match(/-/g) || []).length > 2) score += 10;
    if (/\d/.test(host)) score += 10;

    return Math.min(score, 100);
}
