"use client";

import FileViewer from '@/app/components/FileViewer';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;
    const projectName = params.projectName as string;

    const handleRefresh = () => {
        router.refresh();
    };

    return (
        <main className="min-h-screen w-full h-full p-8">
            <h1 
                className="text-2xl font-bold mb-6 cursor-pointer hover:text-gray-600"
                onClick={handleRefresh}
            >
                {projectName}
            </h1>
            <FileViewer
                repoOwner={username}
                repoName={projectName}
            />
        </main>
    );
}