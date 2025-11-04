"use client";

export default function LoadingSpinner({ 
  message = "Loading...", 
  fullScreen = false 
}: { 
  message?: string; 
  fullScreen?: boolean;
}) {
  const containerClass = fullScreen 
    ? "fixed inset-0 h-screen w-screen flex flex-col justify-center items-center bg-black"
    : "flex flex-col justify-center items-center min-h-screen bg-black";

  return (
    <div className={containerClass}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div className="w-16 h-16 border-4 border-white/10 rounded-full"></div>
        {/* Animated spinner */}
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-white border-r-white rounded-full animate-spin"></div>
        {/* Inner pulsing dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full animate-pulse"></div>
      </div>
      {message && (
        <p className="mt-6 text-sm text-zinc-400 animate-pulse">{message}</p>
      )}
    </div>
  );
}

