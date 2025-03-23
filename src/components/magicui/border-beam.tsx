"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface BorderBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  reverse?: boolean;
  initialOffset?: number;
}

export function BorderBeam({
  duration = 5,
  borderWidth = 0.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  reverse = false,
  initialOffset = 0,
  className,
  ...props
}: BorderBeamProps) {
  const [progress, setProgress] = useState(initialOffset);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  
  useEffect(() => {
    let startTime: number;
    const totalDistance = 100; // Percentage for a full loop
    
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      
      // Calculate progress (0-100) based on time and duration
      const newProgress = ((elapsed / (duration * 1000)) * totalDistance) % totalDistance;
      const currentProgress = reverse ? totalDistance - newProgress : newProgress;
      
      // Update progress state
      setProgress(currentProgress);
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [duration, reverse, initialOffset]);

  // Calculate gradient positions based on progress
  const getGradientPosition = () => {
    // Determine which edge the progress is on
    if (progress < 25) {
      // Top edge: left to right (0-25%)
      const pos = progress * 4; // 0 to 100
      return {
        background: `linear-gradient(90deg, 
          transparent 0%, 
          transparent ${Math.max(0, pos - 15)}%, 
          ${colorFrom} ${Math.max(0, pos - 10)}%, 
          ${colorTo} ${pos}%, 
          transparent ${Math.min(100, pos + 10)}%, 
          transparent 100%)`,
        top: 0,
        right: 0,
        bottom: 'auto',
        left: 0,
        height: `${borderWidth}px`,
        width: '100%'
      };
    } else if (progress < 50) {
      // Right edge: top to bottom (25-50%)
      const pos = (progress - 25) * 4; // 0 to 100
      return {
        background: `linear-gradient(180deg, 
          transparent 0%, 
          transparent ${Math.max(0, pos - 15)}%, 
          ${colorFrom} ${Math.max(0, pos - 10)}%, 
          ${colorTo} ${pos}%, 
          transparent ${Math.min(100, pos + 10)}%, 
          transparent 100%)`,
        top: 0,
        right: 0,
        bottom: 0,
        left: 'auto',
        height: '100%',
        width: `${borderWidth}px`
      };
    } else if (progress < 75) {
      // Bottom edge: right to left (50-75%)
      const pos = (progress - 50) * 4; // 0 to 100
      return {
        background: `linear-gradient(270deg, 
          transparent 0%, 
          transparent ${Math.max(0, pos - 15)}%, 
          ${colorFrom} ${Math.max(0, pos - 10)}%, 
          ${colorTo} ${pos}%, 
          transparent ${Math.min(100, pos + 10)}%, 
          transparent 100%)`,
        top: 'auto',
        right: 0,
        bottom: 0,
        left: 0,
        height: `${borderWidth}px`,
        width: '100%'
      };
    } else {
      // Left edge: bottom to top (75-100%)
      const pos = (progress - 75) * 4; // 0 to 100
      return {
        background: `linear-gradient(0deg, 
          transparent 0%, 
          transparent ${Math.max(0, pos - 15)}%, 
          ${colorFrom} ${Math.max(0, pos - 10)}%, 
          ${colorTo} ${pos}%, 
          transparent ${Math.min(100, pos + 10)}%, 
          transparent 100%)`,
        top: 0,
        right: 'auto',
        bottom: 0,
        left: 0,
        height: '100%',
        width: `${borderWidth}px`
      };
    }
  };

  const gradientStyle = getGradientPosition();

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-10 rounded-[inherit]",
        className
      )}
      {...props}
    >
      {/* Top Border */}
      <div 
        className="absolute" 
        style={{
          position: 'absolute',
          boxShadow: `0 0 10px ${colorTo}`,
          filter: 'blur(1px)',
          opacity: progress < 25 ? 1 : 0,
          ...gradientStyle
        }}
      />
      
      {/* Right Border */}
      <div 
        className="absolute" 
        style={{
          position: 'absolute',
          boxShadow: `0 0 10px ${colorTo}`,
          filter: 'blur(1px)',
          opacity: progress >= 25 && progress < 50 ? 1 : 0,
          ...gradientStyle
        }}
      />
      
      {/* Bottom Border */}
      <div 
        className="absolute" 
        style={{
          position: 'absolute',
          boxShadow: `0 0 10px ${colorTo}`,
          filter: 'blur(1px)',
          opacity: progress >= 50 && progress < 75 ? 1 : 0,
          ...gradientStyle
        }}
      />
      
      {/* Left Border */}
      <div 
        className="absolute" 
        style={{
          position: 'absolute',
          boxShadow: `0 0 10px ${colorTo}`,
          filter: 'blur(1px)',
          opacity: progress >= 75 ? 1 : 0,
          ...gradientStyle
        }}
      />
    </div>
  );
} 