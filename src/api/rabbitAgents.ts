import api from "@/config/axios";
import { toast } from "sonner";

export type RabbitAgentDTO = {
    queueName: string;
    queueType: "geral" | "departamento" | "outro";
    agentHostname: string;
    department: string | null;
    peerHost: string;
    peerPort: number;
    peerAddress: string;
    messageCount: number;
    connectionName: string;
};

export type DirectNotifyRequest = {
    title?: string;
    content: string;
    level?: string;
    type?: string;
};

export type SortBy = "queue" | "ip";
export type SortDirection = "asc" | "desc";

export const useRabbitAgentsApi = () => {
    const listAgents = async (
        sortBy: SortBy = "queue",
        direction: SortDirection = "asc"
    ): Promise<RabbitAgentDTO[]> => {
        try {
            const response = await api.get<RabbitAgentDTO[]>("/rabbit/agents", {
                params: { sortBy, direction },
            });
            return response.data;
        } catch (error) {
            toast.error("Erro ao listar agentes conectados.");
            throw error;
        }
    };

    const sendDirectMessage = async (
        queueName: string,
        payload: DirectNotifyRequest
    ): Promise<void> => {
        try {
            await api.post(`/rabbit/agents/${encodeURIComponent(queueName)}/notify`, payload);
            toast.success(`Mensagem enviada para ${queueName}.`);
        } catch (error) {
            toast.error("Erro ao enviar mensagem para o agente.");
            throw error;
        }
    };

    return { listAgents, sendDirectMessage };
};
