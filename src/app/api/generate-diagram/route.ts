import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from "@google/generative-ai";

// Initialize the Gemini model
const getModel = (): GenerativeModel => {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set in environment variables');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-lite",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });
};

// Function to validate Mermaid syntax
function validateMermaidSyntax(code: string): boolean {
  // Basic validation
  if (!code || code.length < 10) return false;
  
  // Check for common diagram types
  const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gitGraph'];
  const firstLine = code.split('\n')[0].trim();
  const hasValidStart = validTypes.some(type => firstLine.startsWith(type));
  
  if (!hasValidStart) return false;
  
  // Check for balanced brackets/parentheses
  const brackets: string[] = [];
  for (const char of code) {
    if (char === '{' || char === '(' || char === '[') {
      brackets.push(char);
    } else if (char === '}') {
      if (brackets.pop() !== '{') return false;
    } else if (char === ')') {
      if (brackets.pop() !== '(') return false;
    } else if (char === ']') {
      if (brackets.pop() !== '[') return false;
    }
  }
  
  return brackets.length === 0;
}

// Extract Mermaid code from text
function extractMermaidFromText(text: string): { mermaidCode: string; diagramType: string } {
  let mermaidCode = '';
  let diagramType = '';
  
  // Extract Mermaid code between triple backticks if present
  const mermaidMatch = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
  if (mermaidMatch && mermaidMatch[1]) {
    mermaidCode = mermaidMatch[1].trim();
  } else {
    // If no backticks, try to extract based on common Mermaid starting syntax
    const lines = text.split('\n');
    const startIndex = lines.findIndex((line: string) => 
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram)/.test(line.trim())
    );
    
    if (startIndex !== -1) {
      mermaidCode = lines.slice(startIndex).join('\n').trim();
    } else {
      // Last resort: use the entire text (might not work well)
      mermaidCode = text;
    }
  }
  
  // Try to detect diagram type from the code
  const firstLine = mermaidCode.split('\n')[0].trim();
  diagramType = firstLine.split(' ')[0];
  
  return { mermaidCode, diagramType };
}

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileName, fileType } = await request.json() as {
      fileContent: string;
      fileName?: string;
      fileType?: string;
    };
    
    if (!fileContent) {
      return NextResponse.json(
        { error: 'File content is required' }, 
        { status: 400 }
      );
    }

    // Trim file content if too large for the model
    const maxContentLength = 20000;
    const trimmedContent = fileContent.length > maxContentLength
      ? fileContent.substring(0, maxContentLength) + "\n\n... (content truncated for length)"
      : fileContent;

    // Create the model
    const model = getModel();

    // System prompt with instructions
    const prompt = `
You are an expert code analyzer that creates Mermaid diagrams to visualize code structure.

I need you to create a Mermaid diagram for this code file. Your response must ONLY contain the Mermaid syntax - no explanation, no markdown formatting, just pure Mermaid diagram code.

File name: ${fileName || 'unknown'}
File type: ${fileType || 'unknown'}

Code:
${trimmedContent}

IMPORTANT INSTRUCTIONS:
1. Choose the most appropriate diagram type:
   - For classes or objects: use classDiagram
   - For workflows or execution paths: use flowchart TD
   - For state machines: use stateDiagram-v2
   - For API/function interactions: use sequenceDiagram

2. Ensure your diagram has:
   - Clear, descriptive labels
   - Proper relationships between elements
   - Logical organization (top-to-bottom flow if applicable)
   - Styling for better visualization when helpful

3. Your response format MUST be valid Mermaid syntax ONLY, starting directly with the diagram type declaration (e.g., "flowchart TD" or "classDiagram").

4. DO NOT include:
   - Explanations or commentary
   - Markdown code fences (\`\`\`)
   - Anything other than the pure Mermaid diagram code

5. Simplify complex parts of the code while maintaining the important structural elements.
`;

    // Generate the diagram
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
      }
    });

    const response = result.response;
    const responseText = response.text();
    
    // Extract and validate the diagram
    const { mermaidCode, diagramType } = extractMermaidFromText(responseText);
    
    // Final validation
    if (!mermaidCode || !validateMermaidSyntax(mermaidCode)) {
      // If validation fails, create a simple fallback diagram
      const fallbackDiagram = generateFallbackDiagram(fileName || 'file');
      
      return NextResponse.json({ 
        diagram: fallbackDiagram,
        type: 'flowchart',
        fallback: true
      });
    }
    
    return NextResponse.json({ 
      diagram: mermaidCode,
      type: diagramType
    });
  } catch (error) {
    console.error('Error generating diagram:', error);
    return NextResponse.json(
      { error: 'Failed to generate diagram', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Generate a simple fallback diagram when normal generation fails
function generateFallbackDiagram(fileName: string): string {
  return `flowchart TD
    A[${fileName}] --> B[Main Components]
    B --> C[Logic]
    B --> D[Data]
    B --> E[UI Elements]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:1px
    style C fill:#dfd,stroke:#333,stroke-width:1px
    style D fill:#dfd,stroke:#333,stroke-width:1px
    style E fill:#dfd,stroke:#333,stroke-width:1px`;
} 