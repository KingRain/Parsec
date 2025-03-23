"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { analyzeWithGemini } from "../utils/analyzeWithGemini"; // Adjust path as needed
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface WebsiteGraphProps {
  files?: { path: string }[];
  repoOwner?: string;
  repoName?: string;
  graphData?: string;
}

export default function WebsiteGraph({
  files,
  repoOwner,
  repoName,
  graphData: initialGraphData,
}: WebsiteGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [processedGraph, setProcessedGraph] = useState<string>("");
  const [svgContent, setSvgContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");
  
  // Store both graph versions
  const [simpleGraph, setSimpleGraph] = useState<string>("");
  const [detailedGraph, setDetailedGraph] = useState<string>("");
  const [fetchingGraphs, setFetchingGraphs] = useState(false);

  const fixSpecificSyntaxError = (input: string): string => {
    const lines = input.split("\n");
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      const nodePattern = /(\w+)(\[[^\]]+\])/g;
      let matches = [...line.matchAll(nodePattern)];

      if (matches.length > 1) {
        for (const match of matches) {
          result.push(`    ${match[0]}`);
        }
      } else if (line.startsWith("subgraph")) {
        result.push(line);
      } else if (line === "end") {
        result.push(line);
      } else if (line.includes("-->")) {
        let cleanedLine = line.replace(/--\s*>/g, "-->");
        result.push(cleanedLine);
      } else if (line.startsWith("style")) {
        result.push(line);
      } else {
        result.push(line);
      }
    }

    return result.join("\n");
  };

  const handleDownload = () => {
    if (svgContent) {
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagram-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
    });
    setLoading(false);
  }, []);

  // Fetch both graph types on initial load
  useEffect(() => {
    if (!loading && files && repoOwner && repoName && !initialGraphData) {
      const fetchBothGraphs = async () => {
        try {
          setFetchingGraphs(true);
          
          // Fetch both graph types in parallel
          const [simpleData, detailedData] = await Promise.all([
            analyzeWithGemini(repoOwner, repoName, files, "simple"),
            analyzeWithGemini(repoOwner, repoName, files, "detailed")
          ]);
          
          // Process simple graph
          let fixedSimple = fixSpecificSyntaxError(simpleData);
          if (!fixedSimple.includes("flowchart") && !fixedSimple.includes("graph")) {
            fixedSimple = "flowchart TD\n" + fixedSimple;
          }
          setSimpleGraph(fixedSimple);
          
          // Process detailed graph
          let fixedDetailed = fixSpecificSyntaxError(detailedData);
          if (!fixedDetailed.includes("flowchart") && !fixedDetailed.includes("graph")) {
            fixedDetailed = "flowchart TD\n" + fixedDetailed;
          }
          setDetailedGraph(fixedDetailed);
          
          // Set current graph based on view mode
          setProcessedGraph(viewMode === "simple" ? fixedSimple : fixedDetailed);
          setFetchingGraphs(false);
        } catch (err) {
          console.error("Error fetching graphs:", err);
          setProcessedGraph("flowchart TD\n    A[Error] --> B[Failed to Generate]");
          setFetchingGraphs(false);
        }
      };
      
      fetchBothGraphs();
    } else if (!loading && initialGraphData) {
      // Handle initialGraphData case
      let fixed = fixSpecificSyntaxError(initialGraphData);
      if (!fixed.includes("flowchart") && !fixed.includes("graph")) {
        fixed = "flowchart TD\n" + fixed;
      }
      setSimpleGraph(fixed);
      setDetailedGraph(fixed);
      setProcessedGraph(fixed);
    } else if (!loading) {
      setProcessedGraph("flowchart TD\n    A[Missing Data] --> B[Cannot Generate Graph]");
    }
  }, [files, repoOwner, repoName, initialGraphData, loading]);

  // Handle view mode change
  useEffect(() => {
    if (viewMode === "simple" && simpleGraph) {
      setProcessedGraph(simpleGraph);
    } else if (viewMode === "detailed" && detailedGraph) {
      setProcessedGraph(detailedGraph);
    }
  }, [viewMode, simpleGraph, detailedGraph]);

  useEffect(() => {
    if (processedGraph && containerRef.current) {
      const id = `mermaid-${Date.now()}`;

      mermaid
        .render(id, processedGraph)
        .then(({ svg }) => {
          setSvgContent(svg);
          if (containerRef.current) {
            containerRef.current.innerHTML = ""; // Clear previous content
            containerRef.current.innerHTML = svg; // Insert new graph
          }
        })
        .catch((err) => {
          console.error("Failed to render graph:", err);
          setSvgContent("");
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="mt-4 p-2 bg-red-900 text-white rounded">
                <p>Error: ${err.message || "Failed to render diagram"}</p>
              </div>
            `;
          }
        });
    }
  }, [processedGraph]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white p-4">
        Loading diagram renderer...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <button
          onClick={() => setViewMode("simple")}
          disabled={fetchingGraphs}
          className={`text-white p-1 rounded text-xs shadow-sm ${
            viewMode === "simple" 
              ? "bg-blue-700" 
              : "bg-blue-600 hover:bg-blue-700"
          } ${fetchingGraphs ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Simple
        </button>
        <button
          onClick={() => setViewMode("detailed")}
          disabled={fetchingGraphs}
          className={`text-white p-1 rounded text-xs shadow-sm ${
            viewMode === "detailed" 
              ? "bg-blue-700" 
              : "bg-blue-600 hover:bg-blue-700"
          } ${fetchingGraphs ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Detailed
        </button>
        <button
          onClick={handleDownload}
          disabled={!svgContent || fetchingGraphs}
          className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↓ SVG
        </button>
      </div>
      {fetchingGraphs && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-5">
          <div className="bg-gray-800 p-4 rounded-md shadow-lg">
            <p className="text-white">Generating graphs...</p>
          </div>
        </div>
      )}
      <TransformWrapper
        initialScale={2}
        minScale={1}
        maxScale={20}
        centerOnInit={true}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100vh" }}>
          <div
            ref={containerRef}
            className="w-full h-full bg-black text-white p-4"
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
