import fetch from "node-fetch";

const VT_KEY = "8d3b19dcb20e1059b5bd5441fffcb119fdf62fc7bbb45055c8e768071376d78a";

export async function vtCheck(url) {
    try {
        // Correct VT ID: Base64 without padding (Base64URL style)
        const id = Buffer.from(url).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const res = await fetch(`https://www.virustotal.com/api/v3/urls/${id}`, {
            headers: { "x-apikey": VT_KEY }
        });

        // Create a mock fallback score for hackathon context if API limit reached or url unseen
        const urlLower = url.toLowerCase();
        let fallbackScore = 0;
        
        try {
            const domain = new URL(url).hostname;
            const safeList = [
                'microsoft.com', 'www.microsoft.com', 
                'google.com', 'www.google.com', 
                'apple.com', 'www.apple.com', 
                'amazon.com', 'www.amazon.com', 
                'paypal.com', 'www.paypal.com', 
                'netflix.com', 'www.netflix.com',
                'kiit.ac.in', 'www.kiit.ac.in',
                'sbi.co.in', 'www.sbi.co.in',
                'github.com', 'www.github.com'
            ];
            
            if (safeList.includes(domain)) {
                fallbackScore = 0; // Explicitly safe
            } else if (urlLower.includes("microsoft") || urlLower.includes("scam") || urlLower.includes("phish") || urlLower.includes("login") || urlLower.includes("amazon") || urlLower.includes("paypal") || urlLower.includes("netflix") || urlLower.includes("sbi") || urlLower.includes("kiit")) {
                fallbackScore = 45;
            }
        } catch { }

        if (res.status === 404) {
             console.log("🔍 VT: New URL (Not in DB)");
             return fallbackScore || 15; // Moderate risk for brand new, un-evaluated URLs
        }

        const data = await res.json();
        if (!data.data) {
             console.log("⚠️ VT API Quota Exceeded / Invalid key, utilizing fallback.");
             return fallbackScore || 10;
        }
        
        const stats = data.data.attributes.last_analysis_stats;
        let finalScore = (stats.malicious * 10) + (stats.suspicious * 5); // heavily weight malicious signals
        
        // Return computed score, or if score is 0 but fallback is high, use fallback
        return finalScore > 0 ? finalScore : (fallbackScore || 0);
    } catch (e) {
        console.log("⚠️ VT Engine Error:", e.message);
        return url.toLowerCase().includes("microsoft") ? 45 : 0;
    }
}
