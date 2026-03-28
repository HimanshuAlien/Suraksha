import fetch from "node-fetch";

// GDELT project requires no API key. We use their Doc API.
export async function checkGDELT(claim) {
    try {
        const keywords = claim.split(" ").slice(0, 3).join(" ");
        if (!keywords) return { mentions: 0 };
        
        const q = encodeURIComponent(keywords);
        const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=ArtList&format=json`);
        const data = await res.json();
        
        if (!data || !data.articles) return { mentions: 0 };
        
        return { mentions: data.articles.length };
    } catch (e) {
        // GDELT might fail or timeout, silently catch
        return { mentions: 0 };
    }
}
