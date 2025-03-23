/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */


'use client';

import { useState, useRef, useEffect } from 'react';

interface Point {
    x: number;
    y: number;
}

const Playground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);
    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<Point | null>(null);
    const [showTextInput, setShowTextInput] = useState(false);
    const textInputRef = useRef<HTMLInputElement>(null);

    // Resize canvas to fill container
    const resizeCanvas = () => {
        if (canvasRef.current && containerRef.current) {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            
            // Set canvas dimensions to match container
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight || 500; // Minimum height if container has no height
            
            // Redraw everything after resize
            const context = canvas.getContext('2d');
            if (context) {
                // Reset default style
                context.strokeStyle = 'black';
                context.lineWidth = 2;
                context.lineCap = 'round';
                
                // Draw white background
                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);
                
                // Add grey dots pattern
                drawGridDots(context, canvas.width, canvas.height);
            }
        }
    };

    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                setCtx(context);
                // Initial setup will happen in resizeCanvas
                resizeCanvas();
            }
        }
        
        // Add resize event listener
        window.addEventListener('resize', resizeCanvas);
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);
    
    // Function to draw the grid dots
    const drawGridDots = (context: CanvasRenderingContext2D, width: number, height: number) => {
        const spacing = 20; // Space between dots
        const dotSize = 1; // Size of each dot
        
        context.fillStyle = '#cccccc'; // Light grey color
        
        for (let x = spacing; x < width; x += spacing) {
            for (let y = spacing; y < height; y += spacing) {
                context.beginPath();
                context.arc(x, y, dotSize, 0, Math.PI * 2);
                context.fill();
            }
        }
    };

    const getValidCoordinates = (clientX: number, clientY: number): Point | null => {
        if (!canvasRef.current) return null;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Check if point is within canvas boundaries
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            return null;
        }
        
        return { x, y };
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctx || !lastPoint || !canvasRef.current) return;
    
        const currentPoint = getValidCoordinates(e.clientX, e.clientY);
        if (!currentPoint) {
            // If we move outside the canvas, stop drawing
            stopDrawing();
            return;
        }
    
        // Set color based on tool
        if (tool === 'eraser') {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 10; // Larger width for eraser
        } else {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
        }
        
        // Draw the line
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        
        setLastPoint(currentPoint);
    };
    
    // Also update the startDrawing function to set the correct stroke style
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !ctx) return;
        
        const point = getValidCoordinates(e.clientX, e.clientY);
        if (!point) return;
        
        if (tool === 'text') {
            setTextPosition(point);
            setShowTextInput(true);
            setTimeout(() => {
                if (textInputRef.current) {
                    textInputRef.current.focus();
                }
            }, 10);
            return;
        }
        
        setIsDrawing(true);
        setLastPoint(point);
        
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        
        // Set stroke style at beginning of stroke
        if (tool === 'eraser') {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 10;
        } else {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        setLastPoint(null);
        if (ctx) {
            ctx.closePath();
        }
    };

    const addText = () => {
        if (!ctx || !textPosition || !textInput) return;
        
        ctx.font = '16px Arial';
        ctx.fillStyle = 'black'; // Ensuring text is black
        ctx.textBaseline = 'top';
        ctx.fillText(textInput, textPosition.x, textPosition.y);
        
        setTextInput('');
        setShowTextInput(false);
        setTextPosition(null);
    };

    const clearCanvas = () => {
        if (!ctx || !canvasRef.current) return;
        
        // Clear the canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Redraw the grid dots
        drawGridDots(ctx, canvasRef.current.width, canvasRef.current.height);
    };

    const downloadCanvas = (type: 'jpeg' | 'png' | 'svg' ) => {
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        
        if (type === 'jpeg' || type === 'png') {
            const mime = type === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataURL = canvas.toDataURL(mime);
            const link = document.createElement('a');
            link.download = `drawing.${type}`;
            link.href = dataURL;
            link.click();
        } else if (type === 'svg') {
            // Basic SVG conversion (simplified)
            const width = canvas.width;
            const height = canvas.height;
            let svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <rect width="100%" height="100%" fill="white"/>
                <foreignObject width="${width}" height="${height}">
                    <img src="${canvas.toDataURL()}" width="${width}" height="${height}" />
                </foreignObject>
            </svg>`;
            
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'drawing.svg';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        } 
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4" style={{ width: '100%', height: '100%' }}>
            <div className="flex gap-4">
                <button
                    className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setTool('pen')}
                    title="Pen"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                        <path d="M2 2l7.586 7.586"></path>
                        <path d="M11 11l-4 4"></path>
                    </svg>
                </button>
                <button
                    className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setTool('eraser')}
                    title="Eraser"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 20H7L3 16c-1.5-1.5-1.5-3.5 0-5l7-7c1.5-1.5 3.5-1.5 5 0l5 5c1.5 1.5 1.5 3.5 0 5l-4 4"></path>
                        <path d="M6 12l6 6"></path>
                    </svg>
                </button>
                <button
                    className={`p-2 rounded ${tool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setTool('text')}
                    title="Text"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 7 4 4 20 4 20 7"></polyline>
                        <line x1="9" y1="20" x2="15" y2="20"></line>
                        <line x1="12" y1="4" x2="12" y2="20"></line>
                    </svg>
                </button>
                <button
                    className="p-2 rounded bg-red-500 text-white"
                    onClick={clearCanvas}
                    title="Clear"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
                <div className="relative ml-4">
                    <button
                        className="px-4 py-2 rounded bg-green-500 text-white"
                        onClick={() => document.getElementById('downloadOptions')?.classList.toggle('hidden')}
                    >
                        Download
                    </button>
                    <div id="downloadOptions" className="absolute hidden mt-1 bg-white text-black border rounded shadow-lg z-10">
                        <button 
                            className="block px-4 py-2 w-full text-left hover:bg-gray-100" 
                            onClick={() => downloadCanvas('png')}
                        >
                            PNG
                        </button>
                        <button 
                            className="block px-4 py-2 w-full text-left hover:bg-gray-100" 
                            onClick={() => downloadCanvas('jpeg')}
                        >
                            JPEG
                        </button>
                        <button 
                            className="block px-4 py-2 w-full text-left hover:bg-gray-100" 
                            onClick={() => downloadCanvas('svg')}
                        >
                            SVG
                        </button>
                        <button 
                            className="block px-4 py-2 w-full text-left hover:bg-gray-100" 
                            onClick={() => downloadCanvas('pdf')}
                        >
                            PDF
                        </button>
                    </div>
                </div>
            </div>
            <div 
                ref={containerRef} 
                className="w-full flex-grow border border-gray-300 relative"
                style={{ minHeight: '500px' }}
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
                {showTextInput && textPosition && (
                    <div 
                        className="absolute" 
                        style={{ left: textPosition.x + 'px', top: textPosition.y + 'px' }}
                    >
                        <input
                            ref={textInputRef}
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    addText();
                                } else if (e.key === 'Escape') {
                                    setShowTextInput(false);
                                    setTextPosition(null);
                                    setTextInput('');
                                }
                            }}
                            onBlur={addText}
                            className="border border-gray-300 p-1"
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Playground;
