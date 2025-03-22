"use client";

import FileViewer from '@/app/components/FileViewer';
import { useParams } from 'next/navigation';

export default function ProjectPage() {
    const params = useParams();
    const username = params.username as string;
    const projectName = params.projectName as string;

    return (
        <main className="min-h-screen w-full h-full pt-4">
            <h1 className="text-2xl font-bold mb-6">{projectName}</h1>
            <FileViewer
                repoOwner={username}
                repoName={projectName}
            />
        </main>
    );
}