import api from "@/config/axios";
import type { ApiPageResponse } from "@/utils/ApiPageResponse";
import type { SimpleResponse } from "@/utils/SimpleResponse";
import { toast } from "sonner";

export type CreateMessageDTO = {
    content: string;
    level: number;
    type: number;
}

export type MessageResponseDTO = {
    id: string;
    content: string;
    level: string;
    messageType: string;
    user: string;
    createdAt: string;
    updatedAt: string;
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
    const createMessage = async (data: CreateMessageDTO): Promise<SimpleResponse<string>> => {
        try {
            const response = await api.post<{ res: Promise<SimpleResponse<string>> }>('/messages/create', {
                content: data.content,
                level: data.level,
                type: data.type
            });
            toast.success('Mensagem criada com sucesso.');
       
            return response.data.res;
        } catch (error) {
            toast.error('Erro ao criar mensagem.');
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
            console.log('response', response.data);
            return { ...response.data as unknown as ApiPageResponse<MessageResponseDTO> };
        } catch (error) {
            toast.error('Erro ao buscar mensagens.');
            console.error('Error fetching messages:', error);
            throw error;
        }

    };

    const deleteMessage = async (id: string): Promise<void> => {
        try {
            await api.delete(`/messages/${id}`);
            toast.success('Mensagem apagada com sucesso.');
        } catch (error) {
            toast.error('Erro ao apagar mensagem.');
            throw error;
        }
    };
    return {
        createMessage,
        filterMessages,
        deleteMessage,
    };
}