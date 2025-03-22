import { getGitHubFetchOptions } from '../utils/githubAuth';
interface GitHubFile {
    path: string;
    type: string;
    download_url?: string;
}

export const fetchRepoFiles = async (
    repoOwner: string,
    repoName: string,
    path: string = "",
    setLoading?: (loading: boolean) => void,
    setFiles?: (files: GitHubFile[]) => void
) => {
    if (setLoading) setLoading(true);
    
    try {
        const response = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
            getGitHubFetchOptions()
        );

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data: GitHubFile[] = await response.json();
        
        if (setFiles) {
            setFiles(data);
            return [];
        }

        let files: GitHubFile[] = [];
        for (const item of data) {
            if (item.type === "file") {
                files.push({ path: item.path, type: item.type, download_url: item.download_url });
            } else if (item.type === "dir") {
                const subFiles = await fetchRepoFiles(repoOwner, repoName, item.path);
                files = [...files, ...subFiles];
            }
        }
        return files;
    } catch (error) {
        console.error('Failed to fetch repository contents:', error);
        return [];
    } finally {
        if (setLoading) setLoading(false);
    }
};
