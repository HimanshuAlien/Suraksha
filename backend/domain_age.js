import whois from "whois-json";

export async function domainAge(domain) {
    try {
        const w = await whois(domain);
        if (!w || !w.creationDate) return 10;

        const ageDays = (Date.now() - new Date(w.creationDate)) / 86400000;
        return ageDays < 180 ? 10 : 0;
    } catch {
        return 10;   // unknown domains are treated as risky but never crash
    }
}
