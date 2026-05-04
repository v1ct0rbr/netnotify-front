import api from "@/config/axios";
import type { SimpleResponse } from "@/utils/SimpleResponse";
import { toast } from "sonner";

export type OfficeHoursSettingsDTO = {
  availabilityWindows: string;
};

type OfficeHoursSettingsApiDTO = {
  availabilityWindows?: string;
  availability_windows?: string;
};

const normalizeOfficeHoursSettings = (
  payload: OfficeHoursSettingsApiDTO | null | undefined
): OfficeHoursSettingsDTO => ({
  availabilityWindows: payload?.availabilityWindows ?? payload?.availability_windows ?? "[]",
});

export const useOfficeHoursApi = () => {
  const getOfficeHoursSettings = async (): Promise<OfficeHoursSettingsDTO> => {
    try {
      const response = await api.get<SimpleResponse<OfficeHoursSettingsApiDTO>>("/admin/office-hours");
      const result = response.data;

      if (result.status !== "SUCCESS") {
        throw new Error(result.message || "Erro ao carregar o expediente padrão.");
      }

      return normalizeOfficeHoursSettings(result.object);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar o expediente padrão.");
      throw error;
    }
  };

  const updateOfficeHoursSettings = async (
    payload: OfficeHoursSettingsDTO
  ): Promise<OfficeHoursSettingsDTO> => {
    try {
      const response = await api.put<SimpleResponse<OfficeHoursSettingsApiDTO>>("/admin/office-hours", payload);
      const result = response.data;

      if (result.status !== "SUCCESS") {
        throw new Error(result.message || "Erro ao atualizar o expediente padrão.");
      }

      toast.success(result.message || "Expediente padrão atualizado com sucesso.");
      return normalizeOfficeHoursSettings(result.object);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o expediente padrão.");
      throw error;
    }
  };

  return {
    getOfficeHoursSettings,
    updateOfficeHoursSettings,
  };
};
