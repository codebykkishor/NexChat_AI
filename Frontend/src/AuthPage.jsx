import "./AuthPage.css";
import { useContext, useState } from "react";
import { AuthContext } from "./AuthContext.jsx";

function AuthPage() {
    const { authenticate } = useContext(AuthContext);
    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await authenticate(mode, email, password);
        } catch (err) {
            setError(err.message);
        }
        setBusy(false);
    };

    const isLogin = mode === "login";

    return (
        <div className="authPage">
            <form className="authCard" onSubmit={submit}>
                <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
                <p className="authSub">NexChat</p>

                <input
                    type="email" placeholder="Email" value={email} required autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password" placeholder="Password (min 8 characters)" value={password} required
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p className="authError">{error}</p>}

                <button type="submit" className="authButton" disabled={busy}>
                    {busy ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
                </button>

                <p className="authSwitch">
                    {isLogin ? "New here?" : "Already have an account?"}{" "}
                    <span onClick={() => { setMode(isLogin ? "register" : "login"); setError(""); }}>
                        {isLogin ? "Create an account" : "Log in"}
                    </span>
                </p>
            </form>
        </div>
    );
}

export default AuthPage;
