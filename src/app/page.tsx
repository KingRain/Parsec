"use client";

export default function Home() {
    const handleLogin = () => {
        const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!clientId || !appUrl) {
            console.error("GitHub Client ID or App URL is missing. Check your .env file.");
            return;
        }

        const redirectUri = encodeURIComponent(`${appUrl}/api/auth/callback`);
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;

        window.location.href = authUrl;
    };

    return (
        <main className="flex justify-center items-center h-screen">
            <button
                onClick={handleLogin}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
                Login with GitHub
            </button>
        </main>
    );
}
