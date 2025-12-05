"use client";

export default function LoadingSpinner({
  message = "Loading...",
  fullScreen = false
}: {
  message?: string;
  fullScreen?: boolean;
}) {
  const containerClass = fullScreen
    ? "fixed inset-0 h-screen w-screen flex flex-col justify-center items-center bg-white"
    : "flex flex-col justify-center items-center min-h-screen bg-white";

  return (
    <div className={containerClass}>
      <div className="relative">
        {/* Outer spinning ring */}
        <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
        {/* Animated spinner */}
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 border-r-blue-600 rounded-full animate-spin"></div>
        {/* Inner pulsing dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
      </div>
      {message && (
        <p className="mt-6 text-sm text-zinc-600 animate-pulse">{message}</p>
      )}
    </div>
  );
}
