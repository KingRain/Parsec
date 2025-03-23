/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  const repo = url.searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner or repo parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`);
    if (!response.ok) {
      throw new Error('Failed to fetch language data');
    }

    const data = await response.json();
    const total = Object.values(data).reduce((sum: number, bytes: unknown) => sum + (bytes as number), 0);
    
    // Calculate percentages and prepare the response
    const languages = Object.entries(data).map(([name, bytes]: [string, any]) => ({
      name,
      percentage: ((bytes / total) * 100).toFixed(1),
      bytes,
      color: getLanguageColor(name)
    }));

    // Sort by percentage in descending order
    languages.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

    return NextResponse.json(languages);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch language data' }, { status: 500 });
  }
}

// Common programming language colors
function getLanguageColor(language: string): string {
  const colors: { [key: string]: string } = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Vue: '#41b883',
    PHP: '#4F5D95',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
  };

  return colors[language] || '#858585';
}