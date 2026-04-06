import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="font-display text-3xl md:text-4xl tracking-wider">
                SOMETHING WENT WRONG
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>

            {/* Error details (collapsed by default in production) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-muted/50 p-4 rounded-lg text-xs">
                <summary className="cursor-pointer text-muted-foreground font-medium mb-2">
                  Technical Details
                </summary>
                <pre className="whitespace-pre-wrap text-destructive overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={this.handleRetry}
                className="w-full sm:w-auto rounded-none gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                TRY AGAIN
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full sm:w-auto rounded-none gap-2 border-2"
              >
                <Home className="w-4 h-4" />
                GO HOME
              </Button>
            </div>

            {/* Subtle branding */}
            <p className="text-xs text-muted-foreground/50 tracking-wider">
              BCUTZ • Premium Booking
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
