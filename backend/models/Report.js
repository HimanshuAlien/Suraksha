import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  text: String,
  risk: Number,
  verdict: String,
  lat: Number,
  lng: Number,
  city: String,
  state: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Report", ReportSchema);
