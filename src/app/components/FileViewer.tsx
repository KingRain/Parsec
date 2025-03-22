"use client";

import { useState, useEffect } from 'react';
import TechStackViewer from './TechStackViewer';
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

    return (
        <div className={`mt-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
            {/* Top Bar with Theme Toggle and Tech Stack Analysis Button */}
            <div className="flex justify-between items-center mb-4">
                <button
                    className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-200 text-gray-600'}`}
                    onClick={() => setDarkMode(!darkMode)}
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {darkMode ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    )}
                </button>

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

            {/* Show either tech stack analysis or file browser */}
            {showTechStack ? (
                <TechStackViewer 
                    dependencies={dependencies} 
                    onBack={() => setShowTechStack(false)} 
                />
            ) : (
                <>
                    {/* Breadcrumb Navigation */}
                    <div className={`flex items-center gap-2 p-2 rounded mb-4 ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                        <span 
                            className={`cursor-pointer hover:underline ${
                                darkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}
                            onClick={() => {
                                setCurrentPath([]);
                                fetchDirectoryContents('');
                                setFileContent('');
                            }}
                        >
                            {repoName}
                        </span>
                        {currentPath.map((segment, index) => (
                            <span key={index}>
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                                    /
                                </span>
                                <span 
                                    className={`cursor-pointer hover:underline ml-1 ${
                                        darkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}
                                    onClick={() => navigateToPath(index)}
                                >
                                    {segment}
                                </span>
                            </span>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-4">
                            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                                darkMode ? 'border-white' : 'border-gray-900'
                            }`}></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {/* File List */}
                            {!fileContent && (
                                <div className={`border rounded-lg overflow-hidden ${
                                    darkMode ? 'border-gray-700' : ''
                                }`}>
                                    {files.map((file, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 border-b last:border-b-0 cursor-pointer flex items-center gap-2 ${
                                                darkMode 
                                                    ? 'border-gray-700 hover:bg-gray-800' 
                                                    : 'hover:bg-gray-50'
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

                            {/* File Content */}
                            {fileContent && (
                                <div className={`border rounded-lg p-4 ${
                                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'
                                }`}>
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
                    )}
                </>
            )}
        </div>
    );
}