import mongoose from "mongoose";

// One searchable piece of a document, stored with its embedding vector.
const ChunkSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    index: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true, select: false } // large, so only loaded when asked for
});

export default mongoose.model("Chunk", ChunkSchema);
