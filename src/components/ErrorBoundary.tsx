import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected rendering error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error && parsed.operationType) {
        readable = `Database ${parsed.operationType} blocked on ${parsed.path || 'record'}: ${parsed.error}`;
      }
    } catch {
      // Plain error string
    }
    return { hasError: true, errorMessage: readable };
  }

  componentDidCatch(error: Error) {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-[#0A1628]">Something interrupted this view</h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A1628] text-white text-sm font-medium hover:bg-[#162744] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Return to Portal Hub
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
