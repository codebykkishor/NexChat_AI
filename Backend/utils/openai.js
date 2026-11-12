import { createSSEParser } from "./sse.js";
import { fetchWithRetry, OpenAIError } from "./http.js";

export { OpenAIError };

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const API_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1") + "/chat/completions";

/**
 * Streams a chat completion. Calls onToken(text) for every piece of the reply
 * and resolves with the full reply text.
 */
export async function streamChatCompletion(messages, onToken, signal) {
    const response = await fetchWithRetry(API_URL, {
        method: "POST",
        signal,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ model: MODEL, messages, stream: true })
    });

    let full = "";
    const parser = createSSEParser(data => {
        if (data === "[DONE]") return;
        try {
            const token = JSON.parse(data).choices?.[0]?.delta?.content;
            if (token) { full += token; onToken(token); }
        } catch { /* ignore malformed keep-alive lines */ }
    });

    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
        parser.push(decoder.decode(chunk, { stream: true }));
    }
    parser.flush();
    return full;
}
