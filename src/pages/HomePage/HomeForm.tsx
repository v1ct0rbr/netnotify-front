import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { JoditWrapper } from '@/components/jodit/JoditEditor';
import { Button } from '@/components/ui/button';
import { StyledSelect } from '@/components/ui/styled-select';
import api from '@/config/axios';

const FormSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  level: z.number().min(1, 'Level is required'),
  type: z.number().min(1, 'Type is required')
});

type FormData = z.infer<typeof FormSchema>;

export const HomeForm: React.FC = () => {
  const { handleSubmit, control } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { content: '', level: 0, type: 0 }
  });

  const [levels, setLevels] = React.useState<{id:number;name:string}[]>([]);
  const [types, setTypes] = React.useState<{id:number;name:string}[]>([]);

  React.useEffect(() => {
    handleLoadLevels();
    handleLoadTypes();
  }, []);

  const onSubmit = (data: FormData) => {
    console.log('submit', data);
  }

  const handleLoadLevels = async () => {
    await api.get('/aux/levels').then(res => setLevels(res.data));   
    
  }

  const handleLoadTypes = async () => {
    await api.get('/aux/message-types').then(res => setTypes(res.data));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">Content</label>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <JoditWrapper value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium mb-1 text-slate-900 dark:text-slate-200">Level</label>
    <Controller
      control={control}
      name="level"
      render={({ field }) => (
        <StyledSelect
          options={[{ label: 'Selecione', value: '' }, ...(levels.map(l => ({ label: l.name, value: String(l.id) })))]}
          value={field.value === 0 ? '' : String(field.value)}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      )}
    />
  </div>

  <div>
    <label className="block text-sm font-medium mb-1 text-slate-900 dark:text-slate-200 ">Type</label>
    <Controller
      control={control}
      name="type"
      render={({ field }) => (
        <StyledSelect 
          options={[{ label: 'Selecione', value: '' }, ...(types.map(t => ({ label: t.name, value: String(t.id) })))]}
          value={field.value === 0 ? '' : String(field.value)}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      )}
    />
  </div>
</div>

      <Button className='text-slate-200 dark:text-slate-50 dark:bg-slate-200' type="submit">Enviar</Button>
    </form>
  );
}
