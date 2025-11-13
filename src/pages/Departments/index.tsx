import useDepartmentsApi, { type DepartmentDTO } from "@/api/departments";
import { Skeleton } from "@/components/ui/skeleton";
import { authService } from "@/services/AuthService";
import { useQuery } from "@tanstack/react-query";
import FormDepartment from "./components/FormDepartment";
import ListDepartments from "./components/ListDepartments";
import { queryClient } from "@/lib/react-query";
import { toast } from "sonner";
import React from "react";

const DepartmentsPage = () => {

  // usuário precisa ser admin para acessar a página de departamentos
  const { isAdmin } = authService;
  const { getDepartments, createDepartment, deleteDepartment } = useDepartmentsApi();
  const [selectedDepartment, setSelectedDepartment] = React.useState<DepartmentDTO | null>(null);
  
  
  
  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await getDepartments();  
      return res;
    },
    staleTime: 10 * 60 * 1000,
  });

 

  const handleDeleteDepartment = (departmentId: string) => {
    // Lógica para deletar departamento
    // Após deletar, refetch departments

    deleteDepartment(departmentId).then((res) =>
    {
      if(res.status === 'SUCCESS'){
        queryClient.invalidateQueries({ queryKey: ['departments'] });
        toast.success('Departamento deletado com sucesso!');
      }
      else {
        toast.error('Erro ao deletar departamento: ' + res.message);
      }
    });
    
  }
 

  return <div className="p-4">

  {isAdmin() ? (
    <>
      <FormDepartment departments={departmentsData} selectedDepartment={selectedDepartment} />
      {departmentsLoading ? (
      <Skeleton className="h-6 w-full mt-4" />
    ) : (
      <ListDepartments departments={departmentsData} onDeleteDepartment={handleDeleteDepartment} setSelectedDepartment={setSelectedDepartment} />    
    )}
    </>
  ) : (
    <p>Você não tem permissão para acessar esta página.</p>
  )}
    </div>;
}

export default DepartmentsPage;