import { useState, useEffect } from "react";

const METHOD_COLORS = {
  GET: "#22c55e",
  POST: "#3b82f6",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
};

export default function RequestForm({ endpoint, onSubmit, loading }) {
  const [values, setValues] = useState({});

  // Reset form when endpoint changes
  useEffect(() => {
    setValues({});
  }, [endpoint.id]);

  const handleChange = (name, val) =>
    setValues((prev) => ({ ...prev, [name]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="request-form">
      <div className="request-header">
        <span
          className="method-tag"
          style={{ background: METHOD_COLORS[endpoint.method] }}
        >
          {endpoint.method}
        </span>
        <code className="request-path">{endpoint.path}</code>
        {endpoint.auth && (
          <span className="auth-required">🔒 Auth required</span>
        )}
      </div>
      <p className="endpoint-description">{endpoint.description}</p>

      <form onSubmit={handleSubmit}>
        {endpoint.fields.length === 0 ? (
          <p className="no-fields">No parameters required.</p>
        ) : (
          <div className="fields">
            {endpoint.fields.map((field) => (
              <div key={field.name} className="field-row">
                <label className="field-label">
                  <span className="field-name">{field.label}</span>
                  <span className="field-meta">
                    [{field.paramType}
                    {field.type === "number" ? ", number" : ""}
                    {field.type === "boolean" ? ", boolean" : ""}]
                  </span>
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    className="field-input field-textarea"
                    value={values[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.label}
                    rows={3}
                  />
                ) : field.type === "boolean" ? (
                  <select
                    className="field-input"
                    value={values[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  >
                    <option value="">— select —</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    className="field-input"
                    type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                    value={values[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <button className="send-btn" type="submit" disabled={loading}>
          {loading ? "Sending…" : `Send ${endpoint.method}`}
        </button>
      </form>
    </div>
  );
}
