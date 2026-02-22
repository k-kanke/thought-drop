import { useEffect, useMemo, useState } from "react";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

type Status = "FOCUS" | "RESEARCHING" | "STUCK" | "REVIEW" | "MEMO";

const COLLAPSED_WIDTH = 96;
const COLLAPSED_HEIGHT = 96;
const EXPANDED_WIDTH = 400;
const EXPANDED_HEIGHT = 340;

function App() {
  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:3001",
    [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("FOCUS");
  const [user, setUser] = useState("teamK");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resizeWindow(open: boolean) {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setSize(
        new LogicalSize(
          open ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
          open ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
        ),
      );
    } catch (error) {
      console.warn("window resize skipped", error);
    }
  }

  useEffect(() => {
    void resizeWindow(isOpen);
  }, [isOpen]);

  async function sendMemo() {
    setMessage(null);
    if (!text.trim()) {
      setMessage("本文が空です");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${apiBase}/memos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, status, user }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`API failed: ${response.status} ${body}`);
      }

      setText("");
      setMessage("Slackに送信しました");
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      setMessage(`送信失敗: ${detail}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={`app ${isOpen ? "open" : "collapsed"}`}>
      <button
        className="character"
        data-tauri-drag-region
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        🐣
      </button>

      <section className={`panel ${isOpen ? "open" : "hidden"}`}>
        <div className="drag-handle" data-tauri-drag-region title="drag" />
        <div className="row">
          <input
            value={user}
            onChange={(event) => setUser(event.currentTarget.value)}
            placeholder="user"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value as Status)}
          >
            <option value="FOCUS">FOCUS</option>
            <option value="RESEARCHING">RESEARCHING</option>
            <option value="STUCK">STUCK</option>
            <option value="REVIEW">REVIEW</option>
            <option value="MEMO">MEMO</option>
          </select>
        </div>

        <textarea
          rows={5}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder="いまの思考/詰まりをそのまま書く"
        />

        <button className="send" onClick={sendMemo} disabled={sending} type="button">
          {sending ? "Sending..." : "Send to Slack"}
        </button>

        {message ? <p className="message">{message}</p> : null}
      </section>
    </main>
  );
}

export default App;
