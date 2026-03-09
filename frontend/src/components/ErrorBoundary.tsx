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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-500">
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-gray-100 rounded-lg p-3 overflow-auto max-h-32 text-gray-700">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RotateCcw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
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
