import "./Chat.css";
import { useContext, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function Chat() {
    const { newChat, prevChats } = useContext(MyContext);
    const bottomRef = useRef(null);

    // Keep the newest text in view while the reply streams in.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, [prevChats]);

    return (
        <>
            {newChat && <h1>Start a New Chat!</h1>}
            <div className="chats">
                {
                    prevChats.map((chat, idx) =>
                        <div className={chat.role === "user" ? "userDiv" : "gptDiv"} key={idx}>
                            {
                                chat.role === "user" ?
                                    <p className="userMessage">{chat.content}</p> :
                                    <>
                                        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{chat.content}</ReactMarkdown>
                                        {chat.sources?.length > 0 && (
                                            <p className="sources">
                                                Sources: {[...new Set(chat.sources.map(s => s.documentName))].join(", ")}
                                            </p>
                                        )}
                                    </>
                            }
                        </div>
                    )
                }
                <div ref={bottomRef}></div>
            </div>
        </>
    );
}

export default Chat;
