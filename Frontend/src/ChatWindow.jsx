import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { AuthContext } from "./AuthContext.jsx";
import { useContext, useState } from "react";
import { ScaleLoader } from "react-spinners";
import { apiFetch } from "./api.js";

function ChatWindow() {
    const { prompt, setPrompt, currThreadId, setPrevChats, setNewChat, setAllThreads } = useContext(MyContext);
    const { email, logout } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [useDocs, setUseDocs] = useState(false); // "answer from my documents" (RAG) switch

    // Update the last (assistant) message while the reply streams in.
    const updateLastMessage = (change) => {
        setPrevChats(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = change(copy[copy.length - 1]);
            return copy;
        });
    };

    // Re-fetch the sidebar list so a brand-new chat shows up with its title.
    const refreshThreads = async () => {
        try {
            const response = await apiFetch("/thread");
            if (!response.ok) return;
            const threads = await response.json();
            setAllThreads(threads.map(t => ({ threadId: t.threadId, title: t.title })));
        } catch (err) {
            console.log(err);
        }
    };

    const getReply = async () => {
        const message = prompt.trim();
        if (!message || loading) return;

        setError("");
        setLoading(true);
        setNewChat(false);
        setPrompt("");

        // Show the user's message now, plus an empty assistant message that tokens stream into.
        setPrevChats(prev => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);

        let receivedAnyText = false;
        try {
            const response = await apiFetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, threadId: currThreadId, useDocs })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Request failed. Please try again.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const events = buffer.split("\n\n");
                buffer = events.pop(); // keep the incomplete tail for the next chunk

                for (const event of events) {
                    if (!event.startsWith("data:")) continue;
                    const data = JSON.parse(event.slice(5));
                    if (data.error) throw new Error(data.error);
                    if (data.sources) updateLastMessage(m => ({ ...m, sources: data.sources }));
                    if (data.token) {
                        receivedAnyText = true;
                        updateLastMessage(m => ({ ...m, content: m.content + data.token }));
                    }
                }
            }
            refreshThreads();
        } catch (err) {
            console.log(err);
            setError(err.message || "Something went wrong.");
            if (!receivedAnyText) {
                // Nothing was saved on the server, so undo the optimistic messages and let the user retry.
                setPrevChats(prev => prev.slice(0, -2));
                setPrompt(message);
            }
        }
        setLoading(false);
    };

    const handleProfileClick = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span>NexChat <i className="fa-solid fa-chevron-down"></i></span>
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </div>
            </div>
            {
                isOpen &&
                <div className="dropDown">
                    <div className="dropDownItem"><i className="fa-solid fa-user"></i> {email}</div>
                    <div className="dropDownItem" onClick={logout}>
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
                    </div>
                </div>
            }
            <Chat></Chat>

            <ScaleLoader color="#fff" loading={loading}></ScaleLoader>

            {error && <p className="errorMsg">{error}</p>}

            <div className="chatInput">
                <label className="docToggle">
                    <input type="checkbox" checked={useDocs} onChange={(e) => setUseDocs(e.target.checked)} />
                    Answer from my documents
                </label>
                <div className="inputBox">
                    <input placeholder={useDocs ? "Ask about your documents" : "Ask anything"}
                        value={prompt}
                        disabled={loading}
                        maxLength={4000}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && getReply()}
                    />
                    <div id="submit" onClick={getReply}><i className="fa-solid fa-paper-plane"></i></div>
                </div>
                <p className="info">
                    NexChat can make mistakes. Check important info.
                </p>
            </div>
        </div>
    );
}

export default ChatWindow;
