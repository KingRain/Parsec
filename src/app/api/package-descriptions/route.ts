import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { packages } = await request.json();
    
    if (!packages) {
      return NextResponse.json({ error: 'Packages list is required' }, { status: 400 });
    }
    
    // Mock response for demo - in production, replace with actual LLM API call
    const descriptions: Record<string, string> = {};
    
    const packageList = packages.split(',').map((pkg: string) => pkg.trim());
    
    // Generate mock descriptions
    packageList.forEach((pkg: string) => {
      const mockDescriptions: Record<string, string> = {
        'react': 'A JavaScript library for building user interfaces with a component-based architecture.',
        'next': 'React framework for production that enables server-side rendering and static site generation.',
        'axios': 'Promise based HTTP client for the browser and Node.js with an easy-to-use API.',
        'express': 'Fast, unopinionated, minimalist web framework for Node.js for building web applications and APIs.',
        'tailwindcss': 'A utility-first CSS framework for rapidly building custom user interfaces.',
        'typescript': 'A typed superset of JavaScript that compiles to plain JavaScript for improved developer experience.',
        'eslint': 'A pluggable and configurable linter tool for identifying and fixing problems in JavaScript code.',
        'dotenv': 'Zero-dependency module that loads environment variables from a .env file into process.env.',
        'cors': 'Node.js package for providing a Connect/Express middleware that enables CORS.',
        'cookie-parser': 'Parse Cookie header and populate req.cookies with an object keyed by the cookie names.'
      };
      
      descriptions[pkg] = mockDescriptions[pkg] || `Package that provides functionality related to ${pkg}.`;
    });
    
    return NextResponse.json({ descriptions });
  } catch (error) {
    console.error('Error processing package descriptions:', error);
    return NextResponse.json({ error: 'Failed to process package descriptions' }, { status: 500 });
  }
} 