import pandas as pd
import joblib
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import SGDClassifier
from collections import Counter

ALL_CLASSES = [
    "LEGIT",
    "OTP_FRAUD",
    "JOB_FRAUD",
    "LOAN_FRAUD",
    "ROMANCE_SCAM",
    "SEXTORTION",
    "PARCEL_SCAM",
    "UPI_FRAUD",
    "GOVT_IMPERSONATION",
    "PHISHING",
    "MALICIOUS_URL"
]

def normalize_label(lbl):
    lbl = str(lbl).upper()
    if lbl in ALL_CLASSES:
        return lbl
    if "LEGIT" in lbl or "HAM" in lbl:
        return "LEGIT"
    return "PHISHING"

print("Computing class distribution (streaming)...")

counts = Counter()

for chunk in pd.read_csv("datasets/messages.csv", chunksize=20000,
                         encoding="latin-1", on_bad_lines="skip"):
    for lbl in chunk["label"]:
        counts[normalize_label(lbl)] += 1

total = sum(counts.values())
class_weight = {c: total/(len(ALL_CLASSES)*counts.get(c,1)) for c in ALL_CLASSES}

print("Class weights:", class_weight)

print("Streaming cyber training started...")

vectorizer = HashingVectorizer(
    n_features=2**16,
    alternate_sign=False,
    ngram_range=(1,2),
    norm='l2'
)

clf = SGDClassifier(loss="log_loss", class_weight=class_weight)

first = True

for chunk in pd.read_csv("datasets/messages.csv", chunksize=10000,
                         encoding="latin-1", on_bad_lines="skip"):
    X = chunk["text"]
    y = [normalize_label(v) for v in chunk["label"]]

    Xv = vectorizer.transform(X)

    if first:
        clf.partial_fit(Xv, y, classes=ALL_CLASSES)
        first = False
    else:
        clf.partial_fit(Xv, y)

print("Training complete.")

joblib.dump(clf,"model/scam_model.pkl")
joblib.dump(vectorizer,"model/vectorizer.pkl")

print("Model saved.")
