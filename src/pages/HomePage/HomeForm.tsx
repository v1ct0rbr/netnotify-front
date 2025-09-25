import { useMessagesApi } from '@/api/messages';
import { JoditWrapper } from '@/components/jodit/JoditEditor';
import { Button } from '@/components/ui/button';
import { StyledSelect } from '@/components/ui/styled-select';
import api from '@/config/axios';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

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

  const { createMessage } = useMessagesApi();

  React.useEffect(() => {
    handleLoadLevels();
    handleLoadTypes();
  }, []);

  const onSubmit = (data: FormData) => {
    
    createMessage({content: data.content, levelId: data.level, messageTypeId: data.type}).then(res => {
      toast.success('Mensagem criada com sucesso.');
      console.log('Message created with ID:', res.object);
      // Optionally reset the form or show a success message
    }).catch(err => {
      console.error('Error creating message:', err);
    });
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
  <label className="block text-sm font-medium mb-1">Content</label>
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
  <label className="block text-sm font-medium mb-1">Level</label>
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
  <label className="block text-sm font-medium mb-1">Type</label>
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

  <Button className='btn-primary' type="submit">Enviar</Button>
    </form>
  );
}
