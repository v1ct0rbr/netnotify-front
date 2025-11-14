import type { DepartmentDTO } from "@/api/departments";
import useDepartmentsApi from "@/api/departments";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { queryClient } from "@/lib/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2Icon } from "lucide-react";

import React, { use } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

interface formDepartmentProps {
  departments: DepartmentDTO[] | undefined;
  selectedDepartment: DepartmentDTO | null;
  
}

const FormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  parentDepartmentId: z.string().optional(),
});

type FormDepartmentData = z.infer<typeof FormSchema>;

const FormDepartment = ({ departments, selectedDepartment }: formDepartmentProps) => {

  const { createDepartment } = useDepartmentsApi();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
     const { handleSubmit, control, reset, formState: { errors } } = useForm<FormDepartmentData>({
       resolver: zodResolver(FormSchema),
       defaultValues: { id: '', name: '', parentDepartmentId: undefined },
     });

     React.useEffect(() => {
       if (selectedDepartment) {
         reset({
           id: selectedDepartment.id,
           name: selectedDepartment.name,
           parentDepartmentId: selectedDepartment.parentDepartmentId || undefined,
         });
          setUpdating(true);
       } else {
         reset({
           id: '',
           name: '',
           parentDepartmentId: undefined,
         });
       }
     }, [selectedDepartment, reset]);
     const openDialog = handleSubmit(() => setIsDialogOpen(true));

      const handleConfirmSend = () => {
    setIsDialogOpen(false);
    handleSubmit(handleCreateDepartment)();
  };

  const handleNewDepartment = () => {
    reset({
      id: '',
      name: '',
      parentDepartmentId: undefined,
    });
    setUpdating(false);
  }

   const handleCreateDepartment = (department: FormDepartmentData) => {
    // Lógica para criar departamento
    let departmentDto = {
      id: department.id || undefined,
      name: department.name,
      parentDepartmentId: department.parentDepartmentId || null,
    } as DepartmentDTO;
    createDepartment(departmentDto).then((res) => {
      if(res.status === 'SUCCESS'){
        // Refetch departments after successful creation
        queryClient.invalidateQueries({ queryKey: ['departments'] });
        toast.success(department.id != '' ? 'Departamento atualizado com sucesso!' : 'Departamento criado com sucesso!');
      }
      else {
        toast.error('Erro ao criar departamento: ' + res.message);
      }

    });
  }
  return <>
    
    <div>
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <div>
        {/* id hidden */}
        <Controller
          control={control}
          name="id"
          render={({ field }) => (
            <input type="hidden" {...field} />
          )}
        />
        
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <div>
                        <input
                          type="text"
                          {...field}
                          className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                          placeholder="Enter name"
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                      </div>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Departamento Pai</label>
                  <Controller
                    control={control}
                    name="parentDepartmentId" 
                    render={({ field }) => (
                      <div>
                        <select
                          {...field}
                          className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${errors.parentDepartmentId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        >
                          <option value="">Nenhum</option>
                            {departments && departments.map((dept) => (
                            dept.id !== selectedDepartment?.id && (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            )
                            ))}
                        </select>
                        {errors.parentDepartmentId && <p className="text-red-500 text-sm mt-1">{errors.parentDepartmentId.message}</p>}
                      </div>
                    )}
                  />
                </div>
                </div>
                <div className="flex items-center justify-center">
      <button type="submit" className="btn btn-primary" onClick={openDialog}>
        {updating ? 'Atualizar' : 'Salvar'}
        </button>
      <button type="button" className="btn btn-secondary ml-2 flex items-center" onClick={handleNewDepartment} >
        <FilePlus2Icon className="mr-2" />
        Novo Departamento
      </button>
    </div>
    </form>
     <ConfirmationDialog 

            isOpen={isDialogOpen}
            title="Confirmar envio"
            description="Você tem certeza que deseja enviar esta mensagem?"
            confirmText="Enviar"
            cancelText="Cancelar"
            onClose={() => setIsDialogOpen(false)}
            callback={handleConfirmSend}
          />
   
    </div>
  </>;
}

export default FormDepartment;