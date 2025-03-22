import axios from 'axios';

interface Dependency {
  name: string;
  version: string;
  type: string;
  description?: string;
  homepage?: string;
  logoUrl?: string;
  llmDescription?: string;
}

/**
 * Detects and fetches package.json from a GitHub repository
 */
export const detectAndFetchPackageJson = async (repoOwner: string, repoName: string) => {
  try {
    // First, check if package.json exists at the root level
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/package.json`);
    
    if (response.ok) {
      const data = await response.json();
      const content = atob(data.content.replace(/\n/g, ''));
      return JSON.parse(content);
    }
    
    // If not found at root, search for it
    const files = await searchForFile(repoOwner, repoName, 'package.json');
    if (files.length > 0) {
      // Get the first package.json found
      const fileResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${files[0].path}`
      );
      const fileData = await fileResponse.json();
      const content = atob(fileData.content.replace(/\n/g, ''));
      return JSON.parse(content);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to fetch package.json:', error);
    return null;
  }
};

/**
 * Helper function to recursively search for a file in a GitHub repository
 */
export const searchForFile = async (repoOwner: string, repoName: string, fileName: string, path = '') => {
  const results: Array<{ path: string; name: string; type: string }> = [];
  
  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`);
    
    if (response.ok) {
      const items = await response.json();
      
      for (const item of items) {
        if (item.type === 'file' && item.name === fileName) {
          results.push(item);
        } else if (item.type === 'dir') {
          const nestedResults = await searchForFile(repoOwner, repoName, fileName, item.path);
          results.push(...nestedResults);
        }
      }
    }
  } catch (error) {
    console.error(`Error searching for ${fileName}:`, error);
  }
  
  return results;
};

/**
 * Extracts dependencies from package.json
 */
export const extractDependencies = (packageJson: any): Dependency[] => {
  if (!packageJson) return [];
  
  const deps: Dependency[] = [];
  
  // Collect from different dependency types
  const dependencyTypes = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'
  ];
  
  dependencyTypes.forEach(type => {
    if (packageJson[type]) {
      Object.entries(packageJson[type]).forEach(([name, version]) => {
        deps.push({
          name,
          version: version as string,
          type
        });
      });
    }
  });
  
  return deps;
};

/**
 * Fetches package metadata including logos for each dependency
 */
export const fetchPackageMetadata = async (dependencies: Dependency[]): Promise<Dependency[]> => {
  const enrichedDependencies = [...dependencies];
  
  for (let i = 0; i < dependencies.length; i++) {
    const dep = dependencies[i];
    
    try {
      // Try to get npm metadata
      const npmResponse = await fetch(`https://registry.npmjs.org/${dep.name}`);
      
      if (npmResponse.ok) {
        const npmData = await npmResponse.json();
        
        enrichedDependencies[i] = {
          ...dep,
          description: npmData.description || '',
          homepage: npmData.homepage || (npmData.repository?.url ? npmData.repository.url.replace('git+', '').replace('.git', '') : ''),
          logoUrl: await findPackageLogo(dep.name)
        };
      }
    } catch (e) {
      console.error(`Error fetching metadata for ${dep.name}:`, e);
      // Keep the original dependency data
    }
  }
  
  return enrichedDependencies;
};

/**
 * Attempts to find a logo for a package from various sources
 */
export const findPackageLogo = async (packageName: string): Promise<string> => {
  // Format package name for simple-icons
  const simplifiedName = packageName
    .replace(/@/g, '')
    .replace(/\//g, '-')
    .toLowerCase();
  
  // Various logo providers to try
  const logoProviders = [
    `https://cdn.jsdelivr.net/npm/${packageName}/logo.png`,
    `https://unpkg.com/${packageName}/logo.png`,
    `https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/${simplifiedName}.svg`,
    `https://img.shields.io/npm/v/${packageName}.svg`
  ];
  
  // Try each provider
  for (const logoUrl of logoProviders) {
    try {
      const response = await fetch(logoUrl, { method: 'HEAD' });
      if (response.ok) {
        return logoUrl;
      }
    } catch (e) {
      // Continue to next provider
    }
  }
  
  // Return default npm logo if none found
  return 'https://raw.githubusercontent.com/npm/logos/master/npm%20logo/npm-logo-red.png';
};

/**
 * Fetches descriptions from LLM for the dependencies
 */
export const fetchLLMDescriptions = async (dependencies: Dependency[]): Promise<Dependency[]> => {
  // Group dependencies to reduce API calls (10 at a time)
  const chunks: Dependency[][] = [];
  for (let i = 0; i < dependencies.length; i += 10) {
    chunks.push(dependencies.slice(i, i + 10));
  }
  
  const enrichedDependencies = [...dependencies];
  
  for (const chunk of chunks) {
    const depNames = chunk.map(dep => dep.name).join(',');
    
    try {
      const response = await fetch('/api/package-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packages: depNames })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Match descriptions to the original dependencies
        if (data.descriptions) {
          for (const [name, description] of Object.entries(data.descriptions)) {
            const depIndex = enrichedDependencies.findIndex(dep => dep.name === name);
            if (depIndex !== -1) {
              enrichedDependencies[depIndex].llmDescription = description as string;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch LLM descriptions:', error);
    }
  }
  
  return enrichedDependencies;
}; 