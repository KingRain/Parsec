"use client";

import { useEffect, useState } from "react";

interface Repository {
    id: number;
    name: string;
}

export default function Dashboard() {
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <main className="p-4">
            <h1 className="text-2xl font-bold">Your Repositories</h1>
                    {repos.map((repo: Repository) => (
                        <li key={repo.id} className="p-2 border-b">{repo.name}</li>
                    ))}
            {loading ? <p>Loading...</p> : (
                <ul>
                    {repos.map((repo: Repository) => (
                        <li key={repo.id} className="p-2 border-b">{repo.name}</li>
                    ))}
                </ul>
            )}
        </main>
    );
}
