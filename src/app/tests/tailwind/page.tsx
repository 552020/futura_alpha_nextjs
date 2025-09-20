'use client';

import React, { useEffect } from 'react';

export default function TailwindTestPage() {
  useEffect(() => {
    console.log('TailwindTestPage mounted');

    // Log all loaded stylesheets
    console.log(
      'All loaded stylesheets:',
      Array.from(document.styleSheets).map(sheet => ({
        href: sheet.href,
        type: sheet.type,
        rules: sheet.cssRules?.length,
      }))
    );

    // Check specific Tailwind classes
    //     const testElement = document.querySelector(".test-tailwind");
    //     if (testElement) {
    //       console.log("Test element styles:", {
    //         computed: window.getComputedStyle(testElement),
    //         classList: testElement.classList,
    //         backgroundColor: window.getComputedStyle(testElement).backgroundColor,
    //       });
    //     }
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
      {/* <div className="test-tailwind bg-blue-500 p-4 rounded-lg text-white mb-8">Test Tailwind Classes</div> */}

      {/* TRY 1: Multi-line version */}
      <div className="relative">
        <p className="text-gray-500 mb-4 text-sm">TRY 1: Multi-line shadow</p>
        <h1
          className="text-7xl font-bold text-white absolute 
          [text-shadow:_0_0_7px_#fff,
          0_0_10px_#fff,
          0_0_21px_#fff,
          0_0_42px_#fff,
          0_0_82px_#fff,
          0_0_92px_#fff,
          0_0_102px_#fff,
          0_0_151px_#fff]"
          style={{ top: '0.5px', left: '0.5px' }}
        >
          Neon White
        </h1>
        <h1
          className="text-7xl font-bold text-white relative
          [text-shadow:_0_0_7px_#fff,
          0_0_10px_#fff,
          0_0_21px_#fff,
          0_0_42px_rgba(255,255,255,0.8),
          0_0_82px_rgba(255,255,255,0.6),
          0_0_92px_rgba(255,255,255,0.4),
          0_0_102px_rgba(255,255,255,0.2),
          0_0_151px_rgba(255,255,255,0.1)]"
        >
          Neon White
        </h1>
      </div>

      {/* TRY 2: Single-line optimized version with pseudo-element */}
      <div className="relative mt-16">
        <p className="text-gray-500 mb-4 text-sm">TRY 2: Single-line shadow with pseudo-element</p>
        <h1
          className="text-7xl font-bold text-white relative
          [text-shadow:_0_0_7px_#fff,_0_0_10px_#fff,_0_0_21px_#fff,_0_0_42px_rgba(255,255,255,0.8),_0_0_82px_rgba(255,255,255,0.6),_0_0_92px_rgba(255,255,255,0.4),_0_0_102px_rgba(255,255,255,0.2),_0_0_151px_rgba(255,255,255,0.1)]
          before:content-[attr(data-text)]
          before:absolute
          before:left-[0.5px]
          before:top-[0.5px]
          before:text-white
          before:[text-shadow:_0_0_7px_#fff,_0_0_10px_#fff,_0_0_21px_#fff,_0_0_42px_#fff,_0_0_82px_#fff,_0_0_92px_#fff,_0_0_102px_#fff,_0_0_151px_#fff]"
          data-text="Neon White"
        >
          Neon White
        </h1>
      </div>

      {/* TRY 3: Moderate glow version */}
      <div className="relative mt-16">
        <p className="text-gray-500 mb-4 text-sm">TRY 3: Moderate glow</p>
        <h1
          className="text-7xl font-bold text-white relative
          [text-shadow:_0_0_5px_#fff,_0_0_10px_#fff,_0_0_15px_rgba(255,255,255,0.5),_0_0_25px_rgba(255,255,255,0.3)]
          before:content-[attr(data-text)]
          before:absolute
          before:left-[0.5px]
          before:top-[0.5px]
          before:text-white
          before:[text-shadow:_0_0_2px_#fff,_0_0_4px_#fff,_0_0_8px_rgba(255,255,255,0.8)]"
          data-text="Neon White"
        >
          Neon White
        </h1>
      </div>

      {false && (
        <>
          {/* Intense Glowing Box */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative px-7 py-4 bg-black rounded-lg leading-none flex items-center">
              <span className="text-pink-600 group-hover:text-gray-100 transition duration-200 text-2xl font-bold">
                Intense Glow Effect
              </span>
            </div>
          </div>

          {/* Different neon text effects */}
          <h1
            className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-pink-300
        [text-shadow:_0_0_10px_#ff00ff,
        0_0_20px_#ff00ff,
        0_0_30px_#ff00ff,
        0_0_40px_#ff00ff]
        animate-pulse"
          >
            Neon Pink
          </h1>

          <h1
            className="text-7xl font-bold text-cyan-300
        [text-shadow:_0_0_7px_#fff,
        0_0_10px_#fff,
        0_0_21px_#fff,
        0_0_42px_#0ff,
        0_0_82px_#0ff,
        0_0_92px_#0ff,
        0_0_102px_#0ff,
        0_0_151px_#0ff]
        animate-[pulse_4s_ease-in-out_infinite]"
          >
            Neon Cyan
          </h1>

          <h1
            className="text-7xl font-bold text-white relative
        [text-shadow:_0_0_7px_#f00,
        0_0_10px_#f00,
        0_0_21px_#f00,
        0_0_42px_#f00,
        0_0_82px_#f00,
        0_0_92px_#f00]
        after:content-['Neon_Red']
        after:absolute
        after:left-0
        after:top-0
        after:text-red-500
        after:[text-shadow:_0_0_7px_#f00]
        animate-[pulse_2s_ease-in-out_infinite]"
          >
            Neon Red
          </h1>
        </>
      )}
    </div>
  );
}
