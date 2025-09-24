
export type MessagesDTO = {
    id: number;
    content: string;
    createdAt: string;
    sender: string;
}

interface MessagesFilterParams {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const useMessagesApi = () => {
    const filterMessages = async (params: MessagesFilterParams) => {
    }
}