import { useState } from "react";

const STATUS_COLOR = (status) => {
  if (!status) return "#888";
  if (status < 300) return "#22c55e";
  if (status < 400) return "#f59e0b";
  return "#ef4444";
};

export default function ResponsePane({ response, loading }) {
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="response-pane">
        <div className="response-loading">
          <div className="spinner" />
          Waiting for response…
        </div>
      </div>
    );
  }

  if (!response) return null;

  const { status, statusText, data, elapsed, url } = response;
  const json = typeof data === "object" ? JSON.stringify(data, null, 2) : data;

  const handleCopy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="response-pane">
      <div className="response-meta">
        <span className="response-status" style={{ color: STATUS_COLOR(status) }}>
          {status} {statusText}
        </span>
        <span className="response-time">{elapsed}ms</span>
        <span className="response-url" title={url}>{url}</span>
        <button className="copy-btn" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
      </div>
      <pre className="response-body">{json}</pre>
    </div>
  );
}
