import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AvailabilityWindow = {
  day: string;       // ISO day of week: "1"=Seg, "7"=Dom
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
};

export type ScheduleTimeGroup = {
  day: string;
  times: string[];
};

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
  scheduleType: 'NONE' | 'INTERVAL' | 'WEEKLY' | 'MONTHLY';
  scheduleDaysOfWeek: string[];
  scheduleTimes: ScheduleTimeGroup[];
  scheduleMonthDays: string[];
  availabilityWindows: AvailabilityWindow[];
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
