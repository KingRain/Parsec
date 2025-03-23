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
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export default function WebsiteGraph({
  files,
  repoOwner,
  repoName,
  graphData: initialGraphData,
  onViewModeChange,
  isLoading,
  setIsLoading,
}: WebsiteGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomInRef = useRef<((value?: number) => void) | null>(null);
  
  // Use external loading state if provided, otherwise use internal state
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading !== undefined ? isLoading : internalLoading;
  const setLoading = setIsLoading || setInternalLoading;
  
  const [processedGraph, setProcessedGraph] = useState<string>("");
  const [svgContent, setSvgContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadSvg = () => {
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
    setShowDownloadDropdown(false);
  };

  const handleDownloadJpeg = () => {
    if (svgContent && containerRef.current) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const jpegUrl = canvas.toDataURL('image/jpeg');
        const a = document.createElement('a');
        a.href = jpegUrl;
        a.download = `diagram-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      
      // Convert SVG to data URL
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        alert('Failed to convert to JPEG');
      };
    }
    setShowDownloadDropdown(false);
  };

  const handleDownloadPdf = () => {
    if (svgContent) {
      // Using a simple approach that opens a new window with the SVG and instructs user to print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Diagram PDF</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; }
                svg { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              ${svgContent}
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
      }
    }
    setShowDownloadDropdown(false);
  };

  const handleDownloadMarkdown = () => {
    if (processedGraph) {
      const markdownContent = "```mermaid\n" + processedGraph + "\n```";
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagram-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setShowDownloadDropdown(false);
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
  }, [files, repoOwner, repoName, initialGraphData, isInitialized, viewMode, setLoading]); // Include setLoading in dependencies
  

  // Function to center and adjust the SVG diagram
  const centerAndAdjustDiagram = (svgElement: SVGElement) => {
    // Set width and height to 100% to fill container
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');
    
    // Ensure the viewBox is correctly set for proper scaling
    if (!svgElement.getAttribute('viewBox')) {
      try {
        const bbox = (svgElement as SVGGraphicsElement).getBBox();
        // Add padding around the diagram content
        const padding = Math.max(bbox.width, bbox.height) * 0.1; // 10% padding
        svgElement.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + 2*padding} ${bbox.height + 2*padding}`);
      } catch (err) {
        console.error("Error getting bounding box:", err);
      }
    }
    
    // Add preserveAspectRatio attribute to center content
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // Find all nodes in the diagram to ensure they're visible
    const nodeElements = svgElement.querySelectorAll('.node, rect, circle, ellipse');
    
    // If we find nodes, ensure at least some are visible by adjusting scale
    if (nodeElements.length > 0) {
      // Set minimum node size for visibility
      const minNodeSize = 50; // minimum size in pixels for a node to be clearly visible
      
      // Check if nodes are too small and need rescaling
      let needsRescale = false;
      const smallestNode = { width: Infinity, height: Infinity };
      
      nodeElements.forEach(node => {
        try {
          // Try to get node dimensions
          const nodeBBox = (node as SVGGraphicsElement).getBBox();
          if (nodeBBox.width < smallestNode.width) smallestNode.width = nodeBBox.width;
          if (nodeBBox.height < smallestNode.height) smallestNode.height = nodeBBox.height;
          
          // If any node is too small, we'll need to rescale
          if (nodeBBox.width < minNodeSize || nodeBBox.height < minNodeSize) {
            needsRescale = true;
          }
        } catch {
          // Ignore errors for elements that don't support getBBox
        }
      });
      
      // If we need rescaling and have valid smallest node dimensions
      if (needsRescale && smallestNode.width < Infinity && smallestNode.height < Infinity) {
        // Calculate ideal scale factors
        const scaleX = minNodeSize / smallestNode.width;
        const scaleY = minNodeSize / smallestNode.height;
        
        // Use the smaller scale to ensure everything fits
        const scale = Math.min(scaleX, scaleY);
        
        // Add a custom attribute that our zoom controls can use
        svgElement.setAttribute('data-initial-scale', scale.toString());
      }
    }
    
    // Fix any fixed positions that might cause diagram to render off-screen
    const gElements = svgElement.querySelectorAll('g[transform]');
    gElements.forEach(g => {
      const transform = g.getAttribute('transform');
      if (transform && transform.includes('translate') && !g.classList.contains('adjusted')) {
        const translateRegex = /translate\(([-\d.]+),\s*([-\d.]+)\)/;
        const match = transform.match(translateRegex);
        
        if (match) {
          const [, x, y] = match;
          const parsedX = parseFloat(x);
          const parsedY = parseFloat(y);
          
          // If Y is very negative (diagram is too high), adjust it
          if (parsedY < -500) {
            const newTransform = transform.replace(
              translateRegex,
              `translate(${parsedX}, ${Math.max(parsedY, -300)})`
            );
            g.setAttribute('transform', newTransform);
            g.classList.add('adjusted');
          }
        }
      }
    });
    
    return true;
  };

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
            
            // Apply transformations to center the diagram
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              // Apply centering and get whether we need initial zooming
              centerAndAdjustDiagram(svgElement as SVGElement);
              
              // Apply initial scale if needed
              const initialScale = svgElement.getAttribute('data-initial-scale');
              if (initialScale) {
                const scale = parseFloat(initialScale);
                // Store scale value for later use with the reset button
                (containerRef.current as HTMLDivElement & { initialScale?: number }).initialScale = scale;
              }
            }
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
      // Set loading to true immediately to show the loading state
      setLoading(true);
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
  }, [viewMode, loading, files, setLoading]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      // Get parent element which contains the TransformWrapper
      const wrapper = containerRef.current.closest('.react-transform-wrapper');
      if (wrapper && wrapper.requestFullscreen) {
        wrapper.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else if (containerRef.current.requestFullscreen) {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute top-2 left-2 w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin-slow"></div>
          <div className="absolute top-4 left-4 w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin-slower"></div>
        </div>
        <p className="text-lg font-medium">Generating {viewMode} diagram...</p>
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
            {loading && viewMode === "simple" ? (
              <svg className="animate-spin h-3 w-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            )}
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
            {loading && viewMode === "detailed" ? (
              <svg className="animate-spin h-3 w-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            )}
            Detailed
          </button>
        </div>
        
        {loading && (
          <div className="px-2 py-1 bg-blue-600/80 text-white rounded-md flex items-center text-xs animate-pulse">
            <svg className="animate-spin h-3 w-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating {viewMode}...
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
          
          <div className="relative" ref={downloadDropdownRef}>
            <button
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              disabled={!svgContent}
              className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md flex items-center text-xs hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:hover:bg-gray-700 disabled:cursor-not-allowed"
              title="Download options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            
            {showDownloadDropdown && (
              <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                <div className="py-1">
                  <button
                    onClick={handleDownloadSvg}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700"
                  >
                    SVG
                  </button>
                  <button
                    onClick={handleDownloadJpeg}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700"
                  >
                    JPEG
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700"
                  >
                    PDF
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700"
                  >
                    Markdown
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={20}
        centerOnInit={true}
        limitToBounds={false}
        initialPositionX={0}
        initialPositionY={0}
        wheel={{
          step: 0.01,          // Reduced from 0.2 for smaller increments
          smoothStep: 0.02,    // Reduced for smoother zooming
          wheelDisabled: false,
        }}
        pinch={{
          step: 1,             // Reduced from 3 for smaller pinch zoom increments
          disabled: false,
        }}
        doubleClick={{
          mode: 'reset',
        }}
        panning={{
          disabled: false,
          velocityDisabled: false,
        }}
        onInit={() => {
          // After component is initialized, check if we need to apply initial scaling
          setTimeout(() => {
            if (containerRef.current) {
              const initialScale = (containerRef.current as HTMLDivElement & { initialScale?: number }).initialScale;
              if (initialScale && initialScale > 1 && zoomInRef.current) {
                zoomInRef.current(initialScale - 1);
              }
            }
          }, 300);
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => {
          // Store the zoomIn function in a ref for later use
          zoomInRef.current = zoomIn;
          
          return (
            <>
              <div className="absolute bottom-4 left-4 z-10 flex gap-2 bg-gray-900/70 p-1.5 rounded-md backdrop-blur-sm">
                <button 
                  onClick={() => zoomIn(0.5)} 
                  className="flex items-center justify-center w-8 h-8 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                  title="Zoom in"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <button 
                  onClick={() => zoomOut(0.5)} 
                  className="flex items-center justify-center w-8 h-8 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                  title="Zoom out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                  </svg>
                </button>
                <button 
                  onClick={() => resetTransform()} 
                  className="flex items-center justify-center w-8 h-8 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                  title="Reset view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    // Auto-center and fit the diagram
                    if (containerRef.current) {
                      const svgElement = containerRef.current.querySelector('svg');
                      if (svgElement) {
                        // Re-apply diagram adjustments
                        centerAndAdjustDiagram(svgElement as SVGElement);
                        
                        // Apply initial scale if it exists, otherwise reset to default
                        const initialScale = (containerRef.current as HTMLDivElement & { initialScale?: number }).initialScale || 1;
                        resetTransform();
                        
                        // If we have a stored initial scale > 1, apply it after a short delay
                        if (initialScale > 1) {
                          setTimeout(() => {
                            zoomIn(initialScale - 1);
                          }, 100);
                        }
                      }
                    }
                  }} 
                  className="flex items-center justify-center w-8 h-8 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                  title="Fit to view"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <TransformComponent 
                wrapperStyle={{ 
                  width: "100%", 
                  height: "100vh",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "grab",
                }}
                contentStyle={{ 
                  width: "100%", 
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  ref={containerRef}
                  className="w-full h-full bg-black text-white p-4 flex justify-center items-center"
                  style={{ 
                    minHeight: "80vh",
                    position: "relative",
                  }}
                />
              </TransformComponent>
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
}
