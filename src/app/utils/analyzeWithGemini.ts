import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google AI SDK
const genAI = new GoogleGenerativeAI("AIzaSyDTlyP33hmBQ_y-LFIdZbWd7MVtm0U93JQ");

export const analyzeWithGemini = async (
  repoOwner: string,
  repoName: string,
  files: { path: string }[],
  detailLevel: 'simple' | 'detailed' = 'simple'
): Promise<string> => {
  if (!Array.isArray(files) || files.length === 0) {
    return `flowchart TD
      Error["Invalid input: expected array of file paths"]`;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });

  // Only pass file paths without fetching content
  const filePaths = files.map(file => file.path).join("\n");

  const simplePrompt = `
You are an expert code architecture analyst tasked with predicting application structure based ONLY on file paths and names.

**IMPORTANT RULES:**
1. Create a Mermaid flowchart using **flowchart TD** (top-down) format
2. PREDICT the architecture WITHOUT seeing the actual code content:
   - Infer components, services, utilities, etc. from file names/paths
   - Create logical groupings based on folder structure
   - Make educated guesses about relationships and data flow
3. Use EXTREMELY SIMPLE and VALID Mermaid syntax:
   - "flowchart TD" must be on its first line
   - Keep node IDs simple: use alphanumeric IDs without spaces (e.g., "Frontend" not "Frontend App")
   - Use simple, properly formatted node labels with DOUBLE QUOTES: Frontend["Frontend Components"]
   - DO NOT use nested subgraphs - keep the structure flat and simple
   - Use VERY SIMPLE node and edge declarations
4. FOLLOW THIS EXACT FORMAT:
   flowchart TD
     A["Node A"]
     B["Node B"]
     C["Node C"]
     A --> B
     B --> C

5. Your response MUST be valid, simple Mermaid syntax ONLY
6. Use only ONE set of brackets for nodes: Node1["Label"]
7. DO NOT use quotation marks inside node labels

**File Paths to Analyze:**
${filePaths}

Keep your diagram SIMPLE. It's better to have a basic diagram that works than a complex one with syntax errors.
`;

  const detailedPrompt = `
You are an expert code architecture analyst tasked with creating a comprehensive and detailed application structure diagram based ONLY on file paths and names.

**IMPORTANT RULES:**
1. Create a Mermaid flowchart using **flowchart TD** (top-down) format
2. PREDICT the architecture in DETAIL WITHOUT seeing the actual code content:
   - Thoroughly analyze file names/paths to identify components, services, utilities
   - Create detailed logical groupings based on folder structure
   - Make comprehensive predictions about relationships, data flow, and dependencies
   - Identify potential design patterns from the file organization
   - Include more nodes and connections to represent a detailed system architecture
3. Still maintain VALID Mermaid syntax:
   - "flowchart TD" must be on its first line
   - Keep node IDs alphanumeric without spaces
   - Use properly formatted node labels with DOUBLE QUOTES: Frontend["Frontend Components"]
   - DO NOT use nested subgraphs - keep the structure flat
   - Ensure all connections are properly defined
4. FOLLOW THIS FORMAT but with MORE NODES and CONNECTIONS:
   flowchart TD
     A["Node A"]
     B["Node B"]
     C["Node C"]
     D["Node D"]
     E["Node E"]
     A --> B & C
     B --> D
     C --> D & E
     D --> E

5. Your response MUST be valid Mermaid syntax ONLY
6. Use only ONE set of brackets for nodes: Node1["Label"]
7. DO NOT use quotation marks inside node labels

**File Paths to Analyze:**
${filePaths}

Create a DETAILED yet valid diagram. Focus on comprehensive representation of the system architecture while ensuring syntax correctness.
`;

  const prompt = detailLevel === 'detailed' ? detailedPrompt : simplePrompt;

  try {
    const result = await model.generateContent(prompt);
    let mermaidCode = result.response.text().trim();

    // Log raw output for debugging
    console.log(`📊 Raw AI-generated Mermaid Code (${detailLevel}):\n`, mermaidCode);

    // Basic cleanup
    mermaidCode = mermaidCode
      .replace(/```mermaid\n?/g, "") // Remove code block markers
      .replace(/```/g, "")
      .trim();

    // ================= SYNTAX FIXING =================
    
    // Completely reset the diagram if it's too complex
    if (mermaidCode.includes('subgraph') || mermaidCode.match(/\[.*["'].*\]/)) {
      console.warn("⚠️ Complex diagram detected, simplifying...");
      
      // Extract node information from the complex diagram
      const nodeRegex = /([A-Za-z0-9_]+)\s*\[["']?(.*?)["']?\]/g;
      const nodes = [];
      let match;
      
      while ((match = nodeRegex.exec(mermaidCode)) !== null) {
        // Clean up the node label
        const nodeId = match[1].trim();
        let nodeLabel = match[2].trim()
          .replace(/["']/g, '')  // Remove all quotes
          .replace(/\[|\]/g, ''); // Remove any brackets
        
        // Only add node if it has a valid ID and label
        if (nodeId && nodeLabel) {
          nodes.push({ id: nodeId, label: nodeLabel });
        }
      }
      
      // Extract connection information
      const connectionRegex = /([A-Za-z0-9_]+)\s*--+>?\s*([A-Za-z0-9_]+)/g;
      const connections = [];
      
      while ((match = connectionRegex.exec(mermaidCode)) !== null) {
        connections.push({ from: match[1].trim(), to: match[2].trim() });
      }
      
      // Rebuild a simple, valid diagram
      mermaidCode = "flowchart TD\n";
      
      // Add nodes with proper formatting
      nodes.forEach(node => {
        mermaidCode += `  ${node.id}["${node.label}"]\n`;
      });
      
      // Add connections
      connections.forEach(conn => {
        if (conn.from && conn.to) {
          mermaidCode += `  ${conn.from} --> ${conn.to}\n`;
        }
      });
      
      // If we couldn't extract enough information, create a fallback diagram
      if (nodes.length < 3) {
        mermaidCode = `flowchart TD
  App["Application"]
  FE["Frontend"]
  BE["Backend"]
  DB["Database"]
  App --> FE
  App --> BE
  BE --> DB`;
      }
    } else {
      // For simpler diagrams, just apply basic fixes
      
      // Fix node declarations with complex brackets or quotes
      mermaidCode = mermaidCode.replace(/([A-Za-z0-9_]+)\s*\[(["']?)([^"'\[\]]+)(["']?)\]/g, 
        (match, id, openQuote, label, closeQuote) => {
          return `${id}["${label.replace(/["']/g, '')}"]`;
      });
      
      // Ensure flowchart TD is on its own line
      mermaidCode = mermaidCode.replace(/flowchart\s+TD\s*([^\n])/, 'flowchart TD\n$1');
      
      // Normalize line endings
      mermaidCode = mermaidCode.replace(/\r\n/g, '\n');
    }
    
    // Ensure we have proper flowchart declaration at the beginning
    if (!mermaidCode.startsWith('flowchart TD')) {
      mermaidCode = 'flowchart TD\n' + mermaidCode;
    }
    
    // Add styles
    mermaidCode += `
    %% Enhanced styling for architecture diagram
    classDef coreComponent fill:#f9f,stroke:#333,stroke-width:2px
    classDef frontend fill:#bbf,stroke:#333,stroke-width:1px
    classDef backend fill:#bfb,stroke:#333,stroke-width:1px
    classDef dataLayer fill:#fbb,stroke:#333,stroke-width:1px
    classDef utility fill:#fffacd,stroke:#333,stroke-width:1px
    classDef external fill:#e6e6fa,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5
    classDef api fill:#afeeee,stroke:#333,stroke-width:1px
    
    %% Apply styles to node categories
    class App,Core,Main coreComponent
    class FE,Frontend,UI,Component frontend
    class BE,Backend,Server,API backend
    class DB,Data,Store,Model dataLayer
    class Util,Helper,Service utility
    class External,ThirdParty external
    class Endpoint,Route api
    `;

    // Final formatting pass to ensure proper spacing
    mermaidCode = mermaidCode
      .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines to max 2
      .replace(/^\s+/gm, '  ')     // Standardize indentation to 2 spaces
      .trim();

    console.log(`📊 Fixed Mermaid Code (${detailLevel}):\n`, mermaidCode);
    
    // Verify syntax before returning (try to catch issues earlier)
    if (mermaidCode.includes('["') && !mermaidCode.includes('"]')) {
      console.warn("⚠️ Detected unclosed brackets, fixing...");
      mermaidCode = mermaidCode.replace(/\["([^"]*)/g, '["$1"]');
    }
    
    return mermaidCode;
  } catch (error) {
    console.error("🚨 Error generating Mermaid diagram:", error);
    return `flowchart TD
    Error["API Error: ${error instanceof Error ? error.message : "Unknown error"}"]`;
  }
};