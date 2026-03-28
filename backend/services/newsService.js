import fetch from "node-fetch";

export async function checkNewsAPI(claim) {
    try {
        if (!process.env.NEWS_API_KEY) return { articles_found: 0, sources: [] };
        
        const q = encodeURIComponent(claim.substring(0, 100)); // Limit query length
        const res = await fetch(`https://newsapi.org/v2/everything?q=${q}&sortBy=relevancy&apiKey=${process.env.NEWS_API_KEY}`, {
            headers: { "User-Agent": "Suraksha Misinfo Tracker/1.0 (Node.js)" }
        });
        const data = await res.json();
        
        if (data.status !== "ok" || !data.articles) return { articles_found: 0, sources: [] };
        
        const topSources = data.articles.slice(0, 3).map(a => a.source.name);
        return {
            articles_found: data.totalResults || 0,
            sources: topSources
        };
    } catch (e) {
        console.error("NewsAPI Error:", e.message);
        return { articles_found: 0, sources: [] };
    }
}
