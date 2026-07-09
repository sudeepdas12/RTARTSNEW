import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="m-6 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
          <AlertTriangle className="mb-3 h-6 w-6" aria-hidden="true" />
          <h1 className="text-lg font-semibold">This workspace could not be rendered.</h1>
          <p className="mt-2 text-sm">{this.state.error.message}</p>
          <Button className="mt-4" variant="danger" onClick={() => this.setState({ error: undefined })}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
