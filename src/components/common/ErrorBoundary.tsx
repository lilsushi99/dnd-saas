import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50/80 border border-red-200/80 rounded-2xl text-red-900 my-4 shadow-2xs font-sans">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-red-900">
                {this.props.fallbackTitle || 'A module error occurred'}
              </h3>
              <p className="text-xs text-red-700">
                The component encountered an unexpected error. The system intercepted this to prevent a blank screen.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="mt-3 p-3 bg-white/80 border border-red-200/50 rounded-xl text-[11px] font-mono text-red-800 overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate-right"></i>
              <span>Reload Module</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
