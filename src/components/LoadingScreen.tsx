import React, { useEffect, useState } from 'react';

type LoadingScreenProps = {
  // Tempo (ms) para exibir o botão de repetir
  retryDelayMs?: number;
  // Handler opcional para repetir; se não informado, recarrega a aplicação
  onRetry?: () => void;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ retryDelayMs = 5000, onRetry }) => {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), retryDelayMs);
    return () => clearTimeout(timer);
  }, [retryDelayMs]);

  const handleRetry = () => {
    try {
      if (onRetry) {
        onRetry();
      } else {
        // Reinicia o flow de autenticação do zero
        window.location.replace('/');
      }
    } catch {
      window.location.replace('/');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-foreground">Carregando...</p>

        {showRetry && (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleRetry}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              REPETIR
            </button>
            <p className="mt-2 text-sm text-muted-foreground">Demorando? Clique em repetir para reiniciar a autenticação.</p>
          </div>
        )}
      </div>
    </div>
  );
};
