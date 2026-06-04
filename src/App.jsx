import { useState, useCallback } from "react";
import { sections } from "./endpoints";
import { executeRequest } from "./apiFetch";
import Sidebar from "./components/Sidebar";
import TokenBar from "./components/TokenBar";
import RequestForm from "./components/RequestForm";
import ResponsePane from "./components/ResponsePane";
import GraphView from "./graph/GraphView";
import "./App.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("jwt") || import.meta.env.VITE_CURIUS_JWT || "");
  const [activeTab, setActiveTab] = useState("explorer");
  const [activeEndpoint, setActiveEndpoint] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTokenChange = useCallback((val) => {
    setToken(val);
    localStorage.setItem("jwt", val);
  }, []);

  const handleSelectEndpoint = useCallback((ep) => {
    setActiveEndpoint(ep);
    setResponse(null);
  }, []);

  const handleSubmit = useCallback(async (fieldValues) => {
    setLoading(true);
    setResponse(null);
    const result = await executeRequest(activeEndpoint, fieldValues, token);
    setResponse(result);
    setLoading(false);
  }, [activeEndpoint, token]);

  return (
    <div className="app">
      <TokenBar token={token} onChange={handleTokenChange} />
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === "explorer" ? "active" : ""}`}
          onClick={() => setActiveTab("explorer")}
        >
          API Explorer
        </button>
        <button
          className={`tab-btn ${activeTab === "graph" ? "active" : ""}`}
          onClick={() => setActiveTab("graph")}
        >
          Social Graph
        </button>
      </div>
      {activeTab === "explorer" ? (
        <div className="body">
          <Sidebar
            sections={sections}
            activeId={activeEndpoint?.id}
            onSelect={handleSelectEndpoint}
          />
          <main className="main">
            {activeEndpoint ? (
              <>
                <RequestForm endpoint={activeEndpoint} onSubmit={handleSubmit} loading={loading} />
                {(loading || response) && (
                  <ResponsePane response={response} loading={loading} />
                )}
              </>
            ) : (
              <div className="placeholder">
                <div className="placeholder-inner">
                  <div className="placeholder-title">Curius API Explorer</div>
                  <div className="placeholder-sub">Select an endpoint from the sidebar to get started.</div>
                  <div className="placeholder-count">{sections.reduce((n, s) => n + s.endpoints.length, 0)} endpoints across {sections.length} sections</div>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        <GraphView token={token} />
      )}
    </div>
  );
}
