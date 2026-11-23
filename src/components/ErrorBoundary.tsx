import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  locale?: 'id' | 'en';
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

function resolveFallbackLocale(propLocale?: 'id' | 'en'): 'id' | 'en' {
  if (propLocale === 'en' || propLocale === 'id') return propLocale;
  if (typeof document !== 'undefined' && document.documentElement.lang === 'en') {
    return 'en';
  }
  return 'id';
}

/**
 * Bilingual React error boundary that catches rendering failures in route chunks
 * and offers safe recovery actions without exposing raw stack traces.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || '',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.assign('/home');
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const locale = resolveFallbackLocale(this.props.locale);
    const isEn = locale === 'en';

    return (
      <div
        role="alert"
        className="max-w-xl mx-auto my-10 card p-6 sm:p-8 border-[var(--border-subtle)] text-center space-y-5"
      >
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--danger-soft)] border border-[var(--danger-border)] flex items-center justify-center text-[var(--danger)]">
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[var(--ink-900)]">
            {isEn ? 'Something went wrong while displaying this page' : 'Terjadi kendala saat menampilkan halaman ini'}
          </h2>
          <p className="text-sm text-[var(--ink-700)] leading-relaxed">
            {isEn
              ? 'Your local encrypted health data remains safe on this device. Please reload the page or return to your dashboard.'
              : 'Data kesehatan terenkripsi Anda tetap aman di perangkat ini. Silakan muat ulang halaman atau kembali ke beranda.'}
          </p>
          {this.state.errorMessage && (
            <p className="text-xs font-mono text-[var(--ink-500)] bg-[var(--bg-subtle)] rounded-lg px-3 py-2 break-words">
              {this.state.errorMessage}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button type="button" onClick={this.handleReload} className="btn btn-primary px-5 py-2.5 text-sm">
            <RotateCcw size={16} />
            <span>{isEn ? 'Reload page' : 'Muat ulang halaman'}</span>
          </button>
          <button type="button" onClick={this.handleGoHome} className="btn btn-secondary px-5 py-2.5 text-sm">
            <Home size={16} />
            <span>{isEn ? 'Return to Home' : 'Kembali ke Beranda'}</span>
          </button>
        </div>
      </div>
    );
  }
}
