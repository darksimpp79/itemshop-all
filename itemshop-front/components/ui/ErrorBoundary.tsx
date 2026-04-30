"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback?.(this.state.error!) || (
          <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white p-6">
            <div className="max-w-md text-center">
              <div className="text-6xl mb-6">⚠️</div>
              <h1 className="text-2xl font-black uppercase mb-4">Coś poszło nie tak</h1>
              <p className="text-gray-400 text-sm mb-8">
                {this.state.error?.message || "Nieznany błąd"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#bbf028] text-black px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110"
              >
                Odśwież stronę
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
