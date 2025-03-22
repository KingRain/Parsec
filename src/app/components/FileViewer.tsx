"use client";

import { useState, useEffect } from 'react';
import TechStackViewer from './TechStackViewer';
import { 
  detectAndFetchPackageJson, 
  extractDependencies, 
  fetchPackageMetadata, 
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
            
            // Step 2: Extract dependencies
            const extractedDeps = extractDependencies(packageData);
            
            if (extractedDeps.length === 0) {
                alert('No dependencies found in package.json');
                setLoadingTechStack(false);
                return;
            }
            
            // Step 3: Fetch logos and metadata (with 20 second timeout)
            const metadataPromise = fetchPackageMetadata(extractedDeps);
            const timeoutMetadata = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Metadata fetch timed out')), 20000)
            );
            
            let depsWithMetadata: Dependency[] = extractedDeps;
            try {
                depsWithMetadata = await Promise.race([metadataPromise, timeoutMetadata]);
            } catch (err) {
                console.error('Error fetching metadata:', err);
                // Continue with basic dependency information if metadata fetch fails
            }
            
            // Step 4: Get LLM descriptions (with 15 second timeout)
            let enrichedDeps: Dependency[] = depsWithMetadata;
            try {
                const descriptionPromise = fetchLLMDescriptions(depsWithMetadata);
                const timeoutDescription = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Description fetch timed out')), 15000)
                );
                
                enrichedDeps = await Promise.race([descriptionPromise, timeoutDescription]);
            } catch (err) {
                console.error('Error fetching descriptions:', err);
                // Continue without descriptions if that part fails
            }
            
            setDependencies(enrichedDeps);
            setShowTechStack(true);
        } catch (error) {
            console.error('Failed to analyze tech stack:', error);
            
            // If we have any dependencies extracted, show them even if there was an error
            if (dependencies.length > 0) {
                setShowTechStack(true);
            } else {
                alert('Failed to analyze tech stack. Please try again or try another repository.');
            }
        } finally {
            setLoadingTechStack(false);
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
                </div>

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

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Section - Breadcrumb Navigation */}
                <div className="p-4 border-b border-gray-700 bg-gray-800">
                    <div className="flex items-center gap-2">
                        <span
                            className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors duration-150"
                            onClick={() => {
                                setCurrentPath([]);
                                fetchDirectoryContents('');
                                setFileContent('');
                            }}
                        >
                            {repoName}
                        </span>
                        {currentPath.map((segment, index) => (
                            <span key={index} className="flex items-center">
                                <span className="text-gray-500 mx-1">/</span>
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
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                        </div>
                    ) : fileContent ? (
                        <div className="bg-gray-800 rounded-lg p-4 h-full shadow-lg">
                            <div className="mb-4">
                                <button
                                    className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-2 transition-colors duration-150"
                                    onClick={() => setFileContent('')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to files
                                </button>
                            </div>
                            <pre className="font-mono text-sm text-gray-200 whitespace-pre-wrap overflow-x-auto bg-gray-900 p-4 rounded">{fileContent}</pre>
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