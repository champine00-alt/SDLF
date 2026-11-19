import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Erreur inattendue lors du chargement.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info.componentStack);
  }

  handleResetAndReload = (): void => {
    try {
      localStorage.removeItem('samadeal_listings');
      localStorage.removeItem('samadeal_favorites');
      localStorage.removeItem('samadeal_platform_settings');
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 text-center space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              SamaDeal a rencontré une erreur d’affichage
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Une donnée locale corrompue ou une erreur réseau a interrompu le lancement.
            </p>
            <div className="p-3 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-700 break-words text-left max-h-28 overflow-y-auto">
              {this.state.message}
            </div>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Réinitialiser le cache et relancer SamaDeal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
