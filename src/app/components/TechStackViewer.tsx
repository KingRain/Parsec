"use client";

import { useState, useEffect } from 'react';

interface Dependency {
  name: string;
  version: string;
  type: string;
  description?: string;
  homepage?: string;
  logoUrl?: string;
  llmDescription?: string;
}

interface TechStackViewerProps {
  dependencies: Dependency[];
  onBack: () => void;
}

export default function TechStackViewer({ dependencies, onBack }: TechStackViewerProps) {
  const [selectedDep, setSelectedDep] = useState<Dependency | null>(null);
  const [groupedDeps, setGroupedDeps] = useState<Record<string, Dependency[]>>({});

  useEffect(() => {
    // Group dependencies by type
    const grouped: Record<string, Dependency[]> = {};
    dependencies.forEach(dep => {
      if (!grouped[dep.type]) {
        grouped[dep.type] = [];
      }
      grouped[dep.type].push(dep);
    });
    setGroupedDeps(grouped);
  }, [dependencies]);

  const dependencyTypes = {
    'dependencies': 'Production Dependencies',
    'devDependencies': 'Development Dependencies',
    'peerDependencies': 'Peer Dependencies',
    'optionalDependencies': 'Optional Dependencies'
  };

  return (
    <div className="text-white">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to files
        </button>
        <h2 className="text-2xl font-bold ml-4">Tech Stack Analysis</h2>
      </div>

      {Object.entries(dependencyTypes).map(([type, label]) => {
        const deps = groupedDeps[type] || [];
        if (deps.length === 0) return null;

        return (
          <div key={type} className="mb-8">
            <h3 className="text-xl font-semibold mb-3 text-gray-300">{label} ({deps.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {deps.map(dep => (
                <div
                  key={dep.name}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-700 transition-all cursor-pointer"
                  onClick={() => setSelectedDep(dep)}
                >
                  <div className="w-16 h-16 flex items-center justify-center mb-2 bg-gray-900 rounded-full p-2">
                    <img
                      src={dep.logoUrl || 'https://raw.githubusercontent.com/npm/logos/master/npm%20logo/npm-logo-red.png'}
                      alt={`${dep.name} logo`}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).onerror = null;
                        (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/npm/logos/master/npm%20logo/npm-logo-red.png';
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <h4 className="font-medium truncate max-w-full" title={dep.name}>{dep.name}</h4>
                    <p className="text-xs text-gray-400">{dep.version}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal for package details */}
      {selectedDep && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-gray-900 rounded-lg p-2">
                  <img
                    src={selectedDep.logoUrl || 'https://raw.githubusercontent.com/npm/logos/master/npm%20logo/npm-logo-red.png'}
                    alt={`${selectedDep.name} logo`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/npm/logos/master/npm%20logo/npm-logo-red.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedDep.name}</h3>
                  <p className="text-sm text-gray-400">Version: {selectedDep.version}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDep(null)}
                className="text-gray-400 hover:text-white"
                aria-label="Close package details"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-1 text-gray-300">Description:</h4>
              <p className="text-gray-200">{selectedDep.llmDescription || selectedDep.description || 'No description available'}</p>
            </div>

            {selectedDep.homepage && (
              <div className="mb-4">
                <h4 className="font-semibold mb-1 text-gray-300">Homepage:</h4>
                <a
                  href={selectedDep.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {selectedDep.homepage}
                </a>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-1 text-gray-300">Used as {(dependencyTypes as any)[selectedDep.type].toLowerCase()}</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 