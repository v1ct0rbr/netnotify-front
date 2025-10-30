import { useEffect } from 'react';

/**
 * Hook para debug da URL, útil para diagnosticar problemas com parâmetros OAuth
 */
export const useDebugURL = () => {
  useEffect(() => {
    // Monitora mudanças na URL
    const handlePopState = () => {
      console.log('📍 URL mudou:', {
        href: window.location.href,
        search: window.location.search,
        hash: window.location.hash,
        pathname: window.location.pathname,
        origin: window.location.origin
      });
    };

    window.addEventListener('popstate', handlePopState);
    
    // Log inicial
    console.log('🌐 URL inicial:', {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      pathname: window.location.pathname,
      origin: window.location.origin,
      complete_search_params: new URLSearchParams(window.location.search).toString(),
      complete_hash_params: new URLSearchParams(window.location.hash.substring(1)).toString()
    });

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
};
