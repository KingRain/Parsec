"use client";

import { useState, useEffect } from 'react';
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
    const [generatingDiagram, setGeneratingDiagram] = useState(false);
    const [mermaidDiagram, setMermaidDiagram] = useState<string>('');
    const [showDiagram, setShowDiagram] = useState(false);
    const [diagramError, setDiagramError] = useState<string | null>(null);
    const [currentFileName, setCurrentFileName] = useState<string>('');
    const [currentFileType, setCurrentFileType] = useState<string>('');

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

    const fetchFileContent = async (path: string) => {
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
            
            const fileName = path.split('/').pop() || '';
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
            setCurrentFileName(fileName);
            setCurrentFileType(fileExtension);
            
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
        } else {
            fetchFileContent(file.path);
        }
    };

    const navigateToPath = (index: number) => {
        const newPath = currentPath.slice(0, index + 1);
        setCurrentPath(newPath);
        fetchDirectoryContents(newPath.join('/'));
        setFileContent('');
    };

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
            
            if (data.fallback) {
                console.log('Using fallback diagram due to generation issues');
            }
            
            setMermaidDiagram(data.diagram);
            setShowDiagram(true);
            
            const diagramWindow = window.open('', '_blank');
            if (diagramWindow) {
                diagramWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Code Visualization: ${currentFileName}</title>
                        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
                        <style>
                            body { 
                                font-family: system-ui, sans-serif; 
                                background: #1e1e1e; 
                                color: #fff;
                                padding: 20px;
                            }
                            .mermaid {
                                display: flex;
                                justify-content: center;
                                background: #2d2d2d;
                                padding: 20px;
                                border-radius: 8px;
                                margin-top: 20px;
                            }
                            h1 {
                                font-size: 1.5rem;
                                margin-bottom: 20px;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>Code Visualization: ${currentFileName}</h1>
                        <div class="mermaid">
                            ${data.diagram}
                        </div>
                        <script>
                            mermaid.initialize({
                                startOnLoad: true,
                                theme: 'dark',
                                logLevel: 'error',
                                securityLevel: 'loose',
                                fontFamily: 'monospace'
                            });
                        </script>
                    </body>
                    </html>
                `);
                diagramWindow.document.close();
            }
        } catch (error) {
            console.error('Error generating diagram:', error);
            setDiagramError(error instanceof Error ? error.message : String(error));
            alert('Failed to generate diagram: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setGeneratingDiagram(false);
        }
    };

    return (
        <div className="flex h-screen bg-black text-gray-100">
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
                
                {fileContent && (
                    <div className="px-3 py-3 border-t border-gray-800">
                        <button
                            className="px-3 py-2 w-full bg-purple-700 hover:bg-purple-600 text-white rounded flex items-center justify-center gap-2 transition-colors"
                            onClick={generateDiagram}
                            disabled={generatingDiagram}
                        >
                            {generatingDiagram ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span>Visualize Code</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col">
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