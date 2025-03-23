"use client";

import { useEffect, useState } from "react";
import FileViewer from "../components/FileViewer";
import { MagicCard } from "@/components/magicui/magic-card";

interface Repository {
    id: number;
    name: string;
    owner: {
        login: string;
    };
    stargazers_count: number;
    description: string | null;
}

export default function Dashboard() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

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
        window.location.href = `/${repo.owner.login}/${repo.name}`;
    };

    const filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.owner.login.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div>
                    <div className="max-w-xl mx-auto mb-8">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-200"
                            />
                            <svg
                                className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredRepos.map((repo) => (
                            <div 
                                key={repo.id} 
                                onClick={() => handleRepoClick(repo)} 
                                className="rounded-lg border border-white/20 relative group overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white opacity-0 transform -translate-x-full group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"></div>
                                <MagicCard 
                                    gradientSize={150}
                                    gradientColor="#262626" 
                                    gradientFrom="#9E7AFF"
                                    gradientTo="#FE8BBB"
                                    gradientOpacity={0.8}
                                    className="h-full p-4 cursor-pointer"
                                >
                                    <div className="p-4">
                                        <h3 className="font-semibold text-lg">{repo.name}</h3>
                                        <p className="text-sm text-gray-600">{repo.owner.login}</p>
                                        <div className="flex items-center mt-2 text-yellow-500">
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span className="text-sm">{repo.stargazers_count}</span>
                                        </div>
                                        {repo.description && (
                                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{repo.description}</p>
                                        )}
                                    </div>
                                </MagicCard>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}