import { getGitHubFetchOptions } from './githubAuth';

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
 * Attempts to find and fetch package.json from a repository
 * First checks root, then searches for it if not found
 */
export const detectAndFetchPackageJson = async (repoOwner: string, repoName: string) => {
  try {
    // First, try to fetch package.json from the root
    console.log(`Checking root for package.json in ${repoOwner}/${repoName}`);
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/package.json`,
      {
        ...getGitHubFetchOptions(),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const content = atob(data.content.replace(/\n/g, ''));
      return JSON.parse(content);
    }
    
    // If not found in root, search for it
    console.log(`Searching for package.json in ${repoOwner}/${repoName}`);
    const searchResults = await searchForFile(repoOwner, repoName, 'package.json');
    
    if (searchResults.length > 0) {
      const packageJsonPath = searchResults[0].path;
      console.log(`Found package.json at ${packageJsonPath}`);
      
      const packageController = new AbortController();
      const packageTimeoutId = setTimeout(() => packageController.abort(), 10000);
      
      const packageResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${packageJsonPath}`,
        {
          ...getGitHubFetchOptions(),
          signal: packageController.signal
        }
      );
      
      clearTimeout(packageTimeoutId);
      
      if (packageResponse.ok) {
        const packageData = await packageResponse.json();
        const content = atob(packageData.content.replace(/\n/g, ''));
        return JSON.parse(content);
      }
    }
    
    console.log(`No package.json found in ${repoOwner}/${repoName}`);
    return null;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Fetching package.json timed out for ${repoOwner}/${repoName}`);
    } else {
      console.error(`Failed to fetch package.json for ${repoOwner}/${repoName}:`, error);
    }
    return null;
  }
};

/**
 * Helper function to recursively search for a file in a GitHub repository
 */
export const searchForFile = async (repoOwner: string, repoName: string, fileName: string, path = '', depth = 0) => {
  const results: Array<{ path: string; name: string; type: string }> = [];
  
  // Prevent infinite recursion by limiting depth
  if (depth > 3) {
    return results;
  }
  
  try {
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
      {
        ...getGitHubFetchOptions(),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const items = await response.json();
      
      // Handle case where API returns an object instead of an array
      const itemsArray = Array.isArray(items) ? items : [items];
      
      for (const item of itemsArray) {
        if (item.type === 'file' && item.name === fileName) {
          results.push(item);
          // Once we find a match, return immediately to speed up the search
          return results;
        } else if (item.type === 'dir') {
          // Only search common directories that might contain package.json
          if (fileName === 'package.json' && 
              !['node_modules', 'dist', 'build', '.git', 'public', 'assets'].includes(item.name)) {
            const nestedResults = await searchForFile(repoOwner, repoName, fileName, item.path, depth + 1);
            results.push(...nestedResults);
            
            // If we found a match in a subdirectory, return immediately
            if (nestedResults.length > 0) {
              return results;
            }
          }
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`Search timed out for ${fileName} in ${path}`);
      } else {
        console.error(`Error searching for ${fileName} in ${path}:`, error);
      }
    } else {
      console.error(`Unknown error searching for ${fileName} in ${path}`);
    }
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
  
  // Process in parallel with a limit of 5 concurrent requests
  const concurrentLimit = 5;
  for (let i = 0; i < dependencies.length; i += concurrentLimit) {
    const batch = dependencies.slice(i, i + concurrentLimit);
    const promises = batch.map(async (dep) => {
      try {
        // Set up timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Try to get npm metadata
        const npmResponse = await fetch(`https://registry.npmjs.org/${dep.name}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (npmResponse.ok) {
          const npmData = await npmResponse.json();
          
          return {
            ...dep,
            description: npmData.description || '',
            homepage: npmData.homepage || (npmData.repository?.url ? npmData.repository.url.replace('git+', '').replace('.git', '') : ''),
            // Limit logo fetching time
            logoUrl: await findPackageLogo(dep.name)
          };
        }
        return dep;
      } catch (error: unknown) {
        console.error(`Error fetching metadata for ${dep.name}:`, error);
        return dep;
      }
    });
    
    const results = await Promise.all(promises);
    
    // Update the enriched dependencies with the results
    results.forEach((result, idx) => {
      if (result) {
        enrichedDependencies[i + idx] = result;
      }
    });
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
  
  // Set up timeout for logo fetching
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
  
  try {
    // Try each provider with a short timeout
    for (const logoUrl of logoProviders) {
      try {
        const response = await fetch(logoUrl, { 
          method: 'HEAD',
          signal: controller.signal 
        });
        
        if (response.ok) {
          clearTimeout(timeoutId);
          return logoUrl;
        }
      } catch {
        // Silently continue to next provider
      }
    }
    
    // Return default NPM icon if no logo found
    clearTimeout(timeoutId);
    return `https://img.shields.io/npm/v/${packageName}.svg`;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Logo fetch timed out for ${packageName}`);
    } else {
      console.error(`Error fetching logo for ${packageName}:`, error);
    }
    
    // Return default NPM icon on error
    return `https://img.shields.io/npm/v/${packageName}.svg`;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Fetchs descriptions for packages using an LLM API
 */
export const fetchLLMDescriptions = async (dependencies: Dependency[]): Promise<Dependency[]> => {
  const enrichedDependencies = [...dependencies];
  const packageNames = dependencies.map(d => d.name).join(',');
  
  if (packageNames.length === 0) {
    return dependencies;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch('/api/package-descriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        packages: packageNames
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Error fetching LLM descriptions: ${response.status} ${response.statusText}`);
      return enrichedDependencies;
    }
    
    const data = await response.json();
    
    if (data.success && data.descriptions) {
      // Update dependencies with descriptions
      Object.entries(data.descriptions).forEach(([name, description]) => {
        const index = enrichedDependencies.findIndex(d => d.name === name);
        if (index !== -1) {
          enrichedDependencies[index] = {
            ...enrichedDependencies[index],
            llmDescription: description as string
          };
        }
      });
    }
    
    return enrichedDependencies;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('LLM descriptions request timed out');
    } else {
      console.error('Error fetching LLM descriptions:', error);
    }
    return enrichedDependencies;
  }
}; 