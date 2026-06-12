import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught a crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-red-950/40 border border-red-500/25 rounded-3xl text-center space-y-4 backdrop-blur-lg animate-shake">
          <div className="inline-flex p-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-2">
            <AlertCircle size={32} />
          </div>
          
          <h2 className="text-xl font-bold text-white tracking-wide">Workspace Rendering Exception</h2>
          
          <p className="text-sm text-red-300 max-w-md mx-auto font-semibold leading-relaxed">
            {this.state.error?.toString() || "A critical runtime error crashed the renderer."}
          </p>
          
          <pre className="mt-4 p-4 rounded-2xl bg-slate-950 text-left text-xs font-mono text-red-400/80 overflow-x-auto border border-white/5 max-h-[180px] leading-relaxed">
            {this.state.error?.stack}
          </pre>
          
          <button
            onClick={() => {
              // Reset local storage / state
              window.location.reload();
            }}
            className="mt-6 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 mx-auto transition duration-300 border border-white/5"
          >
            <RotateCcw size={13} />
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
