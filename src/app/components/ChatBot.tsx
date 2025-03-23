import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyDTlyP33hmBQ_y-LFIdZbWd7MVtm0U93JQ"); // Replace with your actual API key

// Define message type
interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function ChatBot({ ownerName, repoName }) { 
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [repoInfo, setRepoInfo] = useState({
        owner: "",
        repo: "",
        branch: "main"
    });
    const [showRepoSettings, setShowRepoSettings] = useState(false);

    // Function to fetch file from GitHub
    const fetchFileFromGitHub = async (filename: string) => {
        const { owner, repo, branch } = repoInfo;
        if (!owner || !repo) {
            return {
                success: false,
                error: "Please set GitHub repository information first by clicking on Settings."
            };
        }

        try {
            // Try to fetch the file from the repository
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`
            );
            
            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch file: ${response.statusText}`
                };
            }
            
            const data = await response.json();
            
            // GitHub API returns content as base64 encoded
            const content = atob(data.content);
            return {
                success: true,
                content,
                path: data.path,
                sha: data.sha
            };
        } catch (error) {
            console.error("Error fetching file:", error);
            return {
                success: false,
                error: "Failed to fetch file from GitHub. Check console for details."
            };
        }
    };

    // Function to check if the message is an improve command
    const isImproveCommand = (message: string) => {
        return /^improve\s+(.+\.(js|jsx|ts|tsx|css|html))$/i.test(message);
    };

    // Function to extract filename from improve command
    const extractFilename = (message: string) => {
        const match = message.match(/^improve\s+(.+\.(js|jsx|ts|tsx|css|html))$/i);
        return match ? match[1] : null;
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        try {
            setIsLoading(true);
            
            // Add user message to chat
            const newMessages = [...messages, { role: "user", content: inputMessage }];
            setMessages(newMessages);
            
            // Check if this is an improve command
            if (isImproveCommand(inputMessage)) {
                const filename = extractFilename(inputMessage);
                if (filename) {
                    // Fetch file from GitHub
                    const fileResult = await fetchFileFromGitHub(filename);
                    
                    if (!fileResult.success) {
                        setMessages([
                            ...newMessages,
                            { role: "assistant", content: fileResult.error }
                        ]);
                        setInputMessage("");
                        setIsLoading(false);
                        return;
                    }
                    
                    // Send file content to Gemini for improvement suggestions
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                    const prompt = `I have the following code file named ${filename}. Please analyze it and suggest specific improvements for readability, performance, and best practices. Format your response with specific code suggestions where applicable:\n\n${fileResult.content}`;
                    
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();
                    
                    // Add AI response to chat
                    setMessages([
                        ...newMessages,
                        { 
                            role: "assistant", 
                            content: `### Code Improvement Suggestions for ${filename}\n\n${text}` 
                        }
                    ]);
                    setInputMessage("");
                    setIsLoading(false);
                    return;
                }
            }
            
            // Regular chat message flow
            setInputMessage("");

            // Generate response using Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            // For chat history, we need to format the messages properly
            const chat = model.startChat({
                history: newMessages.map(msg => ({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                })),
            });

            const result = await chat.sendMessage(inputMessage);
            const response = await result.response;
            const text = response.text();

            // Add AI response to chat
            setMessages([...newMessages, { role: "assistant", content: text }]);
        } catch (error) {
            console.error("Error:", error);
            // Add error message to chat
            setMessages([
                ...newMessages,
                { role: "assistant", content: "Sorry, I encountered an error processing your request." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
                <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold text-center flex-1 text-black">Assistant</h1>
                        <button 
                                onClick={() => setShowRepoSettings(!showRepoSettings)} 
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm text-black"
                        >
                                Settings
                        </button>
                </div>
                
                {showRepoSettings && (
                        <div className="mb-4 p-4 border rounded bg-gray-50">
                                <h2 className="text-lg font-semibold mb-2 text-black">GitHub Repository Settings</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                                <label className="block text-sm mb-1 text-black">Owner/Organization</label>
                                                <input
                                                        type="text"
                                                        value={repoInfo.owner}
                                                        onChange={(e) => setRepoInfo({...repoInfo, owner: e.target.value})}
                                                        className="w-full p-2 border rounded text-sm text-black"
                                                        placeholder="e.g. facebook"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm mb-1 text-black">Repository Name</label>
                                                <input
                                                        type="text"
                                                        value={repoInfo.repo}
                                                        onChange={(e) => setRepoInfo({...repoInfo, repo: e.target.value})}
                                                        className="w-full p-2 border rounded text-sm text-black"
                                                        placeholder="e.g. react"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm mb-1 text-black">Branch</label>
                                                <input
                                                        type="text"
                                                        value={repoInfo.branch}
                                                        onChange={(e) => setRepoInfo({...repoInfo, branch: e.target.value})}
                                                        className="w-full p-2 border rounded text-sm text-black"
                                                        placeholder="e.g. main"
                                                />
                                        </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-500 text-black">
                                        To improve a file, type: "improve filename.js" in the chat
                                </p>
                        </div>
                )}
                
                <div className="flex-1 overflow-y-auto mb-4 p-2 border rounded bg-gray-50">
                        {messages.length === 0 ? (
                                <div className="text-center text-black mt-8">
                                        <p>Start a conversation with Gemini AI</p>
                                        <p className="text-sm mt-2">Tip: Type "improve filename.js" to get improvement suggestions for your code files</p>
                                </div>
                        ) : (
                                messages.map((message, index) => (
                                        <div
                                                key={index}
                                                className={`mb-4 ${
                                                        message.role === "user" ? "text-right" : "text-left"
                                                }`}
                                        >
                                                <div
                                                        className={`inline-block p-3 rounded-lg max-w-[90%] ${
                                                                message.role === "user"
                                                                        ? "bg-blue-500 text-white"
                                                                        : "bg-gray-200 text-black"
                                                        }`}
                                                >
                                                        {message.role === "assistant" ? (
                                                                <div className="markdown-content prose prose-sm max-w-none">
                                                                        <ReactMarkdown>
                                                                                {message.content}
                                                                        </ReactMarkdown>
                                                                </div>
                                                        ) : (
                                                                <div className="whitespace-pre-wrap">{message.content}</div>
                                                        )}
                                                </div>
                                        </div>
                                ))
                        )}
                        {isLoading && (
                                <div className="text-left mb-4">
                                        <div className="inline-block p-3 rounded-lg bg-gray-200 text-black">
                                                <div className="flex space-x-2">
                                                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                                                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-75"></div>
                                                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-150"></div>
                                                </div>
                                        </div>
                                </div>
                        )}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder='Type a message or "improve filename.js"...'
                        className="flex-1 p-2 border rounded text-black bg-white"
                        disabled={isLoading}
                        />
                        <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        disabled={isLoading}
                        >
                        {isLoading ? "Sending..." : "Send"}
                        </button>
                </form>
        </div>
);
}