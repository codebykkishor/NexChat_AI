import mongoose from "mongoose";

const SourceSchema = new mongoose.Schema({
    documentName: String,
    chunkIndex: Number,
    score: Number
}, { _id: false });

const MessageSchema = new mongoose.Schema({
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    sources: { type: [SourceSchema], default: undefined }, // set when a reply used the user's documents
    timestamp: { type: Date, default: Date.now }
});

const ThreadSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    threadId: { type: String, required: true },
    title: { type: String, default: "New Chat" },
    messages: [MessageSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// A threadId only has to be unique per user.
ThreadSchema.index({ userId: 1, threadId: 1 }, { unique: true });

export default mongoose.model("Thread", ThreadSchema);
