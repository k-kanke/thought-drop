import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

type Status = "FOCUS" | "RESEARCHING" | "STUCK" | "REVIEW" | "MEMO";
const STATUSES: Status[] = ["FOCUS", "RESEARCHING", "STUCK", "REVIEW", "MEMO"];

const COLLAPSED_WIDTH = 116;
const COLLAPSED_HEIGHT = 116;
const EXPANDED_WIDTH = 460;
const EXPANDED_HEIGHT = 440;

function App() {
  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:3001",
    [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("FOCUS");
  const [statusOpen, setStatusOpen] = useState(false);
  const [user, setUser] = useState("teamK");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const statusRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!statusRef.current || !target) return;
      if (!statusRef.current.contains(target)) {
        setStatusOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleCharacterPointerDown(event: PointerEvent<HTMLButtonElement>) {
    pointerDown.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
  }

  async function handleCharacterPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!pointerDown.current || dragged.current) return;
    const dx = Math.abs(event.clientX - pointerDown.current.x);
    const dy = Math.abs(event.clientY - pointerDown.current.y);
    if (dx + dy < 6) return;

    dragged.current = true;
    try {
      await getCurrentWindow().startDragging();
    } catch (error) {
      console.warn("start dragging skipped", error);
    }
  }

  function handleCharacterPointerUp() {
    if (!dragged.current) {
      setIsOpen((current) => !current);
    }
    pointerDown.current = null;
    dragged.current = false;
  }

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
        onPointerDown={handleCharacterPointerDown}
        onPointerMove={handleCharacterPointerMove}
        onPointerUp={handleCharacterPointerUp}
        type="button"
      >
        <span className="character-face">🐣</span>
      </button>

      <section className={`panel ${isOpen ? "open" : "hidden"}`}>
        <header className="panel-header" data-tauri-drag-region>
          <div className="drag-handle" title="drag" />
          <p className="eyebrow">Thought Drop</p>
          <h1>今の思考をそのまま送る</h1>
        </header>

        <div className="field">
          <label htmlFor="user-input">ユーザー</label>
          <input
            id="user-input"
            value={user}
            onChange={(event) => setUser(event.currentTarget.value)}
            placeholder="teamK"
          />
        </div>

        <div className="field">
          <span>ステータス</span>
          <div className="status-select" ref={statusRef}>
            <button
              className="status-trigger"
              onClick={() => setStatusOpen((current) => !current)}
              type="button"
            >
              <span>{status}</span>
              <span className={`caret ${statusOpen ? "open" : ""}`}>▾</span>
            </button>
            {statusOpen ? (
              <div className="status-menu">
                {STATUSES.map((item) => (
                  <button
                    key={item}
                    className={`status-option ${status === item ? "active" : ""}`}
                    onClick={() => {
                      setStatus(item);
                      setStatusOpen(false);
                    }}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label htmlFor="memo-input">メモ</label>
        </div>
        <textarea
          id="memo-input"
          rows={5}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder="いまの思考/詰まりをそのまま書く"
        />

        <footer className="panel-footer">
          <p className="counter">{text.trim().length} chars</p>
          <button className="send" onClick={sendMemo} disabled={sending} type="button">
            {sending ? "Sending..." : "Send to Slack"}
          </button>
        </footer>

        {message ? (
          <p className={`message ${message.startsWith("送信失敗") ? "error" : "ok"}`}>{message}</p>
        ) : null}
      </section>
    </main>
  );
}

export default App;
