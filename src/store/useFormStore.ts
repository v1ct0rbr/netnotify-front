import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FormData {
  title: string;
  content: string;
  level: number;
  type: number;
  departments: string[];
  sendToSubdivisions: boolean;
  repeatIntervalMinutes: number | undefined;
  expireAt: string;
  publishedAt: string;
  agentScope?: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
}

interface FormState {
  formData: FormData | null;
  saveFormData: (data: FormData) => void;
  getFormData: () => FormData | null;
  clearFormData: () => void;
  hasFormData: () => boolean;
}

export const useFormStore = create<FormState>()(
  persist(
    (set, get) => ({
      formData: null,

      saveFormData: (data: FormData) => {
        console.log('💾 [FormStore] Salvando dados do formulário:', data);
        set({ formData: data });
      },

      getFormData: () => {
        const state = get();
        if (state.formData) {
          console.log('📥 [FormStore] Recuperando dados do formulário:', state.formData);
        }
        return state.formData;
      },

      clearFormData: () => {
        console.log('🗑️ [FormStore] Limpando dados do formulário');
        set({ formData: null });
      },

      hasFormData: () => {
        const state = get();
        return !!state.formData && (
          state.formData.title.trim() !== '' ||
          state.formData.content.trim() !== '' ||
          state.formData.level !== 0 ||
          state.formData.type !== 0 ||
          state.formData.departments.length > 0
        );
      },
    }),
    {
      name: 'message-form-store', // nome da chave no localStorage
      partialize: (state) => ({ formData: state.formData }), // salvar apenas formData
    }
  )
);
