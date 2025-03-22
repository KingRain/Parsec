import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        console.error("❌ No code received from GitHub.");
        return NextResponse.redirect(new URL('/?error=no_code', req.url));
    }

    try {
        console.log("🔍 Attempting GitHub OAuth with code:", code);
        const response = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
                client_secret: process.env.NEXT_PUBLIC_GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`  // Added missing slash
            },
            { 
                headers: { 
                    Accept: "application/json",
                    'Content-Type': 'application/json'
                } 
            }
        );

        console.log("📦 Raw GitHub Response:", response.data);

        const { access_token, error_description } = response.data;

        if (error_description) {
            console.error("❌ GitHub Error Description:", error_description);
            return NextResponse.redirect(new URL(`/?error=${error_description}`, req.url));
        }

        if (!access_token) {
            console.error("❌ No access token in response:", response.data);
            return NextResponse.redirect(new URL('/?error=no_token', req.url));
        }

        console.log("✅ Successfully received access token");
        
        (await cookies()).set("github_token", response.data.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
        });

        return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ OAuth error details:", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        }
        return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
    }
}