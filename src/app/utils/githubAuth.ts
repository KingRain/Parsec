/**
 * Utility functions for GitHub API authentication
 */

/**
 * Gets the Authorization header for GitHub API requests
 * Uses Basic Auth with client ID and client secret
 */
export const getGitHubAuthHeader = (): string => {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_GITHUB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.warn('GitHub credentials not found in environment variables');
    return '';
  }
  
  // Use Basic Auth with client ID and secret
  // This increases rate limits from 60 to 5,000 requests per hour
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${auth}`;
};

/**
 * Returns the fetch options with GitHub auth headers
 */
export const getGitHubFetchOptions = (): RequestInit => {
  const authHeader = getGitHubAuthHeader();
  
  return {
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      Accept: 'application/vnd.github.v3+json'
    }
  };
}; 