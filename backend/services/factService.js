import fetch from "node-fetch";

export async function checkGoogleFactCheck(claim) {
    try {
        if (!process.env.GOOGLE_FACT_API_KEY) return { matches: 0, is_debunked: false, reviews: [] };
        
        const q = encodeURIComponent(claim);
        const res = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${q}&key=${process.env.GOOGLE_FACT_API_KEY}`);
        const data = await res.json();
        
        if (!data.claims || data.claims.length === 0) {
            return { matches: 0, is_debunked: false, reviews: [] };
        }
        
        let is_debunked = false;
        const reviews = [];
        
        data.claims.slice(0, 3).forEach(c => {
            if (c.claimReview && c.claimReview.length > 0) {
                const rating = c.claimReview[0].textualRating ? c.claimReview[0].textualRating.toLowerCase() : "";
                reviews.push({
                    publisher: c.claimReview[0].publisher.name,
                    rating: rating
                });
                if (rating.includes("false") || rating.includes("pants on fire") || rating.includes("fake")) {
                    is_debunked = true;
                }
            }
        });
        
        return {
            matches: data.claims.length,
            is_debunked,
            reviews
        };
    } catch (e) {
        console.error("FactCheck API Error:", e.message);
        return { matches: 0, is_debunked: false, reviews: [] };
    }
}
