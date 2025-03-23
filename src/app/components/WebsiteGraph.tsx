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
  onViewModeChange?: (mode: "simple" | "detailed") => void;
}

export default function WebsiteGraph({
  files,
  repoOwner,
  repoName,
  graphData: initialGraphData,
  onViewModeChange,
}: WebsiteGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [processedGraph, setProcessedGraph] = useState<string>("");
  const [svgContent, setSvgContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fixSpecificSyntaxError = (input: string): string => {
    const lines = input.split("\n");
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      const nodePattern = /(\w+)(\[[^\]]+\])/g;
      const matches = [...line.matchAll(nodePattern)];

      if (matches.length > 1) {
        for (const match of matches) {
          result.push(`    ${match[0]}`);
        }
      } else if (line.startsWith("subgraph")) {
        result.push(line);
      } else if (line === "end") {
        result.push(line);
      } else if (line.includes("-->")) {
        const cleanedLine = line.replace(/--\s*>/g, "-->");
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
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      const processGraphData = async () => {
        try {
          if (initialGraphData) {
            setLoading(true);
            let fixed = fixSpecificSyntaxError(initialGraphData);
  
            if (!fixed.includes("flowchart") && !fixed.includes("graph")) {
              fixed = "flowchart TD\n" + fixed;
            }
  
            console.log("Original:", initialGraphData);
            console.log("Fixed:", fixed);
  
            setProcessedGraph(fixed); // Always update to trigger re-render
            setLoading(false);
          } else if (files && files.length > 0 && repoOwner && repoName) {
            setLoading(true); // Show loading state while fetching new data
            const graphData = await analyzeWithGemini(
              repoOwner,
              repoName,
              files,
              viewMode
            );
            let fixed = fixSpecificSyntaxError(graphData);
  
            if (!fixed.includes("flowchart") && !fixed.includes("graph")) {
              fixed = "flowchart TD\n" + fixed;
            }
  
            console.log("Original:", graphData);
            console.log("Fixed:", fixed);
  
            setProcessedGraph(fixed); // Always update to trigger re-render
            setLoading(false); // Hide loading when complete
          } else {
            setProcessedGraph(
              "flowchart TD\n    A[Missing Data] --> B[Cannot Generate Graph]"
            );
          }
        } catch (err) {
          console.error("Error processing graph:", err);
          setProcessedGraph(
            "flowchart TD\n    A[Error] --> B[Failed to Generate]"
          );
          setLoading(false); // Ensure loading is turned off on error
        }
      };
  
      processGraphData();
    }
  }, [files, repoOwner, repoName, initialGraphData, isInitialized, viewMode]); // Include viewMode in dependencies
  

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
          containerRef.current!.innerHTML = `
            <div class="mt-4 p-2 bg-red-900 text-white rounded">
              <p>Error: ${err.message || "Failed to render diagram"}</p>
            </div>
          `;
        });
    }
  }, [processedGraph]);

  // Add this function to handle view mode changes
  const changeViewMode = (mode: "simple" | "detailed") => {
    // Only trigger reload if the mode is different
    if (mode !== viewMode) {
      // Don't set loading here since we want that to be controlled by the parent
      setViewMode(mode);
      onViewModeChange?.(mode);
    }
  };

  useEffect(() => {
    // Reset loading state when the viewMode changes
    // This will help sync with the parent's loading state
    if (loading && !files?.length) {
      setLoading(false);
    }
  }, [viewMode, loading, files]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
        <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg">Generating {viewMode} diagram...</p>
        <p className="text-sm text-gray-400 mt-2">This may take a few moments</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-10 flex gap-2 bg-gray-900/70 p-1.5 rounded-md backdrop-blur-sm">
        <div className="flex rounded-md overflow-hidden">
          <button
            onClick={() => changeViewMode("simple")}
            className={`px-2 py-1 text-xs flex items-center transition-colors ${
              viewMode === "simple" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            disabled={loading}
            title="Simple view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            Simple
          </button>
          <button
            onClick={() => changeViewMode("detailed")}
            className={`px-2 py-1 text-xs flex items-center transition-colors ${
              viewMode === "detailed" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            disabled={loading}
            title="Detailed view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Detailed
          </button>
        </div>
        
        {loading && (
          <div
            className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md flex items-center text-xs"
          >
            <svg className="animate-spin h-3 w-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={toggleFullscreen}
            className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md flex items-center text-xs hover:bg-gray-600 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "View in fullscreen"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            )}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
          
          <button
            onClick={handleDownload}
            disabled={!svgContent}
            className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md flex items-center text-xs hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:hover:bg-gray-700 disabled:cursor-not-allowed"
            title="Download as SVG"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>
      
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
