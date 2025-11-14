import api from "@/config/axios";
import type { ApiPageResponse } from "@/utils/ApiPageResponse";
import type { SimpleResponse } from "@/utils/SimpleResponse";
import { toast } from "sonner";
import type { DepartmentResponseDTO } from "./departments";

export type CreateMessageDTO = {
    title?: string;
    content: string;
    level: number;
    type: number;
    departments?: string[];
    sendToSubdivisions?: boolean;
    repeatIntervalMinutes?: number;
    expireAt?: string;
}

export type MessageResponseDTO = {
    id: string;
    title?: string;
    content: string;
    level: `Baixo` | `Normal` | `Alto` | `Urgente`;
    messageType: string;
    user: string;
    createdAt: string;
    updatedAt: string;
    sendToSubdivisions: boolean;
    repeatIntervalMinutes: number | null;
    expireAt: string | null;
    lastSentAt: string | null;
    departments: DepartmentResponseDTO[];
}

interface MessagesFilterParams {
    page: number;
    size: number;
    content?: string;
    levelId?: number;
    messageTypeId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const useMessagesApi = () => {
    const getCreateMessageDtoById = async (id: string): Promise<CreateMessageDTO> => {
        try {
            const response = await api.get<CreateMessageDTO>(`/messages?clone-message-id=${id}`);
            const message = response.data;

            if (!message) {
                throw new Error('Erro ao buscar mensagem.');
            }
            return message;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao buscar mensagem.');
            throw error;
        }
    }

    const getMessageById = async (id: string): Promise<MessageResponseDTO> => {
        try {
            const response = await api.get<SimpleResponse<MessageResponseDTO>>(`/messages/${id}`);
            const message = response.data;

            if (message.status !== 'SUCCESS') {
                throw new Error(message.message || 'Erro ao buscar mensagem.');
            }
            return message.object as MessageResponseDTO;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao buscar mensagem.');
            throw error;
        }
    }

    const createMessage = async (data: CreateMessageDTO): Promise<SimpleResponse<string>> => {
        try {
            const response = await api.post<{ res: Promise<SimpleResponse<string>> }>('/messages/create', {
                title: data.title,
                content: data.content,
                level: data.level,
                type: data.type
            });
            toast.success('Mensagem criada com sucesso.');

            return response.data.res;
        } catch (error) {
            throw error;
        }
    };

    const filterMessages = async (params: MessagesFilterParams): Promise<ApiPageResponse<MessageResponseDTO>> => {
        try {
            const query = new URLSearchParams();


            if (params.content) query.append('content', params.content);
            if (params.levelId) query.append('levelId', params.levelId.toString());
            if (params.messageTypeId) query.append('messageTypeId', params.messageTypeId.toString());


            if (params.size == undefined || params.size < 1) params.size = 1;
            if (params.size > 100) params.size = 100;
            query.append('size', params.size.toString());
            if (params.page == undefined || params.page < 0) params.page = 0;
            if (params.page > 1000) params.page = 1000;
            query.append('page', params.page.toString());

            if (params.sortBy) query.append('sortBy', params.sortBy);
            if (params.sortOrder) query.append('sortOrder', params.sortOrder);
            const response = await api.get<{ data: MessageResponseDTO[] }>('/messages/all?' + query.toString());

            return { ...response.data as unknown as ApiPageResponse<MessageResponseDTO> };
        } catch (error) {
            toast.error('Erro ao buscar mensagens.');
            console.error('Error fetching messages:', error);
            throw error;
        }

    };

    const deleteMessage = async (id: string): Promise<void> => {
        try {
            await api.delete(`/messages/delete?id=${id}`);
            toast.success('Mensagem apagada com sucesso.');
        } catch (error) {
            toast.error('Erro ao apagar mensagem.');
            throw error;
        }
    };
    return {
        getCreateMessageDtoById,
        getMessageById,
        createMessage,
        filterMessages,
        deleteMessage,
    };
}