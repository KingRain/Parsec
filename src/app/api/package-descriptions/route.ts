import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { packages } = await request.json();
    
    if (!packages) {
      return NextResponse.json({ error: 'Packages list is required' }, { status: 400 });
    }
    
    // Simplified mock descriptions - always return immediately instead of processing
    const descriptions: Record<string, string> = {};
    
    // Split and trim package names
    const packageList = packages.split(',').map((pkg: string) => pkg.trim());
    
    // Standard descriptions for common packages
    const commonDescriptions: Record<string, string> = {
      'react': 'A JavaScript library for building user interfaces with a component-based architecture.',
      'react-dom': 'React package for working with the DOM, used to render React components to the DOM.',
      'next': 'React framework for production that enables server-side rendering and static site generation.',
      'axios': 'Promise based HTTP client for the browser and Node.js with an easy-to-use API.',
      'express': 'Fast, unopinionated, minimalist web framework for Node.js for building web applications and APIs.',
      'tailwindcss': 'A utility-first CSS framework for rapidly building custom user interfaces.',
      'typescript': 'A typed superset of JavaScript that compiles to plain JavaScript for improved developer experience.',
      'eslint': 'A pluggable and configurable linter tool for identifying and fixing problems in JavaScript code.',
      'dotenv': 'Zero-dependency module that loads environment variables from a .env file into process.env.',
      'cors': 'Node.js package for providing a Connect/Express middleware that enables CORS.',
      'cookie-parser': 'Parse Cookie header and populate req.cookies with an object keyed by the cookie names.',
      '@types/react': 'TypeScript type definitions for React.',
      '@types/node': 'TypeScript type definitions for Node.js.',
      'postcss': 'Tool for transforming CSS with JavaScript plugins.',
      'autoprefixer': 'Plugin to parse CSS and add vendor prefixes to CSS rules.',
    };
    
    // Create descriptions for each package in the list
    packageList.forEach((pkg: string) => {
      descriptions[pkg] = commonDescriptions[pkg] || `Package ${pkg} for JavaScript/TypeScript development.`;
    });
    
    return NextResponse.json({ descriptions });
  } catch (error) {
    console.error('Error processing package descriptions:', error);
    // Even in case of error, return some basic data
    return NextResponse.json({ 
      descriptions: {}, 
      error: 'Failed to process package descriptions, but analysis can continue' 
    }, { status: 200 });
  }
} 