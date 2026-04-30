import React from "react";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  message = "Wczytywanie...",
  size = "md",
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <span className={`animate-spin ${sizeMap[size]}`}>⏳</span>
      {message && (
        <span className="font-black uppercase tracking-widest text-gray-400">
          {message}
        </span>
      )}
    </div>
  );
}
