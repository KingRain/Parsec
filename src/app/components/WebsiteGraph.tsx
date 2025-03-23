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

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      const processGraphData = async () => {
        try {
          if (initialGraphData) {
            let fixed = fixSpecificSyntaxError(initialGraphData);

            if (!fixed.includes("flowchart") && !fixed.includes("graph")) {
              fixed = "flowchart TD\n" + fixed;
            }

            console.log("Original:", initialGraphData);
            console.log("Fixed:", fixed);

            setProcessedGraph((prev) => (prev !== fixed ? fixed : prev));
          } else if (files && repoOwner && repoName) {
            const graphData = await analyzeWithGemini(
              repoOwner,
              repoName,
              files
            );
            let fixed = fixSpecificSyntaxError(graphData);

            if (!fixed.includes("flowchart") && !fixed.includes("graph")) {
              fixed = "flowchart TD\n" + fixed;
            }

            console.log("Original:", graphData);
            console.log("Fixed:", fixed);

            setProcessedGraph((prev) => (prev !== fixed ? fixed : prev));
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
        }
      };

      processGraphData();
    }
  }, [files, repoOwner, repoName, initialGraphData, loading]);

  useEffect(() => {
    if (processedGraph && containerRef.current) {
      const id = `mermaid-${Date.now()}`;

      mermaid
        .render(id, processedGraph)
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = ""; // Clear previous content
            containerRef.current.innerHTML = svg; // Insert new graph
          }
        })
        .catch((err) => {
          console.error("Failed to render graph:", err);
          containerRef.current!.innerHTML = `
            <div class="mt-4 p-2 bg-red-900 text-white rounded">
              <p>Error: ${err.message || "Failed to render diagram"}</p>
            </div>
          `;
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
  );
}
