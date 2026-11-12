import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    chunkCount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Document", DocumentSchema);
