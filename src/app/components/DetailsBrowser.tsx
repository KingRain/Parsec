"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import LanguageStats from "./LanguageStats";
import WebsiteGraph from "./WebsiteGraph";

interface DetailsBrowserProps {
  repoOwner: string;
  repoName: string;
}

interface Dependency {
  name: string;
  version: string;
}

export default function DetailsBrowser({
  repoOwner,
  repoName,
}: DetailsBrowserProps) {
  const [activeTab, setActiveTab] = useState<"codebase" | "graph">("codebase");
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPackageJson() {
      setLoading(true);
      setError("");
      try {
        // Fetch package.json content from GitHub API
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/package.json`
        );

        if (!response.ok) {
          throw new Error("Could not fetch package.json");
        }

        const data = await response.json();

        // GitHub API returns the content as base64 encoded
        const content = atob(data.content);
        const packageJson = JSON.parse(content);

        // Extract dependencies and devDependencies
        const deps: Dependency[] = [];

        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(
            ([name, version]) => {
              deps.push({ name, version: version as string });
            }
          );
        }

        if (packageJson.devDependencies) {
          Object.entries(packageJson.devDependencies).forEach(
            ([name, version]) => {
              deps.push({ name, version: `${version as string} (dev)` });
            }
          );
        }

        setDependencies(deps);
      } catch (err) {
        setError("Failed to load dependencies");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (activeTab === "codebase") {
      fetchPackageJson();
    }
  }, [repoOwner, repoName, activeTab]);

  return (
    <div className="w-full h-full bg-black text-white border-slate-700 border-l p-2">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab("codebase")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "codebase"
              ? "text-blue-400 border-b border-blue-400"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          Codebase Info
        </button>

        <button
          onClick={() => setActiveTab("graph")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "graph"
              ? "text-blue-400 border-b border-blue-400"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          Graph
        </button>
      </div>

      {/* Content Area */}
      <div className="w-full h-[calc(100%-40px)]">
        <div
          className={cn(
            "w-full h-full",
            activeTab === "codebase" ? "block" : "hidden"
          )}
        >
          {/* Codebase Info Content */}
          <div className="w-full flex flex-col gap-1 p-1">
            <div className="border border-gray-800 rounded p-1">
              <h3 className="text-sm font-medium mb-1">Languages</h3>
              <LanguageStats repoOwner={repoOwner} repoName={repoName} />
            </div>
            <div className="border border-gray-800 rounded p-1">
              <h3 className="text-sm font-medium mb-1">Dependencies</h3>
              <div className="flex flex-col gap-1">
                {loading && (
                  <div className="text-sm text-gray-400">
                    Loading dependencies...
                  </div>
                )}
                {error && <div className="text-sm text-red-400">{error}</div>}
                {!loading && !error && dependencies.length === 0 && (
                  <div className="text-sm text-gray-400">
                    No dependencies found
                  </div>
                )}
                {dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                    <span className="text-sm">
                      <a
                        href={`https://www.npmjs.com/package/${dep.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {dep.name}
                      </a>{" "}
                      <span className="text-xs text-gray-400">
                        {dep.version}
                      </span>
                      {dep.deprecated && (
                        <span className="ml-1 text-xs bg-red-900 text-red-300 px-1 py-0.5 rounded">
                          deprecated
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "w-full h-full",
            activeTab === "graph" ? "block" : "hidden"
          )}
        >
          {/* Graph Content */}
          <div className="w-full h-full">
            <WebsiteGraph repoOwner={repoOwner} repoName={repoName}/>
          </div>
        </div>
      </div>
    </div>
  );
}
