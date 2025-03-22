import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDTlyP33hmBQ_y-LFIdZbWd7MVtm0U93JQ" // Replace with your actual API key
const MODEL = "gemini-2.0-flash"; // Model version

const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeWithGemini = async (files: any[]): Promise<{ source: string; target: string }[]> => {
  const fileList = files.map((file) => file.path).join("\n");

  const prompt = `
  You are an AI that analyzes a Next.js repository structure and determines file relationships.
  Given the following file paths, identify dependencies and return ONLY a valid JSON array:
  [
    {"source": "src/components/Header.tsx", "target": "src/utils/helpers.ts"},
    {"source": "src/pages/index.tsx", "target": "src/components/NavBar.tsx"}
  ]
  
  Files:
  ${fileList}
  `;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  try {
    const jsonStart = responseText.indexOf("[");
    const jsonEnd = responseText.lastIndexOf("]") + 1;
    const jsonString = responseText.substring(jsonStart, jsonEnd);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return [];
  }
};
