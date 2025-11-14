import api from "@/config/axios";
import type { SimpleResponse } from "@/utils/SimpleResponse";
import { toast } from "sonner";

export type DepartmentDTO = {
    id: string;
    name: string;
    parentDepartmentId?: string;
}

type DepartmentInfo = {
    id: string;
    name: string;
}

export type DepartmentResponseDTO = {
    id: string;
    name: string;
    parentDepartment?: DepartmentInfo;
    
}

const useDepartmentsApi = () => {
    const getDepartments = async (): Promise<DepartmentResponseDTO[]> => {
        try {
            console.log('🔍 Buscando departamentos...');
            const response = await api.get<DepartmentResponseDTO[]>('/aux/departments');
            console.log('✅ Departamentos recebidos:', response.data);
            const data = response.data;
            return data;
        } catch (error) {
            throw error;
        }
    };
    
    const createDepartment = async (departmentDto: DepartmentDTO): Promise<SimpleResponse<String>> => {
        try {
            
            
            const response = await api.post<String>('/departments/create', departmentDto);

            return {
                object: response.data,
                message: 'Departamento criado com sucesso.',
                status: 'SUCCESS'
            };
        } catch (error) {
            toast.error(`Erro ao criar departamento. ${error}`);
            throw error;
        }
    };

    const updateDepartment = async (departmentDto: DepartmentDTO): Promise<SimpleResponse<String>> => {
        try {
            const response = await api.put<String>(`/departments/update`, departmentDto);
            return {
                object: response.data,
                message: 'Departamento atualizado com sucesso.',
                status: 'SUCCESS'
            };
        } catch (error) {
            toast.error(`Erro ao atualizar departamento. ${error}`);
            throw error;
        }
    };

    const deleteDepartment = async (departmentId: string): Promise<SimpleResponse<String>> => {
        try {
            const response = await api.delete<String>(`/departments/${departmentId}`);
            return {
                object: response.data,
                message: 'Departamento deletado com sucesso.',
                status: response.status === 200 ? 'SUCCESS' : 'ERROR'
            };
        } catch (error) {
            throw error;
        }
    };

    return {
        getDepartments,
        createDepartment,
        deleteDepartment
    };
};

export default useDepartmentsApi;