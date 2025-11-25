import { create } from 'zustand';

interface NavigationState {
  redirectUrl: string | null;
  setRedirectUrl: (url: string | null) => void;
  getRedirectUrl: () => string | null;
  clearRedirectUrl: () => void;
}

/**
 * Store para gerenciar o URL de redirecionamento após autenticação
 * Quando o usuário precisa revalidar a sessão, voltará para a página onde estava
 */
export const useNavigationStore = create<NavigationState>((set, get) => ({
  redirectUrl: null,

  setRedirectUrl: (url: string | null) => {
    if (url) {
      console.log('📍 [Navigation] Salvando URL de redirecionamento:', url);
    }
    set({ redirectUrl: url });
  },

  getRedirectUrl: () => {
    const state = get();
    if (state.redirectUrl) {
      console.log('📍 [Navigation] Recuperando URL de redirecionamento:', state.redirectUrl);
    }
    return state.redirectUrl;
  },

  clearRedirectUrl: () => {
    console.log('🗑️ [Navigation] Limpando URL de redirecionamento');
    set({ redirectUrl: null });
  },
}));
