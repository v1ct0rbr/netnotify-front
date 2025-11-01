import React from 'react';

export const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-foreground">Carregando...</p>
    </div>
  </div>
);
