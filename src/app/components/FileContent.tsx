"use client";

import { useState } from 'react';
import { getGitHubFetchOptions } from '../utils/githubAuth';

interface FileContentProps {
    repoOwner: string;
    repoName: string;
    filePath: string | null;
}

export default function FileContent({ repoOwner, repoName, filePath }: FileContentProps) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFileContent = async (path: string) => {
        setLoading(true);
        setError(null);
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
                throw new Error('File is too large to display (>1MB)');
            }
            
            let fileContent: string;
            if (fileData.encoding === 'base64') {
                fileContent = atob(fileData.content.replace(/\n/g, ''));
            } else {
                const contentResponse = await fetch(
                    fileData.download_url,
                    getGitHubFetchOptions()
                );
                fileContent = await contentResponse.text();
            }
            setContent(fileContent);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to fetch file content');
        } finally {
            setLoading(false);
        }
    };

    // Fetch content when filePath changes
    if (filePath && !loading && !content && !error) {
        fetchFileContent(filePath);
    }

    if (!filePath) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                Select a file to view its content
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto">
                {content}
            </pre>
        </div>
    );
}