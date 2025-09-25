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
    const createMessage = async (data: CreateMessageDTO): Promise<SimpleResponse<number>> => {
        try {
            const response = await api.post<{res: SimpleResponse<number>}>('/messages/create', {
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
            query.append('page', params.page.toString());
            query.append('size', params.size.toString());
            if (params.content) query.append('content', params.content);
            if (params.levelId) query.append('levelId', params.levelId.toString());
            if (params.messageTypeId) query.append('messageTypeId', params.messageTypeId.toString());
            if (params.sortBy) query.append('sortBy', params.sortBy);
            if (params.sortOrder) query.append('sortOrder', params.sortOrder);
            const response = await api.get<{data: MessageResponseDTO[] }>('/messages/all?' + query.toString());
            console.log('response', response.data); 
            return {...response.data as unknown as ApiPageResponse<MessageResponseDTO>};
        } catch (error) {
            toast.error('Erro ao buscar mensagens.');
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