"use client";

import { cookies } from 'next/headers';
import axios from 'axios';

export async function getAuthenticatedUser() {
    const cookieStore = cookies();
    const token = (await cookieStore).get('github_token');

    if (!token) {
        throw new Error('No authentication token found');
    }

    try {
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${token.value}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Failed to fetch authenticated user:', error);
        throw new Error('Failed to fetch authenticated user');
    }
}