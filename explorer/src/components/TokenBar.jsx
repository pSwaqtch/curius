export default function TokenBar({ token, onChange }) {
  return (
    <header className="token-bar">
      <span className="token-label">JWT Token</span>
      <input
        className="token-input"
        type="password"
        placeholder="Paste your Bearer token here (stored in localStorage)"
        value={token}
        onChange={(e) => onChange(e.target.value)}
      />
      {token && <span className="token-badge">✓ Set</span>}
    </header>
  );
}
