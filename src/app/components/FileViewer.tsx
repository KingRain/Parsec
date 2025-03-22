"use client";

import { useState } from 'react';

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

    const fetchDirectoryContents = async (path: string) => {
        setLoading(true);
        try {
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`);
            
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
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`);
            
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
                const contentResponse = await fetch(fileData.download_url);
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

    return (
        <div className="mt-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded mb-4">
                <span 
                    className="text-blue-600 cursor-pointer hover:underline"
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
                        <span className="text-gray-500 mx-1">/</span>
                        <span 
                            className="text-blue-600 cursor-pointer hover:underline"
                            onClick={() => navigateToPath(index)}
                        >
                            {segment}
                        </span>
                    </span>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {/* File List */}
                    {!fileContent && (
                        <div className="border rounded-lg overflow-hidden">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                    onClick={() => handleFileClick(file)}
                                >
                                    {file.type === 'dir' ? (
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <div className="mb-4">
                                <button
                                    className="text-blue-600 hover:underline flex items-center gap-2"
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
        </div>
    );
}