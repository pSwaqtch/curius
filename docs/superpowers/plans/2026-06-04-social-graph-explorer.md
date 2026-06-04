# Social Graph Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Graph" tab to the Curius API Explorer that renders a D3 force-directed graph of follow relationships, with click-to-expand and localStorage caching.

**Architecture:** A tab bar in App.jsx toggles between the existing Explorer view and a new GraphView. A `graphCrawler.js` module handles all fetching and caching (localStorage keyed by userLink). GraphView owns D3 simulation state in a useRef and React state for nodes/edges/status.

**Tech Stack:** React, D3 (d3-force, d3-selection, d3-zoom), Vite proxy for CORS, localStorage for cache.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/graph/graphCrawler.js` | Create | Fetch + cache users, build nodes/edges |
| `src/graph/GraphView.jsx` | Create | D3 SVG graph, click-to-expand, status bar |
| `src/App.jsx` | Modify | Add tab bar, render GraphView on "Graph" tab |
| `src/App.css` | Modify | Tab bar styles + graph container styles |
| `package.json` | Modify | Add d3 dependency |

---

## Task 1: Install D3

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install d3**

```bash
cd /Volumes/Power/projects/curius-api/curius-explorer
npm install d3
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify import works**

```bash
node -e "import('d3').then(d => console.log(Object.keys(d).slice(0,5)))"
```

Expected: prints array of d3 export names like `[ 'bisect', 'bisectLeft', ... ]`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add d3 dependency"
```

---

## Task 2: Build graphCrawler.js

**Files:**
- Create: `src/graph/graphCrawler.js`

- [ ] **Step 1: Create `src/graph/graphCrawler.js`**

```js
const CACHE_KEY = "curius_graph_cache";

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

async function fetchUser(userLink, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/users/${userLink}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${userLink}: ${res.status}`);
  const data = await res.json();
  return data.user;
}

async function fetchMe(token) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch("/api/user", { headers });
  if (!res.ok) throw new Error(`Failed to fetch /api/user: ${res.status}`);
  const data = await res.json();
  return data.user;
}

// Build nodes + edges from a cache map { userLink -> user }
function buildGraph(cache, rootUserLink) {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  for (const [userLink, user] of Object.entries(cache)) {
    if (!seen.has(userLink)) {
      seen.add(userLink);
      nodes.push({
        id: userLink,
        label: `${user.firstName} ${user.lastName}`.trim() || userLink,
        isRoot: userLink === rootUserLink,
      });
    }
    for (const followed of user.followingUsers || []) {
      if (!seen.has(followed.userLink)) {
        seen.add(followed.userLink);
        nodes.push({
          id: followed.userLink,
          label: `${followed.firstName} ${followed.lastName}`.trim() || followed.userLink,
          isRoot: followed.userLink === rootUserLink,
        });
      }
      edges.push({ source: userLink, target: followed.userLink });
    }
  }

  return { nodes, edges };
}

// Crawl: fetch root user + their following (1 level deep)
// onProgress(fetched, total) called as requests complete
export async function crawlFromRoot(token, onProgress) {
  const cache = loadCache();

  // Fetch root user
  let me;
  if (cache["__me__"]) {
    me = cache["__me__"];
  } else {
    me = await fetchMe(token);
    cache["__me__"] = me;
    cache[me.userLink] = me;
    saveCache(cache);
  }

  const rootUserLink = me.userLink;
  const toFetch = (me.followingUsers || []).filter(
    (u) => !cache[u.userLink]
  );

  onProgress(0, toFetch.length);

  for (let i = 0; i < toFetch.length; i++) {
    const u = toFetch[i];
    try {
      const full = await fetchUser(u.userLink, token);
      cache[u.userLink] = full;
      saveCache(cache);
    } catch (e) {
      // store minimal data so we don't retry on reload
      cache[u.userLink] = { ...u, followingUsers: [] };
      saveCache(cache);
    }
    onProgress(i + 1, toFetch.length);
  }

  return { graph: buildGraph(cache, rootUserLink), rootUserLink };
}

// Expand a single node — fetch their following if not already cached
export async function expandNode(userLink, token, onProgress) {
  const cache = loadCache();

  if (!cache[userLink]) {
    onProgress(0, 1);
    const user = await fetchUser(userLink, token);
    cache[userLink] = user;
    saveCache(cache);
    onProgress(1, 1);
  }

  const me = cache["__me__"];
  const rootUserLink = me?.userLink || "";
  return { graph: buildGraph(cache, rootUserLink), rootUserLink };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/graph/graphCrawler.js
git commit -m "feat: add graph crawler with localStorage cache"
```

---

## Task 3: Build GraphView.jsx

**Files:**
- Create: `src/graph/GraphView.jsx`

- [ ] **Step 1: Create `src/graph/GraphView.jsx`**

```jsx
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { crawlFromRoot, expandNode, clearCache } from "./graphCrawler";

const WIDTH = "100%";
const NODE_RADIUS = 18;
const ROOT_RADIUS = 26;

export default function GraphView({ token }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [progress, setProgress] = useState({ fetched: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const graphRef = useRef({ nodes: [], edges: [] });
  const rootRef = useRef("");

  const renderGraph = useCallback((nodes, edges) => {
    const svg = d3.select(svgRef.current);
    const container = svg.select("g.zoom-container");

    // Build a map for fast lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Only keep edges where both endpoints exist
    const validEdges = edges.filter(
      (e) => nodeMap.has(e.source?.id ?? e.source) && nodeMap.has(e.target?.id ?? e.target)
    );

    // Stop old simulation
    if (simRef.current) simRef.current.stop();

    const sim = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(validEdges).id((d) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(svgRef.current.clientWidth / 2, svgRef.current.clientHeight / 2))
      .force("collision", d3.forceCollide(40));

    simRef.current = sim;

    // Arrow marker
    svg.select("defs").remove();
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#4f46e5");

    // Edges
    const link = container.selectAll("line.edge")
      .data(validEdges, (d) => `${d.source?.id ?? d.source}-${d.target?.id ?? d.target}`)
      .join("line")
      .attr("class", "edge")
      .attr("stroke", "#2d3148")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Nodes
    const node = container.selectAll("g.node")
      .data(nodes, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g").attr("class", "node").style("cursor", "pointer");
        g.append("circle");
        g.append("text");
        return g;
      });

    node.select("circle")
      .attr("r", (d) => (d.isRoot ? ROOT_RADIUS : NODE_RADIUS))
      .attr("fill", (d) => (d.isRoot ? "#6366f1" : "#1e2235"))
      .attr("stroke", (d) => (d.isRoot ? "#818cf8" : "#3b4270"))
      .attr("stroke-width", 2);

    node.select("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.isRoot ? ROOT_RADIUS + 14 : NODE_RADIUS + 13))
      .attr("fill", "#cbd5e1")
      .attr("font-size", "11px")
      .style("pointer-events", "none");

    node.on("click", async (event, d) => {
      event.stopPropagation();
      setStatus("loading");
      setProgress({ fetched: 0, total: 1 });
      try {
        const { graph, rootUserLink } = await expandNode(d.id, token, (f, t) =>
          setProgress({ fetched: f, total: t })
        );
        rootRef.current = rootUserLink;
        graphRef.current = graph;
        renderGraph(graph.nodes, graph.edges);
        setStatus("done");
      } catch (e) {
        setErrorMsg(e.message);
        setStatus("error");
      }
    });

    node.call(
      d3.drag()
        .on("start", (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    sim.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  }, [token]);

  const startCrawl = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const { graph, rootUserLink } = await crawlFromRoot(token, (fetched, total) =>
        setProgress({ fetched, total })
      );
      rootRef.current = rootUserLink;
      graphRef.current = graph;
      renderGraph(graph.nodes, graph.edges);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  }, [token, renderGraph]);

  // Set up zoom on mount
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.select("g.zoom-container").remove();
    svg.append("g").attr("class", "zoom-container");

    const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", (event) => {
      svg.select("g.zoom-container").attr("transform", event.transform);
    });
    svg.call(zoom);
  }, []);

  const handleClearCache = () => {
    clearCache();
    d3.select(svgRef.current).select("g.zoom-container").selectAll("*").remove();
    graphRef.current = { nodes: [], edges: [] };
    setStatus("idle");
  };

  return (
    <div className="graph-view">
      <div className="graph-toolbar">
        <button className="graph-btn primary" onClick={startCrawl} disabled={status === "loading"}>
          {status === "loading" ? "Crawling…" : status === "done" ? "Re-crawl" : "Load Graph"}
        </button>
        <button className="graph-btn" onClick={handleClearCache} disabled={status === "loading"}>
          Clear Cache
        </button>
        <span className="graph-status">
          {status === "loading" && `Fetching ${progress.fetched} / ${progress.total} users…`}
          {status === "done" && `${graphRef.current.nodes.length} nodes · ${graphRef.current.edges.length} edges`}
          {status === "error" && <span className="graph-error">{errorMsg}</span>}
          {status === "idle" && "Click 'Load Graph' to start. Scroll to zoom, drag to pan, click nodes to expand."}
        </span>
      </div>
      <svg ref={svgRef} className="graph-svg" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/graph/GraphView.jsx
git commit -m "feat: add D3 force-directed GraphView component"
```

---

## Task 4: Wire tab bar into App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update `src/App.jsx`**

Replace the entire file content with:

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add tab bar switching between Explorer and Social Graph"
```

---

## Task 5: Add CSS for tab bar and graph

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Append to `src/App.css`**

Add at the end of the file:

```css
/* ── Tab Bar ───────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 2px;
  padding: 0 16px;
  background: #1a1d27;
  border-bottom: 1px solid #2d3148;
  flex-shrink: 0;
}

.tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px 8px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn:hover { color: #94a3b8; }
.tab-btn.active {
  color: #e2e8f0;
  border-bottom-color: #6366f1;
}

/* ── Graph View ────────────────────────────────────────── */
.graph-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.graph-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #13151f;
  border-bottom: 1px solid #2d3148;
  flex-shrink: 0;
}

.graph-btn {
  background: #1e2235;
  border: 1px solid #2d3148;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.graph-btn:hover:not(:disabled) { background: #2d3148; color: #e2e8f0; }
.graph-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.graph-btn.primary { background: #6366f1; color: #fff; border-color: #6366f1; }
.graph-btn.primary:hover:not(:disabled) { background: #4f46e5; }

.graph-status {
  font-size: 12px;
  color: #64748b;
  flex: 1;
}
.graph-error { color: #ef4444; }

.graph-svg {
  flex: 1;
  width: 100%;
  display: block;
  background: #0f1117;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.css
git commit -m "feat: add tab bar and graph view CSS"
```

---

## Task 6: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
cd /Volumes/Power/projects/curius-api/curius-explorer
npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 2: Verify tab bar**

Two tabs visible: "API Explorer" and "Social Graph". Clicking each switches the view. API Explorer works as before.

- [ ] **Step 3: Verify graph load**

Click "Social Graph" tab → click "Load Graph". Status bar shows "Fetching 0 / N users…" counting up. After completion: SVG shows nodes and directed edges. Your node (krupal-virani) is larger and purple.

- [ ] **Step 4: Verify cache**

Open DevTools → Application → localStorage → check `curius_graph_cache` key exists with user data. Click "Re-crawl" — should complete instantly (0 new fetches, all cached).

- [ ] **Step 5: Verify click-to-expand**

Click a non-root node. Status bar briefly shows "Fetching 0 / 1 users…" then resolves. New nodes/edges appear for that user's following.

- [ ] **Step 6: Verify clear cache**

Click "Clear Cache". Graph clears. localStorage key is removed. "Load Graph" fetches fresh.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: social graph explorer complete"
```
