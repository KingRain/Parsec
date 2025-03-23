import { useState } from 'react';

interface DiagramControlsProps {
  fileContent: string;
  fileName: string;
  fileType: string;
  onDiagramGenerated: (diagram: string) => void;
}

export default function DiagramControls({
  fileContent,
  fileName,
  fileType,
  onDiagramGenerated
}: DiagramControlsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDiagram = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent,
          fileName,
          fileType
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate diagram');
      }
      
      const data = await response.json();
      
      if (data.fallback) {
        console.log('Using fallback diagram due to generation issues');
        setError('Using simplified diagram due to generation issues');
      }
      
      onDiagramGenerated(data.diagram);
    } catch (err) {
      console.error('Error generating diagram:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={generateDiagram}
        disabled={loading}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-md flex items-center gap-1.5 hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Diagram
          </>
        )}
      </button>
      
      {error && (
        <div className="text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
} 