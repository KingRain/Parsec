"use client";

import { useState, useEffect } from 'react';
import TechStackViewer from './TechStackViewer';
import MermaidRenderer from './MermaidRenderer';
import { 
  detectAndFetchPackageJson, 
  extractDependencies, 
  fetchPackageMetadata,
  loadLogosForDependencies,
  fetchLLMDescriptions 
} from '../utils/dependencyAnalyzer';
import { getGitHubFetchOptions } from '../utils/githubAuth';

interface FileViewerProps {
    repoOwner: string;
    repoName: string;
}

interface FileItem {
    name: string;
    type: string;
    path: string;
}

interface Dependency {
  name: string;
  version: string;
  type: string;
  description?: string;
  homepage?: string;
  logoUrl?: string;
  llmDescription?: string;
}

export default function FileViewer({ repoOwner, repoName }: FileViewerProps) {
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [fileContent, setFileContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [dependencies, setDependencies] = useState<Dependency[]>([]);
    const [showTechStack, setShowTechStack] = useState(false);
    const [loadingTechStack, setLoadingTechStack] = useState(false);
    const [darkMode, setDarkMode] = useState(true);
    
    // New state for diagram generation
    const [currentFileName, setCurrentFileName] = useState<string>('');
    const [currentFileType, setCurrentFileType] = useState<string>('');
    const [mermaidDiagram, setMermaidDiagram] = useState<string>('');
    const [showDiagram, setShowDiagram] = useState(false);
    const [generatingDiagram, setGeneratingDiagram] = useState(false);
    const [diagramError, setDiagramError] = useState<string | null>(null);

    // Fetch repository contents immediately when component mounts
    useEffect(() => {
        if (repoOwner && repoName) {
            fetchDirectoryContents('');
        }
    }, [repoOwner, repoName]);

    const fetchDirectoryContents = async (path: string) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
                getGitHubFetchOptions()
            );
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            setFiles(data);
        } catch (error) {
            console.error('Failed to fetch repository contents:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFileContent = async (path: string, fileName: string) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
                getGitHubFetchOptions()
            );
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const fileData = await response.json();
            
            if (fileData.size > 1000000) {
                alert('File is too large to display (>1MB)');
                return;
            }
            
            // Get file extension for determining file type
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
            setCurrentFileName(fileName);
            setCurrentFileType(fileExtension);
            
            // Reset diagram state when loading a new file
            setMermaidDiagram('');
            setShowDiagram(false);
            setDiagramError(null);
            
            if (fileData.encoding === 'base64') {
                const content = atob(fileData.content.replace(/\n/g, ''));
                setFileContent(content);
            } else {
                const contentResponse = await fetch(
                    fileData.download_url,
                    getGitHubFetchOptions()
                );
                const content = await contentResponse.text();
                setFileContent(content);
            }
        } catch (error) {
            console.error('Failed to fetch file content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileClick = (file: FileItem) => {
        if (file.type === 'dir') {
            setCurrentPath([...currentPath, file.name]);
            fetchDirectoryContents(file.path);
            setFileContent('');
            setCurrentFileName('');
            setCurrentFileType('');
        } else {
            fetchFileContent(file.path, file.name);
        }
    };

    const navigateToPath = (index: number) => {
        const newPath = currentPath.slice(0, index + 1);
        setCurrentPath(newPath);
        fetchDirectoryContents(newPath.join('/'));
        setFileContent('');
    };

    const analyzeTechStack = async () => {
        setLoadingTechStack(true);
        try {
            // Add timeout for the entire operation
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Tech stack analysis timed out')), 30000)
            );
            
            // Step 1: Detect and fetch package.json
            const packageDataPromise = detectAndFetchPackageJson(repoOwner, repoName);
            
            // Race the package.json fetch with a timeout
            const packageData = await Promise.race([packageDataPromise, timeoutPromise]);
            
            if (!packageData) {
                alert('No package.json found in this repository');
                setLoadingTechStack(false);
                return;
            }
            
            // Step 2: Extract dependencies with basic data for immediate display
            const basicDeps = extractDependencies(packageData);
            
            if (basicDeps.length === 0) {
                alert('No dependencies found in package.json');
                setLoadingTechStack(false);
                return;
            }
            
            // Immediately show the basic dependencies with placeholder logos
            setDependencies(basicDeps);
            setShowTechStack(true);
            setLoadingTechStack(false);
            
            // Enhancement 1: Fetch metadata in background to add descriptions
            fetchPackageMetadata(basicDeps)
                .then(depsWithMetadata => {
                    setDependencies(depsWithMetadata);
                    
                    // Enhancement 2: Fetch LLM descriptions after metadata
                    fetchLLMDescriptions(depsWithMetadata)
                        .then(enrichedDeps => {
                            setDependencies(enrichedDeps);
                            
                            // Enhancement 3: Load logos last, after everything else is done
                            loadLogosForDependencies(enrichedDeps, updatedDeps => {
                                setDependencies([...updatedDeps]);
                            });
                        })
                        .catch(error => {
                            console.error('Error fetching descriptions:', error);
                            
                            // Still try to load logos even if descriptions failed
                            loadLogosForDependencies(depsWithMetadata, updatedDeps => {
                                setDependencies([...updatedDeps]);
                            });
                        });
                })
                .catch(error => {
                    console.error('Error fetching metadata:', error);
                    
                    // Try to load logos even if metadata failed
                    loadLogosForDependencies(basicDeps, updatedDeps => {
                        setDependencies([...updatedDeps]);
                    });
                });
        } catch (error) {
            console.error('Failed to analyze tech stack:', error);
            
            // If we have any dependencies extracted, show them even if there was an error
            if (dependencies.length > 0) {
                setShowTechStack(true);
            } else {
                alert('Failed to analyze tech stack. Please try again or try another repository.');
            }
            setLoadingTechStack(false);
        }
    };

    // New function to generate Mermaid diagrams
    const generateDiagram = async () => {
        if (!fileContent || generatingDiagram) return;
        
        setGeneratingDiagram(true);
        setDiagramError(null);
        
        try {
            const response = await fetch('/api/generate-diagram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileContent,
                    fileName: currentFileName,
                    fileType: currentFileType
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate diagram');
            }
            
            const data = await response.json();
            setMermaidDiagram(data.diagram);
            setShowDiagram(true);
        } catch (error) {
            console.error('Error generating diagram:', error);
            setDiagramError(error instanceof Error ? error.message : String(error));
        } finally {
            setGeneratingDiagram(false);
        }
    };

    return (
        <div className="mt-4 flex h-[calc(100vh-8rem)] bg-gray-900 text-gray-100">
            {/* Left Sidebar with File Explorer */}
            <div className="w-64 border-r border-gray-700 overflow-y-auto bg-gray-800">

                {/* File Tree */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                        </div>
                    ) : (
                        <div className="py-2">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer transition-colors duration-150 ease-in-out"
                                    onClick={() => handleFileClick(file)}
                                >
                                    <div className="flex items-center gap-2" style={{ paddingLeft: `${currentPath.length * 12}px` }}>
                                        {file.type === 'dir' ? (
                                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                        <span className="truncate text-gray-200">{file.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </button>

                <div className="flex gap-2">
                    {fileContent && !showTechStack && (
                        <button
                            className={`px-4 py-2 rounded flex items-center gap-2 ${
                                darkMode 
                                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                    : 'bg-purple-500 text-white hover:bg-purple-600'
                            } transition-colors`}
                            onClick={generateDiagram}
                            disabled={generatingDiagram}
                        >
                            {generatingDiagram ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Visualize Code
                                </>
                            )}
                        </button>
                    )}

                    <button
                        className={`px-4 py-2 rounded flex items-center gap-2 ${
                            darkMode 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        } transition-colors`}
                        onClick={analyzeTechStack}
                        disabled={loadingTechStack}
                    >
                        {loadingTechStack ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Analyze Tech Stack
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main content */}
            {showTechStack ? (
                <TechStackViewer 
                    dependencies={dependencies} 
                    onBack={() => setShowTechStack(false)} 
                />
            ) : (
                <>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div>
                            {/* Breadcrumb navigation */}
                            <div className={`flex items-center mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                <span 
                                    className={`cursor-pointer hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                                    onClick={() => {
                                        setCurrentPath([]);
                                        fetchDirectoryContents('');
                                        setFileContent('');
                                        setCurrentFileName('');
                                        setCurrentFileType('');
                                    }}
                                >
                                    {repoName}
                                </span>
                                
                                {currentPath.map((segment, index) => (
                                    <span key={index} className="flex items-center">
                                        <span className="mx-2">/</span>
                                        <span 
                                            className={`cursor-pointer hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                                            onClick={() => navigateToPath(index)}
                                        >
                                            {segment}
                                        </span>
                                    </span>
                                ))}
                            </div>
                            
                            {/* Show file list or file content */}
                            {fileContent ? (
                                <div>
                                    {showDiagram ? (
                                        <div className={`border rounded-lg p-4 ${
                                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'
                                        }`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold">
                                                    Code Visualization: {currentFileName}
                                                </h3>
                                                <div className="flex gap-2">
                                                    <button
                                                        className={`px-3 py-1 text-sm rounded ${
                                                            darkMode 
                                                                ? 'bg-gray-700 text-blue-400 hover:bg-gray-600' 
                                                                : 'bg-gray-200 text-blue-600 hover:bg-gray-300'
                                                        }`}
                                                        onClick={() => setShowDiagram(false)}
                                                    >
                                                        Show Code
                                                    </button>
                                                    <button
                                                        className={`px-3 py-1 text-sm rounded ${
                                                            darkMode 
                                                                ? 'bg-gray-700 text-purple-400 hover:bg-gray-600' 
                                                                : 'bg-gray-200 text-purple-600 hover:bg-gray-300'
                                                        }`}
                                                        onClick={generateDiagram}
                                                        disabled={generatingDiagram}
                                                    >
                                                        Regenerate
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {diagramError ? (
                                                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                                    <p>Failed to generate diagram: {diagramError}</p>
                                                </div>
                                            ) : (
                                                <MermaidRenderer 
                                                    diagram={mermaidDiagram} 
                                                    darkMode={darkMode} 
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`border rounded-lg p-4 ${
                                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'
                                        }`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold">
                                                    {currentFileName}
                                                </h3>
                                                {mermaidDiagram && (
                                                    <button
                                                        className={`px-3 py-1 text-sm rounded ${
                                                            darkMode 
                                                                ? 'bg-gray-700 text-purple-400 hover:bg-gray-600' 
                                                                : 'bg-gray-200 text-purple-600 hover:bg-gray-300'
                                                        }`}
                                                        onClick={() => setShowDiagram(true)}
                                                    >
                                                        Show Diagram
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mb-4">
                                                <button
                                                    className={`hover:underline flex items-center gap-2 ${
                                                        darkMode ? 'text-blue-400' : 'text-blue-600'
                                                    }`}
                                                    onClick={() => setFileContent('')}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                                    </svg>
                                                    Back to files
                                                </button>
                                            </div>
                                            <pre className="whitespace-pre-wrap font-mono text-sm">{fileContent}</pre>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                                    {files.map((file, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-center gap-2 p-2 cursor-pointer rounded ${
                                                darkMode 
                                                    ? 'hover:bg-gray-800' 
                                                    : 'hover:bg-gray-100'
                                            }`}
                                            onClick={() => handleFileClick(file)}
                                        >
                                            {file.type === 'dir' ? (
                                                <svg className={`w-5 h-5 ${
                                                    darkMode ? 'text-blue-400' : 'text-blue-600'
                                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                </svg>
                                            ) : (
                                                <svg className={`w-5 h-5 ${
                                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                            <span>{file.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Tech Stack Viewer Modal */}
            {showTechStack && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <TechStackViewer
                            dependencies={dependencies}
                            onBack={() => setShowTechStack(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}