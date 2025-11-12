import { authService } from "@/services/AuthService";
import FormDepartment from "./components/FormDepartment";
import ListDepartments from "./components/ListDepartments";

const DepartmentsPage = () => {

  // usuário precisa ser admin para acessar a página de departamentos
  const { isAdmin } = authService;


  return <>

  {isAdmin() ? (
    <>
      <FormDepartment />
      <ListDepartments />    
    </>
  ) : (
    <p>Você não tem permissão para acessar esta página.</p>
  )}
    </>;
}

export default DepartmentsPage;