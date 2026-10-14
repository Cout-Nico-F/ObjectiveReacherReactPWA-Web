import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#11121C] text-[#F4F1FF] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1C1C2B] border border-[#FF5266]/50 rounded-[24px] p-6 text-center space-y-4 shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-white">Algo salió mal</h2>
            <p className="text-xs text-[#A8A3B8]">
              {this.state.error?.message || 'Ocurrió un error inesperado al procesar la acción.'}
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-[12px] bg-[#604094] text-white font-bold text-sm hover:bg-[#7549B8] transition"
            >
              Reiniciar aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
