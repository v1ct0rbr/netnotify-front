import api from "@/config/axios";
import { toast } from "sonner";

//  @GetMapping("/all")
//     public ResponseEntity<SimpleResponseUtils<Page<MessageResponseDto>>> getAllMessages(
//             @ModelAttribute MessageFilter filter,
//             Pageable pageable) {
//         try {
//             Page<MessageResponseDto> messages = messageService.findAllMessages(filter, pageable);
//             return ResponseEntity.ok(SimpleResponseUtils.success(messages));
//         } catch (Exception e) {
//             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                     .body(SimpleResponseUtils.error(null, "Erro ao buscar mensagens."));
//         }
//     }


type ApiMessageResponse<T> = {
    object: {
        page: number;
        size: number;
        totalElements: number;
        content: T[];
    };

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
    pageSize: number;
    content?: string;
    levelId?: number;
    messageTypeId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const useMessagesApi = () => {
    const filterMessages = async (params: MessagesFilterParams): Promise< MessageResponseDTO[]> => {
        try {
            const query = new URLSearchParams();
            query.append('page', params.page.toString());
            query.append('pageSize', params.pageSize.toString());
            if (params.content) query.append('content', params.content);
            if (params.levelId) query.append('levelId', params.levelId.toString());
            if (params.messageTypeId) query.append('messageTypeId', params.messageTypeId.toString());
            if (params.sortBy) query.append('sortBy', params.sortBy);
            if (params.sortOrder) query.append('sortOrder', params.sortOrder);
            const response = await api.get<{data: MessageResponseDTO[] }>('/messages/all?' + query.toString());
            console.log('response', response.data); 
            return response.data.data;
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
        filterMessages,
        deleteMessage,
    };
}