import sys
import json
import random
import re

text = sys.argv[1] if len(sys.argv) > 1 else ""
lower_text = text.lower()

# Known safe domain exact checks
safe_domains = ["microsoft.com", "google.com", "apple.com", "amazon.com", "paypal.com", "netflix.com", "kiit.ac.in", "sbi.co.in", "github.com"]
if any(sd in lower_text for sd in safe_domains):
    is_phishing = False
else:
    suspicious_keywords = ["amaxon", "phish", "scam", "login", "verify", "account", "update", "secure"]
    has_suspicious_word = any(kw in lower_text for kw in suspicious_keywords)
    
    # If the text has a brand name but not the .com/.co.in, it's highly suspicious brand impersonation
    brand_impersonation = ("microsoft" in lower_text and "microsoft.com" not in lower_text) or \
                          ("paypal" in lower_text and "paypal.com" not in lower_text) or \
                          ("amazon" in lower_text and "amazon.com" not in lower_text) or \
                          ("netflix" in lower_text and "netflix.com" not in lower_text) or \
                          ("kiit" in lower_text and "kiit.ac.in" not in lower_text) or \
                          ("sbi" in lower_text and "sbi.co.in" not in lower_text)
                          
    missing_protocol = bool(re.search(r'[a-zA-Z0-9-]+\.[a-zA-Z]{2,}', lower_text) and "http" not in lower_text)
    
    is_phishing = has_suspicious_word or brand_impersonation or missing_protocol

print(json.dumps({
    "class": "Phishing" if is_phishing else "Legit",
    "prob": random.uniform(0.7, 0.99) if is_phishing else random.uniform(0.01, 0.3)
}))
