import api from "@/config/axios";

export type DepartmentDTO = {
    id: string;
    name: string;
}

const useDepartmentsApi = () => {
    const getDepartments = async (): Promise<DepartmentDTO[]> => {
        try {
            const response = await api.get<DepartmentDTO[]>('/aux/departments');
            const data = response.data;
            return data;
        } catch (error) {
            throw error;
        }
    };

    return {
        getDepartments,
    };
};

export default useDepartmentsApi;