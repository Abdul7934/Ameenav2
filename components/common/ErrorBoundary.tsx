import React, { Component, ErrorInfo, ReactNode } from 'react';
import Alert from './Alert';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  // FIX: Replaced constructor with a class property for state initialization to resolve type errors.
  state: State = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          title="Component Error"
          message={`Something went wrong in this section. Please try regenerating the content or refresh the page. Details: ${this.state.error?.message || 'Unknown error'}`}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
