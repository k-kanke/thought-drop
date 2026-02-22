import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

type Status = "集中" | "調査中" | "詰まり" | "レビュー待ち";
const STATUSES: Status[] = ["集中", "調査中", "詰まり", "レビュー待ち"];

const COLLAPSED_WIDTH = 132;
const COLLAPSED_HEIGHT = 132;
const OPEN_MIN_WIDTH = 460;
const OPEN_MIN_HEIGHT = 440;
const OPEN_PADDING = 10;
const ICON_SIZE = 74;
const ICON_PANEL_GAP = 12;

function App() {
  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:3001",
    [],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("集中");
  const [statusOpen, setStatusOpen] = useState(false);
  const [user, setUser] = useState("teamK");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  async function resizeWindow() {
    try {
      const appWindow = getCurrentWindow();
      if (!isOpen) {
        await appWindow.setSize(new LogicalSize(COLLAPSED_WIDTH, COLLAPSED_HEIGHT));
        return;
      }

      const panelRect = panelRef.current?.getBoundingClientRect();
      const panelWidth = panelRect ? Math.ceil(panelRect.width) : 344;
      const panelHeight = panelRef.current ? Math.ceil(panelRef.current.scrollHeight) : 400;

      const width = Math.max(
        OPEN_MIN_WIDTH,
        panelWidth + ICON_SIZE + ICON_PANEL_GAP + OPEN_PADDING * 2,
      );
      const height = Math.max(OPEN_MIN_HEIGHT, Math.max(panelHeight, ICON_SIZE) + OPEN_PADDING * 2);

      await appWindow.setSize(new LogicalSize(width, height));
    } catch (error) {
      console.warn("window resize skipped", error);
    }
  }

  useEffect(() => {
    void resizeWindow();
  }, [isOpen, statusOpen, message, text.length, sending]);

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
      const response = await fetch(`${apiBase}/api/memo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: text.trim(),
          status,
          user: user.trim(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`API failed: ${response.status} ${body}`);
      }

      const result = (await response.json().catch(() => ({}))) as { message?: string };
      setText("");
      if (response.status === 207) {
        setMessage("メモは保存しましたが、Slack送信に失敗しました");
      } else {
        setMessage(result.message ?? "Slackに送信しました");
      }
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

      <section className={`panel ${isOpen ? "open" : "hidden"}`} ref={panelRef}>
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
