import { useMessagesApi } from '@/api/messages';
import { JoditWrapper } from '@/components/jodit/JoditEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StyledSelect } from '@/components/ui/styled-select';
import api from '@/config/axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
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

interface HomeFormProps {
  id?: string | null;
}


export const HomeForm: React.FC<HomeFormProps> = ({ id }: HomeFormProps) => {



  const { handleSubmit, control, setValue, reset } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { content: '', level: 0, type: 0 }
  });

  const [levels, setLevels] = React.useState<{ id: number; name: string }[]>([]);
  const [types, setTypes] = React.useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { createMessage, getCreateMessageDtoById } = useMessagesApi();


  // Module-level cache for clone fetches. This deduplicates inflight requests
  // across component mounts (useful to avoid duplicate network calls in
  // StrictMode or remounts).
  const { data: msg } = useQuery({
    queryKey: ['messageDto', id],
    queryFn: () => id ? getCreateMessageDtoById(id) : null,
    enabled: !!id,  // Só roda se id existir
    staleTime: 5 * 60 * 1000,  // Cache por 5min
  });

  const { data: levelsData } = useQuery({
    queryKey: ['levels'],
    queryFn: async () => {
      console.log("Loading levels...")
      const res = await api.get('/aux/levels');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,  // Cache por 10min
  });

  const { data: typesData } = useQuery({
    queryKey: ['types'],
    queryFn: async () => {
      console.log("Loading types...")
      const res = await api.get('/aux/message-types');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,  // Cache por 10min
  });

  React.useEffect(() => {
    const loadAll = async () => {
      try {
        // Load levels and types in parallel
        await Promise.all([handleLoadLevels(), handleLoadTypes()])
        if (msg) {
          setValue("content", msg.content || "")
          setValue("level", msg.level || 0)
          setValue("type", msg.type || 0)
        }
      } catch (err) {
        console.error("Error loading form data:", err)
        toast.error("Failed to load form data.")
      }
    }
    loadAll()
    // Only re-run when the provided `id` changes. We intentionally omit
    // `getCreateMessageDtoById` from deps because its identity may be unstable
    // from the custom hook; we guard via a module-level cache above.
    // eslint-disable-next-line react-hooks/exhaustive-deps

    setLoading(false);
  }, [msg])

  const onSubmit = (data: FormData) => {
    console.log(data);
    createMessage({ content: data.content, level: data.level, type: data.type }).then(res => {
      
      toast.success('Mensagem criada com sucesso.');
      console.log('Message created with ID:', res.object);
      // limpa formulário ao concluir corretamente
      reset({ content: '', level: 0, type: 0 });
      setClonedMessage(null);
       // Optionally reset the form or show a success message
    }).catch(err => {
      console.error('Error creating message:', err);
    });
  }

  const handleLoadLevels = async () => {

    setLevels(levelsData || []);


  }

  const handleLoadTypes = async () => {

    setTypes(typesData || []);
  }

  return (
    <>
      {loading ?
        <>
          <Skeleton className='w-full h-10 mb-4' />
          <Skeleton className='w-full h-10 mb-4' />
          <Skeleton className='w-full h-10 mb-4' />
        </>
        :
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
      }
    </>

  );
}
function setClonedMessage(arg0: null) {
  throw new Error('Function not implemented.');
}

