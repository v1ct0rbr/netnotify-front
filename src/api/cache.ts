import api from "@/config/axios";
import type { SimpleResponse } from "@/utils/SimpleResponse";
import { toast } from "sonner";

export type ClearCacheResponse = {
    clearedCaches: string[];
    clearedCount: number;
};

export const useCacheApi = () => {
    const clearApplicationCache = async (): Promise<ClearCacheResponse> => {
        try {
            const response = await api.post<SimpleResponse<ClearCacheResponse>>("/admin/cache/clear");
            const result = response.data;

            if (result.status !== "SUCCESS") {
                throw new Error(result.message || "Erro ao limpar o cache da aplicação.");
            }

            toast.success(result.message || "Cache da aplicação limpo com sucesso.");
            return result.object;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao limpar o cache da aplicação.");
            throw error;
        }
    };

    return { clearApplicationCache };
};
