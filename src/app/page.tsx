"use client";

import { InteractiveHoverButton } from "./components/magicui/interactive-hover-button";
import { GlobeEffect } from "./components/GlobeEffect";

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
        <main className="flex flex-col h-screen overflow-hidden">
            <GlobeEffect />
            
            <div className="absolute top-[60%] mt-40 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-md px-8">
                <div className="flex justify-center mt-8">
                    <InteractiveHoverButton
                        onClick={handleLogin}
                        className="w-full max-w-xs"
                    >
                        Sign in with GitHub
                    </InteractiveHoverButton>
                </div>
            </div>
        </main>
    );
}
