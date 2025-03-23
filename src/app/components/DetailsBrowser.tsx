"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import LanguageStats from "./LanguageStats";
import dynamic from "next/dynamic";
import { analyzeWithGemini } from "../utils/analyzeWithGemini";
import { fetchRepoFiles } from '../utils/fetchRepoFiles';

const WebsiteGraph = dynamic(() => import("./WebsiteGraph"), { ssr: false });
const ChatBot = dynamic(() => import("./ChatBot"), { ssr: false });

interface DetailsBrowserProps {
  repoOwner: string;
  repoName: string;
}

interface PlaygroundProps {
  repoOwner: string;
  repoName: string;
}

const Playground = dynamic<PlaygroundProps>(() => import("./Playground"), { ssr: false });

interface Dependency {
  name: string;
  version: string;
}

export default function DetailsBrowser({ repoOwner, repoName }: DetailsBrowserProps) {
  const [activeTab, setActiveTab] = useState<"codebase" | "graph" | "chat" | "playground">("codebase");
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [graphData, setGraphData] = useState<string>("graph TD;");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");
  const [repoFiles, setRepoFiles] = useState<{path: string}[]>([]);
  const [diagramLoading, setDiagramLoading] = useState(false);
  
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchDependencies() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/package.json`,
          { signal }
        );

        if (!response.ok) throw new Error("Could not fetch package.json");

        const data = await response.json();
        const content = atob(data.content);
        const packageJson = JSON.parse(content);

        const deps: Dependency[] = [
          ...Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({ name, version: version as string })),
          ...Object.entries(packageJson.devDependencies || {}).map(([name, version]) => ({ name, version: `${version as string} (dev)` })),
        ];

        setDependencies(deps);
      } catch (err) {
        if (signal.aborted) return;
        setError("Failed to load dependencies");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchGraphData() {
      setLoading(true);
      setError("");
      
      try {
        const files = await fetchRepoFiles(repoOwner, repoName);
        setRepoFiles(files);
        const response = await analyzeWithGemini(repoOwner, repoName, files, viewMode);
        
        console.log("Raw AI Response:", response);
        
        setGraphData(response);
      } catch (err) {
        if (signal.aborted) return;
        console.error("Error generating graph:", err);
        setGraphData("graph TD;\n Error[\"Failed to generate graph\"]");
      } finally {
        setLoading(false);
      }
    }

    if (activeTab === "codebase") {
      fetchDependencies();
    } else if (activeTab === "graph") {
      fetchGraphData();
    }

    return () => abortController.abort();
  }, [activeTab, repoOwner, repoName]);
  
  // Function to handle view mode changes with proper loading state
  const handleViewModeChange = (mode: "simple" | "detailed") => {
    setDiagramLoading(true);
    setViewMode(mode);
  };
  
  // Add a separate effect for viewMode changes
  useEffect(() => {
    if (activeTab !== "graph") return;
    
    const controller = new AbortController();
    const { signal } = controller;
    
    const fetchData = async () => {
      if (!repoFiles.length) {
        return;
      }
      
      setDiagramLoading(true);
      try {
        const response = await analyzeWithGemini(
          repoOwner, 
          repoName, 
          repoFiles, 
          viewMode
        );
        
        if (!signal.aborted) {
          console.log(`ViewMode changed to ${viewMode}, updating graph...`);
          setGraphData(response);
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error("Error updating graph with new view mode:", err);
          setGraphData("graph TD;\n Error[\"Failed to update graph with " + viewMode + " view\"]");
        }
      } finally {
        if (!signal.aborted) {
          setDiagramLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => controller.abort();
  }, [viewMode, repoOwner, repoName, activeTab, repoFiles.length]);

  // Add a separate effect to fetch initial data when switching to graph tab
  useEffect(() => {
    if (activeTab === "graph" && repoFiles.length === 0) {
      const fetchInitialGraphData = async () => {
        setLoading(true);
        setError("");
        
        try {
          const files = await fetchRepoFiles(repoOwner, repoName);
          setRepoFiles(files);
          const response = await analyzeWithGemini(repoOwner, repoName, files, viewMode);
          
          console.log("Raw AI Response:", response);
          
          setGraphData(response);
        } catch (err) {
          console.error("Error generating graph:", err);
          setGraphData("graph TD;\n Error[\"Failed to generate graph\"]");
        } finally {
          setLoading(false);
          setDiagramLoading(false); // Also reset diagram loading state
        }
      };
      
      fetchInitialGraphData();
    }
  }, [activeTab, repoOwner, repoName, repoFiles.length, viewMode]);

  return (
    <div className="w-full h-full bg-black text-white border-slate-700 border-l p-2">
      <div className="flex border-b border-gray-800">
        {["codebase", "graph", "chat", "playground"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "codebase" | "graph" | "chat" | "playground")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "text-blue-400 border-b border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            {tab === "codebase" ? "Codebase Info" : tab === "graph" ? "Graph" : tab === "chat" ? "Chat" : "Playground"}
          </button>
        ))}
      </div>

      <div className="w-full h-[calc(100%-40px)] p-2">
        {activeTab === "codebase" ? (
          <>
            <h3 className="text-sm font-medium mb-2">Languages</h3>
            <LanguageStats repoOwner={repoOwner} repoName={repoName} />

            <h3 className="text-sm font-medium mt-4 mb-2">Dependencies</h3>
            {loading ? (
              <p className="text-gray-400">Loading dependencies...</p>
            ) : error ? (
              <p className="text-red-400">{error}</p>
            ) : dependencies.length === 0 ? (
              <p className="text-gray-400">No dependencies found</p>
            ) : (
              <ul className="text-sm">
                {dependencies.map((dep, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-blue-400">{dep.name}</span>
                    <span className="text-gray-400">{dep.version}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : activeTab === "graph" ? (
          <WebsiteGraph 
            graphData={graphData} 
            repoOwner={repoOwner} 
            repoName={repoName}
            files={repoFiles} 
            onViewModeChange={handleViewModeChange}
            isLoading={diagramLoading}
            setIsLoading={setDiagramLoading}
          />
        ) : activeTab === "chat" ? (
          <ChatBot ownerName={repoOwner} repoName={repoName}/>
        ) : (
          <Playground repoOwner={repoOwner} repoName={repoName} />
        )}
      </div>
    </div>
  );
}
