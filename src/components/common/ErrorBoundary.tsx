import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, FolderOpen, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Aura Crash Shield] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleOpenMusicDir = () => {
    if (window.auraAPI?.openThisPcFolder) {
      window.auraAPI.openThisPcFolder();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-dark-950 text-dark-100 flex flex-col items-center justify-center p-8 select-none font-sans">
          <div className="max-w-xl w-full bg-dark-900 border border-rose-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Aura Recovery Mode</h1>
                <p className="text-xs text-dark-400 mt-1">
                  A rendering error was caught safely. Your music files and stored songs remain safe on disk.
                </p>
              </div>
            </div>

            {/* Error Box */}
            <div className="bg-dark-950/80 border border-dark-800 rounded-2xl p-4 mb-6 font-mono text-xs overflow-x-auto text-rose-300 max-h-48 overflow-y-auto">
              <p className="font-bold mb-1 flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown runtime error'}</span>
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-dark-400 mt-2 whitespace-pre-wrap leading-relaxed">
                  {this.state.errorInfo.componentStack.trim().slice(0, 500)}
                </pre>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-2 border-t border-dark-800">
              <button
                onClick={this.handleOpenMusicDir}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-dark-200 text-xs font-semibold border border-dark-700 transition-colors flex items-center justify-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-dark-300" />
                <span>Open Files in Explorer</span>
              </button>

              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-aura-600 hover:bg-aura-500 text-white text-xs font-bold shadow-glow transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
