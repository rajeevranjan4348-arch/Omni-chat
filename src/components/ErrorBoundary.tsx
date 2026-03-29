import React from 'react';

interface Props {
  children: React.ReactNode;
  modeName?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    const isApiKeyError =
      this.state.message.toLowerCase().includes('api key') ||
      this.state.message.toLowerCase().includes('api_key') ||
      this.state.message.toLowerCase().includes('unauthorized') ||
      this.state.message.toLowerCase().includes('invalid');

    return (
      <div className="flex items-center justify-center h-full bg-slate-900 text-white px-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {this.props.modeName ? `${this.props.modeName} failed to load` : 'Something went wrong'}
          </h2>
          {isApiKeyError ? (
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              A <span className="text-amber-400 font-medium">GEMINI_API_KEY</span> is required for this feature.
              Add it in the <strong className="text-white">Secrets</strong> panel (the lock icon in the sidebar),
              then restart the app.
            </p>
          ) : (
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              {this.state.message || 'An unexpected error occurred in this mode.'}
            </p>
          )}
          <button
            onClick={this.reset}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
