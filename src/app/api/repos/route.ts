import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

export async function GET(req: NextRequest) {
    const cookieStore = cookies();
    const token = (await cookieStore).get("github_token")?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
    }

    try {
        const { data } = await axios.get("https://api.github.com/user/repos", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json'
            },
            params: {
                sort: 'updated',
                per_page: 100
            }
        });

        return NextResponse.json(data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            // Token expired or invalid
            (await
                // Token expired or invalid
                cookieStore).delete("github_token");
            return NextResponse.redirect(new URL('/?error=token_expired', req.url));
        }

        console.error("Error fetching repos:", error);
        return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }
}
