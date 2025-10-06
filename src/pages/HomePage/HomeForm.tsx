import { useMessagesApi } from '@/api/messages';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import TinyMceEditor from '@/components/TinyMceEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StyledSelect } from '@/components/ui/styled-select';
import api from '@/config/axios';
import { StringUtils } from '@/utils/StringUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const FormSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório').max(100, 'O título deve ter no máximo 100 caracteres').optional(),
  content: z.string().min(1, 'O conteúdo é obrigatório'),
  level: z.number().min(1, 'O nível é obrigatório'),
  type: z.number().min(1, 'O tipo é obrigatório')
});

type FormData = z.infer<typeof FormSchema>;

interface HomeFormProps {
  id?: string | null;
}

export const HomeForm: React.FC<HomeFormProps> = ({ id }: HomeFormProps) => {

  // função reutilizável para desempacotar HTML vindo do servidor


  const { htmlToString, unescapeServerHtml } = StringUtils();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const { handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { title: '', content: '', level: 0, type: 0 }
  });

  const { createMessage, getCreateMessageDtoById } = useMessagesApi();

  const { data: msg, isLoading: msgLoading } = useQuery({
    queryKey: ['messageDto', id],
    queryFn: async () => id ? await getCreateMessageDtoById(id) : null,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: levelsData, isLoading: levelsLoading } = useQuery({
    queryKey: ['levels'],
    queryFn: async () => {
      const res = await api.get('/aux/levels');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ['types'],
    queryFn: async () => {
      const res = await api.get('/aux/message-types');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = msgLoading || levelsLoading || typesLoading;

  React.useEffect(() => {
    if (!msg) return;
    console.log('Resetting form with message DTO:', msg);
    try {
      reset({
        title: msg.title ?? '',
        content: msg.content ?? '',
        level: msg.level ?? 0,
        type: msg.type ?? 0,
      });
    } catch (err) {
      console.error('Error resetting form values from message DTO:', err);
    }
  }, [msg, reset]);

  const submitForm = (data: FormData) => {
    createMessage({ title: data.title, content: htmlToString(data.content), level: data.level, type: data.type }).then(res => {
      toast.success('Mensagem criada com sucesso.');
      reset({ title: '', content: '', level: 0, type: 0 });
    }).catch(err => {
      toast.error('Erro ao criar mensagem.' + (err?.response?.data?.message ? ` ${err.response.data.message}` : ''));
    });
  }
  // openDialog will validate the form; only opens confirmation dialog when form is valid
  const openDialog = handleSubmit(() => setIsDialogOpen(true));
  // called when user confirms in dialog: finally submit (re-validates)
  const handleConfirmSend = () => {
    setIsDialogOpen(false);
    handleSubmit(submitForm)();
  };

  return (
    <>
      {isLoading ?
        <>
          <Skeleton className='w-full h-10 mb-4' />
          <Skeleton className='w-full h-10 mb-4' />
          <Skeleton className='w-full h-10 mb-4' />
        </>
        :
        // prevent default submit so we control submission via the button click (which validates before opening dialog)
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

          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <div>

                  <TinyMceEditor key={msg ? `msg-content-${unescapeServerHtml(msg.content)}` : 'tinymce-initial'} value={field.value} onChange={field.onChange} />
                  {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
                </div>
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
                  <div>
                    <StyledSelect
                      options={[{ label: 'Selecione', value: '' }, ...((levelsData || []).map((l: any) => ({ label: l.name, value: String(l.id) })))]}
                      value={field.value === 0 ? '' : String(field.value)}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    {errors.level && <p className="text-red-500 text-sm mt-1">{errors.level.message}</p>}
                  </div>
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div>
                    <StyledSelect
                      options={[{ label: 'Selecione', value: '' }, ...((typesData || []).map((t: any) => ({ label: t.name, value: String(t.id) })))]}
                      value={field.value === 0 ? '' : String(field.value)}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
                  </div>
                )}
              />
            </div>
          </div>

          {/* validate and open confirmation dialog on click */}
          <Button type="button" onClick={openDialog} className='btn-primary'>Enviar</Button>
        </form>
      }

      <ConfirmationDialog
        isOpen={isDialogOpen}
        title="Confirmar envio"
        description="Você tem certeza que deseja enviar esta mensagem?"
        confirmText="Enviar"
        cancelText="Cancelar"
        onClose={() => setIsDialogOpen(false)}
        callback={handleConfirmSend}
      />
    </>
  );
}

