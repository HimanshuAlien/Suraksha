export function structuralRisk(url) {
    let r = 0;
    try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.toLowerCase();
        
        // Complex structural signals
        if (host.split('.').length > 3) r += 15; // Excessive subdomains (phish-style)
        if (host.length > 30) r += 10;
        if ((host.match(/\d/g) || []).length > 4) r += 10; // Many numbers in domain
        if ((host.match(/-/g) || []).length > 2) r += 10; // Many hyphens
        
        // Obvious IP usage
        if (/^[0-9.]+$/.test(host)) r += 25;
        
        // Check for homoglyphs or mixed case tricks in original URL
        // A user submitting a domain like 'microsOft.com' is suspicious
        const originalInput = url.replace(/^https?:\/\//, '').split('/')[0];
        if (/[A-Z]/.test(originalInput) && /[a-z]/.test(originalInput)) {
            r += 30; // Mixed casing in domain name
        }

        // Commonly abused TLDs
        const suspiciousTlds = ['.xyz', '.top', '.pw', '.cc', '.club', '.online'];
        if (suspiciousTlds.some(tld => host.endsWith(tld))) r += 20;

        // Impersonation mock checks
        const brands = ['microsoft', 'apple', 'google', 'amazon', 'facebook', 'netflix', 'paypal', 'bank'];
        for (let brand of brands) {
            // Checks if it contains brand but isn't strictly starting with it followed by valid TLD, or is a typo
            if (host.includes(brand) && host !== `${brand}.com` && host !== `www.${brand}.com`) {
                r += 35; // Deep brand impersonation risk
            }
        }
        
        return Math.min(100, r);
    } catch {
        return 0;
    }
}
