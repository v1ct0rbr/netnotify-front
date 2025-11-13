import api from "@/config/axios";

export type DepartmentDTO = {
    id: string;
    name: string;
    parentDepartmentId?: string;
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
    
    const createDepartment = async (departmentDto: DepartmentDTO): Promise<DepartmentDTO> => {
        try {
            const response = await api.post<DepartmentDTO>('/departments', departmentDto);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    return {
        getDepartments,
        createDepartment,
    };
};

export default useDepartmentsApi;