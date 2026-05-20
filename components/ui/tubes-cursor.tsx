"use client";

import React, { useEffect, useRef } from 'react';

// The main App component that encapsulates the animation
// In React, component names must start with a capital letter to be recognized as components.
// I've renamed the function from "component" to "TubesCursor".
export default function TubesCursor() {
  // useRef to get a persistent reference to the canvas element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // useRef to hold the animation instance so we can call its methods
  const appRef = useRef<any>(null);

  /**
   * Generates an array of random hex color strings.
   * @param {number} count - The number of random colors to generate.
   * @returns {string[]} An array of color strings.
   */
  const randomColors = (count: number): string[] => {
    return new Array(count)
      .fill(0)
      .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  };

  // This effect runs once when the component mounts
  useEffect(() => {
    // The error "Computed radius is NaN" suggests a race condition where the animation 
    // library initializes before the canvas element has its final dimensions, leading 
    // to invalid geometry calculations. Delaying the initialization with setTimeout 
    // ensures the DOM is fully painted and ready.
    
    let script: HTMLScriptElement | null = null;
    let initTimer: NodeJS.Timeout | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    // Check if script is already loaded
    const existingScript = document.querySelector('script[data-tubes-cursor]');
    if (existingScript && (window as any).__TUBES_CURSOR__) {
      initializeAnimation();
    } else {
      // Create a module script that exports to window
      script = document.createElement('script');
      script.type = 'module';
      script.setAttribute('data-tubes-cursor', 'true');
      script.textContent = `
        import TubesCursor from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';
        window.__TUBES_CURSOR__ = TubesCursor;
        window.dispatchEvent(new Event('tubes-cursor-loaded'));
      `;
      document.head.appendChild(script);

      // Listen for the load event
      window.addEventListener('tubes-cursor-loaded', initializeAnimation);
    }

    function initializeAnimation() {
      initTimer = setTimeout(() => {
        const TubesCursorFn = (window as any).__TUBES_CURSOR__;
        
        if (canvasRef.current && TubesCursorFn && typeof TubesCursorFn === 'function') {
          try {
            const app = TubesCursorFn(canvasRef.current, {
              tubes: {
                colors: ["#5e72e4", "#8965e0", "#f5365c"],
                lights: {
                  intensity: 200,
                  colors: ["#21d4fd", "#b721ff", "#f4d03f", "#11cdef"]
                }
              }
            });
            appRef.current = app;
          } catch (error) {
            console.error("Error initializing TubesCursor:", error);
          }
        } else if (!TubesCursorFn) {
          // If not loaded yet, check periodically
          checkInterval = setInterval(() => {
            const fn = (window as any).__TUBES_CURSOR__;
            if (fn && canvasRef.current && typeof fn === 'function') {
              clearInterval(checkInterval!);
              try {
                const app = fn(canvasRef.current, {
                  tubes: {
                    colors: ["#5e72e4", "#8965e0", "#f5365c"],
                    lights: {
                      intensity: 200,
                      colors: ["#21d4fd", "#b721ff", "#f4d03f", "#11cdef"]
                    }
                  }
                });
                appRef.current = app;
              } catch (error) {
                console.error("Error initializing TubesCursor:", error);
              }
            }
          }, 100);
          
          // Stop checking after 5 seconds
          setTimeout(() => {
            if (checkInterval) {
              clearInterval(checkInterval);
            }
          }, 5000);
        }
      }, 200); // 200ms delay to ensure DOM is ready
    }

    // Cleanup function
    return () => {
      window.removeEventListener('tubes-cursor-loaded', initializeAnimation);
      if (initTimer) {
        clearTimeout(initTimer);
      }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      // Don't remove the script as it might be used by other instances
      // Check if app was initialized and has a dispose method before calling
      if (appRef.current && typeof appRef.current.dispose === 'function') {
        appRef.current.dispose();
      }
    };
  }, []); // The empty dependency array ensures this effect runs only once


  // Handles click events on the main container
  const handleClick = () => {
    if (appRef.current) {
      const newTubeColors = randomColors(3);
      const newLightColors = randomColors(4);
      
      // Update the colors in the running animation
      appRef.current.tubes.setColors(newTubeColors);
      appRef.current.tubes.setLightsColors(newLightColors);
    }
  };

  return (
    // Main container with full-screen styles and click handler
    <div
      onClick={handleClick}
      className="absolute inset-0 w-full h-full bg-black overflow-hidden"
    >
      {/* Canvas element for the animation, positioned behind everything else */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full" />
    </div>
  );
}

