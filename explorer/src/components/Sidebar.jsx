import { useState } from "react";

const METHOD_COLORS = {
  GET: "#22c55e",
  POST: "#3b82f6",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
};

export default function Sidebar({ sections, activeId, onSelect }) {
  const [openSections, setOpenSections] = useState(() => {
    const obj = {};
    sections.forEach((s) => (obj[s.name] = true));
    return obj;
  });

  const toggleSection = (name) =>
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <nav className="sidebar">
      <div className="sidebar-header">Endpoints</div>
      {sections.map((section) => (
        <div key={section.name} className="section">
          <button
            className="section-toggle"
            onClick={() => toggleSection(section.name)}
          >
            <span className="section-arrow">{openSections[section.name] ? "▾" : "▸"}</span>
            {section.name}
            <span className="section-count">{section.endpoints.length}</span>
          </button>
          {openSections[section.name] && (
            <ul className="endpoint-list">
              {section.endpoints.map((ep) => (
                <li key={ep.id}>
                  <button
                    className={`endpoint-item ${activeId === ep.id ? "active" : ""}`}
                    onClick={() => onSelect(ep)}
                  >
                    <span
                      className="method-badge"
                      style={{ color: METHOD_COLORS[ep.method] }}
                    >
                      {ep.method}
                    </span>
                    <span className="endpoint-path">{ep.path}</span>
                    {ep.auth && <span className="auth-dot" title="Auth required">🔒</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
