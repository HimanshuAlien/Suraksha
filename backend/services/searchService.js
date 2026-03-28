import fetch from "node-fetch";

export async function checkSerpAPI(claim) {
    try {
        if (!process.env.SERP_API_KEY) return { relevance_score: 0.5, top_links: [] };
        
        const q = encodeURIComponent(claim);
        const res = await fetch(`https://serpapi.com/search.json?q=${q}&api_key=${process.env.SERP_API_KEY}`);
        const data = await res.json();
        
        if (!data.organic_results) return { relevance_score: 0.5, top_links: [] };
        
        return {
            relevance_score: data.organic_results.length > 5 ? 1.0 : 0.5,
            top_links: data.organic_results.slice(0, 3).map(r => r.link)
        };
    } catch (e) {
        console.error("SerpAPI Error:", e.message);
        return { relevance_score: 0.5, top_links: [] };
    }
}
