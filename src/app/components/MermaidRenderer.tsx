"use client";

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  diagram: string;
  darkMode?: boolean;
}

export default function MermaidRenderer({ diagram, darkMode = true }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize mermaid with configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
      logLevel: 4, // Error level to reduce console noise
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
      },
    });

    const renderDiagram = async () => {
      if (!diagram) return;
      
      setIsRendering(true);
      setError(null);
      
      try {
        // Use mermaid API to render the diagram
        const { svg } = await mermaid.render('mermaid-diagram', diagram);
        setSvg(svg);
      } catch (err) {
        console.error('Failed to render Mermaid diagram:', err);
        setError('Failed to render diagram due to syntax errors in the diagram code.');
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [diagram, darkMode]);

  const handleDownload = () => {
    if (!svg) return;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isRendering) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-600'}`}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
            darkMode 
              ? 'bg-gray-700 text-green-400 hover:bg-gray-600' 
              : 'bg-gray-200 text-green-600 hover:bg-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download SVG
        </button>
      </div>
      
      <div 
        ref={containerRef}
        className={`overflow-auto rounded-lg p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
} 