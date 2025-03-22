"use client";

import { useState, useEffect } from 'react';
import { getGitHubFetchOptions } from '../utils/githubAuth';

interface FileTreeProps {
    repoOwner: string;
    repoName: string;
    onFileSelect: (path: string) => void;
}

interface TreeItem {
    name: string;
    path: string;
    type: string;
    children?: TreeItem[];
}

export default function FileTree({ repoOwner, repoName, onFileSelect }: FileTreeProps) {
    const [tree, setTree] = useState<TreeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRepositoryTree('');
    }, [repoOwner, repoName]);

    const fetchRepositoryTree = async (path: string) => {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
                getGitHubFetchOptions()
            );

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const items = Array.isArray(data) ? data : [data];
            
            const treeItems = items.map((item: any) => ({
                name: item.name,
                path: item.path,
                type: item.type,
                children: item.type === 'dir' ? [] : undefined
            }));

            if (path === '') {
                setTree(treeItems);
            }
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch repository contents');
            setLoading(false);
        }
    };

    const TreeNode = ({ item }: { item: TreeItem }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const [children, setChildren] = useState<TreeItem[]>([]);
        const [isLoading, setIsLoading] = useState(false);

        const toggleExpand = async () => {
            if (item.type === 'dir') {
                setIsExpanded(!isExpanded);
                if (!isExpanded && children.length === 0) {
                    setIsLoading(true);
                    try {
                        const response = await fetch(
                            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${item.path}`,
                            getGitHubFetchOptions()
                        );
                        if (!response.ok) throw new Error('Failed to fetch directory contents');
                        
                        const data = await response.json();
                        const items = data.map((child: any) => ({
                            name: child.name,
                            path: child.path,
                            type: child.type,
                            children: child.type === 'dir' ? [] : undefined
                        }));
                        setChildren(items);
                    } catch (err) {
                        console.error('Error fetching directory contents:', err);
                    }
                    setIsLoading(false);
                }
            } else {
                onFileSelect(item.path);
            }
        };

        return (
            <div className="pl-4">
                <div 
                    className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
                    onClick={toggleExpand}
                >
                    {item.type === 'dir' ? (
                        <svg 
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    ) : (
                        <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                    )}
                    <span className="text-sm">{item.name}</span>
                    {isLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                    )}
                </div>
                {isExpanded && children.length > 0 && (
                    <div className="border-l border-gray-200 dark:border-gray-700 ml-2">
                        {children.map((child, index) => (
                            <TreeNode key={`${child.path}-${index}`} item={child} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

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
            {tree.map((item, index) => (
                <TreeNode key={`${item.path}-${index}`} item={item} />
            ))}
        </div>
    );
}