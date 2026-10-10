import React, { useEffect, useId, useState } from "react";
import Link from "@docusaurus/Link";
import {
  feedbackAvailable, hasFeedbackToday, ratings, reasons, statisticsDisabled,
  submitFeedback, type Rating, type Reason,
} from "../../analytics";
import styles from "./styles.module.css";

export default function ArticleFeedback({ path, title }: { path: string; title: string }) {
  const id = useId();
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState<Rating>();
  const [reason, setReason] = useState<Reason | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReady(true);
    const update = () => setDone(hasFeedbackToday(path));
    update();
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
    };
  }, [path]);

  async function send(value: Rating) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await submitFeedback(path, title, value, reason || undefined);
      if (result === "accepted" || result === "duplicate") {
        setDone(true);
      } else {
        setError(result === "storage-error"
          ? "浏览器无法保存反馈状态，请检查存储设置后重试。"
          : "暂时无法提交反馈，请检查网络或稍后重试。");
      }
    } catch {
      setError("暂时无法提交反馈，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.title}>这篇内容对你有帮助吗？</h2>
      {!ready ? <p>正在加载反馈设置…</p> : statisticsDisabled() ? (
        <p>统计已关闭，文章反馈也已停用。可在<Link to="/privacy">统计设置</Link>中重新开启。</p>
      ) : !feedbackAvailable() ? (
        <p>文章反馈暂未启用。</p>
      ) : done ? (
        <p role="status">感谢反馈！今天已记录你的选择。</p>
      ) : (
        <>
          <div className={styles.options} role="group" aria-label="帮助程度">
            {(Object.entries(ratings) as [Rating, string][]).map(([value, label]) => (
              <button
                key={value} type="button" className="button button--outline button--primary button--sm"
                aria-pressed={rating === value} disabled={busy}
                onClick={() => {
                  setRating(value);
                  setError("");
                  if (value === "helpful") void send(value);
                }}
              >{label}</button>
            ))}
          </div>
          {rating && rating !== "helpful" && (
            <form onSubmit={(event) => { event.preventDefault(); void send(rating); }}>
              <label htmlFor={`${id}-reason`}>主要原因（可选）</label>
              <select id={`${id}-reason`} value={reason} disabled={busy}
                onChange={(event) => setReason(event.target.value as Reason | "")}>
                <option value="">不选择原因</option>
                {Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button type="submit" disabled={busy} className="button button--primary button--sm">
                {busy ? "正在提交…" : "提交反馈"}
              </button>
            </form>
          )}
          {error && <p role="alert">{error}</p>}
          <small>每篇每天可反馈一次。<Link to="/privacy">统计说明与设置</Link></small>
        </>
      )}
    </section>
  );
}
