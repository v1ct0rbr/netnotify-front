import type { DepartmentDTO, DepartmentResponseDTO } from "@/api/departments";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";

interface ListDepartmentsProps {
  departments: DepartmentResponseDTO[] | undefined;
  onDeleteDepartment: (departmentId: string) => void;  
  setSelectedDepartment: React.Dispatch<React.SetStateAction<DepartmentResponseDTO | null>>;
}

const ListDepartments = ({ departments, onDeleteDepartment, setSelectedDepartment }: ListDepartmentsProps) => {

  const handleEdit = (department: DepartmentResponseDTO) => {
    setSelectedDepartment(department);
  }

  return (
    <div className="w-full mt-4">
      {departments?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Nenhum departamento cadastrado.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-900 border-b">
                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-left">Nome</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-left">Departamento Pai</TableHead>
                <TableHead className="font-semibold text-right text-gray-700 dark:text-gray-300">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments && departments.map((dept) => (
                <TableRow 
                  key={dept.id}
                  className="border-b hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-150"
                >
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100 py-4 text-left">{dept.name}</TableCell>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100 py-4 text-left">{dept.parentDepartment?.name || '-'}</TableCell>
                  <TableCell className="text-right space-x-2 flex justify-end items-center gap-2 py-4">

                          <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(dept)}
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteDepartment(dept.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      title="Deletar departamento"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default ListDepartments;