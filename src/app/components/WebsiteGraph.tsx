"use client";

import CytoscapeComponent from "react-cytoscapejs";
import { useEffect, useState, useRef } from "react";
import { fetchRepoFiles } from "../utils/fetchRepoFiles";
import { analyzeWithGemini } from "../utils/analyzeWithGemini";

const WebsiteGraph = ({ repoOwner, repoName }) => {
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const cyRef = useRef<any>(null);

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

  // Run layout again after elements are loaded
  useEffect(() => {
    if (cyRef.current && elements.length > 0) {
      // Give some time for the initial rendering
      setTimeout(() => {
        cyRef.current.layout({
          name: 'cose',
          animate: true,
          padding: 200,
          nodeRepulsion: 25000, // Increased repulsion for better spacing
          idealEdgeLength: 200,
          edgeElasticity: 100,
          fit: true,
          nodeDimensionsIncludeLabels: true,
          randomize: true,
          componentSpacing: 200,
          gravity: 0.3, // Lower gravity means nodes spread more
          refresh: 20, // More iterations for better layout
          initialTemp: 200, // Higher initial temperature helps with spreading
          coolingFactor: 0.95, // Slower cooling for better optimization
        }).run();
      }, 100);
    }
  }, [elements]);

  return (
    <div style={{ width: "100%", height: "700px", background: "#f8f8f8", borderRadius: "8px", padding: "10px" }}>
      {loading && <p style={{ textAlign: "center", fontSize: "18px", fontWeight: "bold" }}>Loading Graph...</p>}
      {!loading && elements.length > 0 && (
        <CytoscapeComponent
          elements={elements}
          style={{ width: "100%", height: "100%" }}
          cy={(cy) => { cyRef.current = cy; }}
          layout={{
            name: "cose",
            animate: true,
            padding: 200, // Increased padding
            nodeRepulsion: 20000, // Significantly increased repulsion
            idealEdgeLength: 200, // Increased edge length
            edgeElasticity: 100,
            fit: true,
            nodeDimensionsIncludeLabels: true,
            randomize: true,
            componentSpacing: 200,
            gravity: 0.3,
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
      )}
    </div>
  );
};

export default WebsiteGraph;
