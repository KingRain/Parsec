import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Initialize the Gemini model
const getModel = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set in environment variables');
  }
  
  return new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-1.5-flash",
    temperature: 0.2,
    maxRetries: 2,
  });
};

export async function POST(request: NextRequest) {
  try {
    const { fileContent, fileName, fileType } = await request.json();
    
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
    const systemPrompt = `
      You are an expert code analyzer that creates Mermaid diagrams to visualize code structure and flow.
      Analyze the provided code file and generate a comprehensive Mermaid diagram that best represents its structure.
      
      Follow these guidelines:
      1. Choose the most appropriate diagram type (flowchart, class diagram, sequence diagram, etc.) based on the code.
      2. For code files, focus on showing the main components, relationships, and flows.
      3. Include classes, functions, methods, and their relationships where relevant.
      4. Use clear naming and appropriate styling.
      5. Keep the diagram readable - simplify complex parts if needed.
      6. IMPORTANT: Output ONLY valid Mermaid syntax without any explanations or comments.
      
      For different file types, prioritize:
      - JavaScript/TypeScript: Show component structure, data flow, and function relationships
      - Python: Show class hierarchies, function calls, and program flow
      - HTML/CSS: Show document structure or style relationships
      - Java/C#: Show class structure, inheritance, and method relationships
      
      Return only the Mermaid diagram code without backticks, starting directly with the diagram type.
    `;

    // Create the prompt
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`
        File name: ${fileName || 'unknown'}
        File type: ${fileType || 'unknown'}
        
        Code:
        ${trimmedContent}
      `)
    ];

    // Generate the diagram
    const response = await model.invoke(messages);
    
    // Clean up the response to ensure it's valid Mermaid syntax
    let mermaidCode = response.content.toString();
    
    // Remove backticks and "mermaid" if they exist
    mermaidCode = mermaidCode.replace(/```mermaid\n?/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json({ diagram: mermaidCode });
  } catch (error) {
    console.error('Error generating diagram:', error);
    return NextResponse.json(
      { error: 'Failed to generate diagram', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 