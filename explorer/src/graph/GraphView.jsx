import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { crawlFromRoot, expandNode, clearCache } from "./graphCrawler";

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

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Only keep edges where both endpoints exist
    const validEdges = edges.filter(
      (e) => nodeMap.has(e.source?.id ?? e.source) && nodeMap.has(e.target?.id ?? e.target)
    );

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

    const link = container.selectAll("line.edge")
      .data(validEdges, (d) => `${d.source?.id ?? d.source}-${d.target?.id ?? d.target}`)
      .join("line")
      .attr("class", "edge")
      .attr("stroke", "#2d3148")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

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
