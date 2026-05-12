import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-app-page p-6">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-app">Something went wrong</h1>
            <p className="text-sm text-app-muted">
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-app-border-subtle border border-app-border rounded-lg p-3 overflow-auto max-h-32 text-app-muted">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-app-accent hover:bg-app-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RotateCcw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 border border-app-input-border hover:bg-app-border-subtle text-app rounded-lg text-sm font-medium transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
