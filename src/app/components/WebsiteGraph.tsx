"use client";

import CytoscapeComponent from "react-cytoscapejs";
import { useEffect, useState } from "react";
import { fetchRepoFiles } from "../utils/fetchRepoFiles";
import { analyzeWithGemini } from "../utils/analyzeWithGemini";

const WebsiteGraph = ({ repoOwner, repoName }) => {
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const generateGraph = async () => {
      setLoading(true);

      const files = await fetchRepoFiles(repoOwner, repoName);
      const dependencies = await analyzeWithGemini(files);

      const nodes = files.map((file) => ({
        data: { id: file.path, label: file.path.split("/").pop() },
      }));

      const edges = dependencies.map((dep) => ({
        data: { source: dep.source, target: dep.target },
      }));

      setElements([...nodes, ...edges]);
      setLoading(false);
    };

    generateGraph();
  }, [repoOwner, repoName]);

  return (
    <div style={{ width: "100%", height: "700px", background: "#f8f8f8", borderRadius: "8px", padding: "10px" }}>
      {loading && <p style={{ textAlign: "center", fontSize: "18px", fontWeight: "bold" }}>Loading Graph...</p>}
      <CytoscapeComponent
        elements={elements}
        style={{ width: "100%", height: "100%" }}
        layout={{
          name: "cose", // Compound Spring Embedder (force-directed)
          animate: true,
          padding: 150, // Increased padding around the graph
          nodeRepulsion: 15000, // Increased from 8000 to create more space between nodes
          idealEdgeLength: 150, // Increased ideal edge length
          edgeElasticity: 100,
          fit: true,
          nodeDimensionsIncludeLabels: true, // Consider labels when calculating node spacing
          randomize: true, // Helps with initial spread
          componentSpacing: 150, // Space between disconnected components
          gravity: 0.5, // Reduced gravity to allow nodes to spread out more
        }}
        zoomingEnabled={true}
        maxZoom={2}
        minZoom={0.1}
        pan={{ x: 0, y: 0 }}
        stylesheet={[
          {
            selector: "node",
            style: {
              content: "data(label)",
              "text-valign": "center",
              "text-outline-width": 2,
              "text-outline-color": "#222",
              "background-color": "#222",
              "border-width": 2,
              "border-color": "#000",
              color: "#fff",
              "font-size": "12px",
              "font-weight": "bold",
              "width": "30px",
              "height": "30px",
              "text-margin-y": "5px",
            },
          },
          {
            selector: "node:hover",
            style: {
              "background-color": "#555",
              "border-color": "#000",
              "text-outline-color": "#555",
              "border-width": 3,
            },
          },
          {
            selector: "edge",
            style: {
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "line-color": "#888",
              "width": 1.5,
              "arrow-scale": 1.2,
              "target-arrow-color": "#888",
            },
          },
          {
            selector: "edge:hover",
            style: {
              "line-color": "#333",
              "target-arrow-color": "#333",
              "width": 2.5,
            },
          },
        ]}
      />
    </div>
  );
};

export default WebsiteGraph;
