import type { DepartmentDTO } from "@/api/departments";
import { zodResolver } from "@hookform/resolvers/zod";

import React from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

interface formDepartmentProps {
  departments: DepartmentDTO[] | undefined;
}

const FormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  parentDepartmentId: z.string().optional(),
});

type FormDepartmentData = z.infer<typeof FormSchema>;

const FormDepartment = ({ departments }: formDepartmentProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
     const { handleSubmit, control, reset, formState: { errors } } = useForm<FormDepartmentData>({
       resolver: zodResolver(FormSchema),
       defaultValues: { id: '', name: '', parentDepartmentId: undefined },
     });
  return <div>
    
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Controller
                    control={control}
                    name="title"
                    render={({ field }) => (
                      <div>
                        <input
                          type="text"
                          {...field}
                          className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Enter title"
                        />
                        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                      </div>
                    )}
                  />
                </div>
      <button type="submit" className="btn btn-primary">Salvar</button>
    </form>
  </div>;
}

export default FormDepartment;