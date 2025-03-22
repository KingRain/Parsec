"use client";

import { useEffect, useRef, useState } from 'react';

interface MermaidRendererProps {
  diagram: string;
  darkMode?: boolean;
}

export default function MermaidRenderer({ diagram, darkMode = true }: MermaidRendererProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!diagram) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import('mermaid')).default;
        
        // Configure mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: darkMode ? 'dark' : 'default',
          securityLevel: 'loose',
          logLevel: 'error',
        });

        // Clear previous rendered diagram
        if (container.current) {
          container.current.innerHTML = '';
        }

        // Generate SVG
        const { svg } = await mermaid.render('mermaid-diagram', diagram);
        setSvgContent(svg);
      } catch (err) {
        console.error('Error rendering Mermaid diagram:', err);
        setError(`Failed to render diagram: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [diagram, darkMode]);

  // Function to download SVG
  const downloadSvg = () => {
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-current"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-600'}`}>
        <p className="font-mono text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={container} 
        className="mermaid-container overflow-auto py-4" 
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {svgContent && (
        <button
          onClick={downloadSvg}
          className={`absolute top-2 right-2 p-2 rounded-full ${
            darkMode 
              ? 'bg-gray-800 text-blue-400 hover:bg-gray-700' 
              : 'bg-white text-blue-600 hover:bg-gray-100'
          }`}
          title="Download diagram as SVG"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      )}
    </div>
  );
} 