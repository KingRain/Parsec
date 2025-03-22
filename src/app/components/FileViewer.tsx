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

    const getFileIcon = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const iconMap: { [key: string]: string } = {
            js: '📄',
            jsx: '⚛️',
            ts: '📘',
            tsx: '⚛️',
            py: '🐍',
            java: '☕',
            html: '🌐',
            css: '🎨',
            json: '📦',
            md: '📝',
            yml: '⚙️',
            yaml: '⚙️',
            // Add more file types as needed
        };
        return iconMap[extension || ''] || '📄';
    };

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
        <div className="flex h-screen bg-black text-gray-100">
            {/* Left Sidebar with File Explorer */}
            <div className="w-64 border-r border-gray-800 overflow-y-auto bg-black">
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
                                    className="flex items-center px-4 py-2 hover:bg-gray-900 cursor-pointer transition-colors duration-150 ease-in-out"
                                    onClick={() => handleFileClick(file)}
                                >
                                    <div className="flex items-center gap-2" style={{ paddingLeft: `${currentPath.length * 12}px` }}>
                                        <span className="w-6">
                                            {file.type === 'dir' ? '📁' : getFileIcon(file.name)}
                                        </span>
                                        <span className="truncate text-gray-200">{file.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Section - Breadcrumb Navigation */}
                <div className="p-4 border-b border-gray-800 bg-black">
                    <div className="flex items-center gap-2">
                        {currentPath.map((segment, index) => (
                            <span key={index} className="flex items-center">
                                {index > 0 && <span className="text-gray-500 mx-1">/</span>}
                                <span
                                    className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-150"
                                    onClick={() => navigateToPath(index)}
                                >
                                    {segment}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bottom Section - File Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-black">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                        </div>
                    ) : fileContent ? (
                        <div className="bg-black rounded-lg p-4 h-full">
                            <pre className="font-mono text-sm text-gray-200 whitespace-pre-wrap overflow-x-auto p-4 rounded">{fileContent}</pre>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}