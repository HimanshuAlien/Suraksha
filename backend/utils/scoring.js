export function calculateScore({ news, facts, gdelt, search }) {
    let score = 50; 
    let evidenceCount = 0;
    
    // Fact checks carry the highest weight
    if (facts && facts.matches > 0) {
        if (facts.is_debunked) score -= 40;
        else score += 30;
        evidenceCount++;
    }

    // News API (Mainstream references)
    if (news && news.articles_found > 0) {
        score += 15;
        evidenceCount++;
    }

    // GDELT (Global events consensus)
    if (gdelt && gdelt.mentions > 0) {
        score += 10;
        evidenceCount++;
    }
    
    // SERP API (General web search credibility patterns)
    if (search && search.relevance_score > 0) {
        score += search.relevance_score * 10;
    }
    
    // Normalize bounds
    score = Math.max(0, Math.min(100, score));
    
    return {
        score: Math.round(score),
        credibility: score >= 75 ? "High" : score >= 40 ? "Medium" : "Low",
        evidenceCount
    };
}
