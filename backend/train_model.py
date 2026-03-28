import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

df1 = pd.read_csv("datasets/uci_sms_spam.csv")     # real sms scams
df2 = pd.read_csv("datasets/phishing_urls.csv")    # phishing urls
df3 = pd.read_csv("datasets/openphish_dump.csv")
df4 = pd.read_csv("datasets/romance_scams.csv")

data = pd.concat([df1,df2,df3,df4])
X = data["text"]
y = data["label"]

vec = TfidfVectorizer(ngram_range=(1,2), max_features=5000)
Xv = vec.fit_transform(X)

Xtr,Xte,ytr,yte = train_test_split(Xv,y,test_size=0.2)

model = LogisticRegression(max_iter=2000)
model.fit(Xtr,ytr)

joblib.dump(model,"model/scam_model.pkl")
joblib.dump(vec,"model/vectorizer.pkl")

print("Model trained on REAL cybercrime corpora.")
