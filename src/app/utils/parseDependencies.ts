/* eslint-disable @typescript-eslint/no-explicit-any */


export const parseDependencies = async (files: any[]) => {
    const dependencies: any[] = [];
  
    for (const file of files) {
      if (file.path.endsWith(".js") || file.path.endsWith(".jsx") || file.path.endsWith(".ts") || file.path.endsWith(".tsx")) {
        const response = await fetch(file.url);
        const content = await response.text();
  
        const imports = content.match(/import\s+.*\s+from\s+['"](.*)['"]/g) || [];
        imports.forEach((imp) => {
          const match = imp.match(/['"](.*)['"]/);
          if (match) {
            dependencies.push({ source: file.path, target: match[1] });
          }
        });
      }
    }
    return dependencies;
  };
  