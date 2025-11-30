import type { DepartmentDTO } from "@/api/departments";
import useDepartmentsApi from "@/api/departments";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Plus, FileText, Edit } from "lucide-react";

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
    
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-blue-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded"></div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 size={20} className="text-blue-500" />
          {updating ? 'Atualizar Departamento' : 'Novo Departamento'}
        </h3>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nome */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              <label className="block text-sm font-medium">Nome do Departamento</label>
            </div>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <div>
                  <input
                    type="text"
                    {...field}
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Digite o nome do departamento"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                  <p className="text-xs text-muted-foreground italic">Obrigatório: Identifique o departamento</p>
                </div>
              )}
            />
          </div>

          {/* Departamento Pai */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-cyan-500" />
              <label className="block text-sm font-medium">Departamento Pai</label>
            </div>
            <Controller
              control={control}
              name="parentDepartmentId" 
              render={({ field }) => (
                <div>
                  <select
                    {...field}
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all ${errors.parentDepartmentId ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="">Nenhum</option>
                    {departments && departments.map((dept) => (
                      dept.id !== selectedDepartment?.id && (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      )
                    ))}
                  </select>
                  {errors.parentDepartmentId && <p className="text-red-500 text-xs mt-1">{errors.parentDepartmentId.message}</p>}
                  <p className="text-xs text-muted-foreground italic">Opcional: Crie uma hierarquia de departamentos</p>
                </div>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-3 border-t border-blue-200 dark:border-slate-700">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleNewDepartment}
            className="w-full md:w-auto"
          >
            <Plus size={18} className="mr-2" />
            Novo Departamento
          </Button>
          <Button 
            type="button" 
            onClick={openDialog} 
            className='btn-primary w-full md:w-auto'
          >
            {updating ? (
              <>
                <Edit size={18} className="mr-2" />
                Atualizar
              </>
            ) : (
              <>
                <Plus size={18} className="mr-2" />
                Salvar
              </>
            )}
          </Button>
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