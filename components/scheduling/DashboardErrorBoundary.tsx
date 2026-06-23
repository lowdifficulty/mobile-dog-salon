"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export default class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 space-y-3">
          <p className="font-semibold">Something went wrong loading this page.</p>
          <p className="text-red-700">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
