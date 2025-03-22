"use client";

import { useEffect, useState } from "react";
import FileViewer from "../components/FileViewer";

interface Repository {
    id: number;
    name: string;
    owner: {
        login: string;
    };
}

export default function Dashboard() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

    useEffect(() => {
        const fetchRepos = async () => {
            const response = await fetch("/api/repos");
            if (response.ok) {
                const data = await response.json();
                setRepos(data);
            }
            setLoading(false);
        };
        fetchRepos();
    }, []);

    const handleRepoClick = (repo: Repository) => {
        setSelectedRepo(repo);
    };

    return (
        <main className="p-4">
            <h1 className="text-2xl font-bold mb-6">Your Repositories</h1>
            
            {loading ? (
                <p>Loading...</p>
            ) : selectedRepo ? (
                <div>
                    <button
                        onClick={() => setSelectedRepo(null)}
                        className="mb-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to repositories
                    </button>
                    <FileViewer
                        repoOwner={selectedRepo.owner.login}
                        repoName={selectedRepo.name}
                    />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {repos.map((repo) => (
                        <div
                            key={repo.id}
                            onClick={() => handleRepoClick(repo)}
                            className="p-4 border rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                        >
                            <h3 className="font-semibold text-lg">{repo.name}</h3>
                            <p className="text-sm text-gray-600">{repo.owner.login}</p>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
