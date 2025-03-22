"use client";

import React from "react";
import { motion } from "framer-motion";

export const GlobeEffect: React.FC = () => {
  return (
    <motion.section className="relative flex h-[492px] items-center overflow-hidden bg-black [mask-image:linear-gradient(to_bottom,transparent,black_0%,black_100%,transparent)] dark:[mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] md:h-[800px]">
      <div className="absolute inset-0 bg-[radial-gradient(75%_75%_at_center_center,rgb(140,69,255,.5)_15%,rgb(14,0,36,.5)_78%,transparent)]" />
      
      {/* Central Globe */}
      <div className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-purple-500 bg-[radial-gradient(50%_50%_at_16.8%_18.3%,white,rgb(184,148,255)_37.7%,rgb(24,0,66))] shadow-[-20px_-20px_50px_rgb(255,255,255,.5),-20px_-20px_80px_rgb(255,255,255,.1),0_0_50px_rgb(140,69,255)] md:size-96" />
      
      {/* Rotating Stars Background */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(/stars.svg)`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Inner Orbit Ring */}
      <div className="absolute left-1/2 top-1/2 size-[344px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white opacity-20 md:size-[580px]">
        <motion.div 
          className="absolute left-0 top-1/2 inline-flex size-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white"
          animate={{
            rotate: 360,
          }}
          style={{
            transformOrigin: "172px 0px",
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div 
          className="absolute left-1/2 top-0 inline-flex size-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white"
          animate={{
            rotate: 360,
          }}
          style={{
            transformOrigin: "0px 172px",
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div 
          className="absolute right-0 top-1/2 inline-flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white"
          animate={{
            rotate: 360,
          }}
          style={{
            transformOrigin: "-172px 0px",
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Middle Orbit Ring */}
      <div className="absolute left-1/2 top-1/2 size-[444px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20 md:size-[780px]" />

      {/* Outer Orbit Ring */}
      <div className="absolute left-1/2 top-1/2 size-[544px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white opacity-20 md:size-[980px]">
        <motion.div 
          className="absolute left-0 top-1/2 inline-flex size-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white"
          animate={{
            rotate: 360,
          }}
          style={{
            transformOrigin: "272px 0px",
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div 
          className="absolute right-0 top-1/2 inline-flex size-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white"
          animate={{
            rotate: 360,
          }}
          style={{
            transformOrigin: "-272px 0px",
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <div className="container relative mt-16">
        <h1 className="bg-white bg-[radial-gradient(100%_100%_at_top_left,white,white,rgb(74,32,138,.5))] bg-clip-text text-center text-7xl font-semibold tracking-tighter text-transparent  md:text-[164px] md:leading-none">
          Parsec
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-center text-lg text-white/70 md:text-xl">
          Explore your code repositories with AI-powered insights. Parsec helps you understand, navigate, and improve your codebase faster than ever before.
        </p>
      </div>
    </motion.section>
  );
};