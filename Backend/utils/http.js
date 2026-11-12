export class OpenAIError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * fetch() that retries on 429 / 5xx with exponential backoff.
 * Returns the Response when it is ok, otherwise throws OpenAIError.
 */
export async function fetchWithRetry(url, options, { maxRetries = 2, baseDelayMs = 500 } = {}) {
    let attempt = 0;
    while (true) {
        const response = await fetch(url, options);
        if (response.ok) return response;

        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < maxRetries) {
            attempt++;
            await sleep(baseDelayMs * 2 ** attempt);
            continue;
        }
        let detail = "";
        try { detail = (await response.json())?.error?.message || ""; } catch { /* ignore */ }
        throw new OpenAIError(detail || `OpenAI request failed (${response.status})`, response.status);
    }
}
