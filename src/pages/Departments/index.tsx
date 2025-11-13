import useDepartmentsApi from "@/api/departments";
import { authService } from "@/services/AuthService";
import type { DepartmentDTO } from "@/api/departments";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import FormDepartment from "./components/FormDepartment";
import ListDepartments from "./components/ListDepartments";

const DepartmentsPage = () => {

  // usuário precisa ser admin para acessar a página de departamentos
  const { isAdmin } = authService;
  const { getDepartments } = useDepartmentsApi();
  const [departments, setDepartments] = useState<DepartmentDTO[]>([]);
  
  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await getDepartments();
      setDepartments(res);
      return res;
    },
    staleTime: 10 * 60 * 1000,
  });
 

  return <>

  {isAdmin() ? (
    <>
      <FormDepartment departments={departmentsData} />
      <ListDepartments />    
    </>
  ) : (
    <p>Você não tem permissão para acessar esta página.</p>
  )}
    </>;
}

export default DepartmentsPage;