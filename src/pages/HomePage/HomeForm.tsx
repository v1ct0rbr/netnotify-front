import useDepartmentsApi from '@/api/departments';
import { useMessagesApi } from '@/api/messages';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import TinyMceEditor from '@/components/TinyMceEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StyledSelect } from '@/components/ui/styled-select';
import api from '@/config/axios';
import { htmlToString, unescapeServerHtml } from '@/utils/StringUtils';
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
  type: z.number().min(1, 'O tipo é obrigatório'),
  departments: z.array(z.string()).optional(),
  sendToSubdivisions: z.boolean().optional(),
  repeatIntervalMinutes: z.number().min(0, 'O intervalo de repetição deve ser maior ou igual a 0').optional(),
  expireAt: z.string().optional(),
  

});

type FormData = z.infer<typeof FormSchema>;

interface HomeFormProps {
  id?: string | null;
}

export const HomeForm: React.FC<HomeFormProps> = ({ id }: HomeFormProps) => {

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const {getDepartments} = useDepartmentsApi();

  const { handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: 0, expireAt: '' },
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

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await getDepartments();
      return res;
    },
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = msgLoading || levelsLoading || typesLoading || departmentsLoading;

  React.useEffect(() => {
    if (!msg) return;
    console.log('Resetting form with message DTO:', msg);
    try {
      reset({
        title: msg.title ?? '',
        content: msg.content ?? '',
        level: msg.level ?? 0,
        type: msg.type ?? 0,
        departments: msg.departments ?? [],
        sendToSubdivisions: msg.sendToSubdivisions ?? false,
        repeatIntervalMinutes: msg.repeatIntervalMinutes ?? 0,
        expireAt: msg.expireAt ?? '',
      });
    } catch (err) {
      console.error('Error resetting form values from message DTO:', err);
    }
  }, [msg, reset]);

  const submitForm = (data: FormData) => {
    createMessage({ title: data.title, content: htmlToString(data.content), level: data.level, type: data.type, departments: data.departments, sendToSubdivisions: data.sendToSubdivisions, repeatIntervalMinutes: data.repeatIntervalMinutes, expireAt: data.expireAt }).then(() => {
      toast.success('Mensagem criada com sucesso.');
      reset({ title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: 0, expireAt: '' });
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
            <div>
              <label className="block text-sm font-medium mb-1">Departments</label>
              <Controller
                control={control}
                name="departments"
                render={({ field }) => (
                  <div>
                    <StyledSelect
                      options={((departmentsData || []).map((d: any) => ({ label: d.name, value: d.id })))}
                      value={(field.value ?? []).map(String)}
                      onChange={(e: any) => field.onChange(Array.isArray(e) ? e.map(Number) : e.map((item: any) => Number(item.value)))}
                      multiple
                    />
                    {errors.departments && <p className="text-red-500 text-sm mt-1">{errors.departments.message}</p>}
                  </div>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Repeat Interval (Minutes)</label>
              <Controller
                control={control}
                name="repeatIntervalMinutes"
                render={({ field }) => (
                  <div>
                    <input
                      type="number"
                      {...field}
                      className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.repeatIntervalMinutes ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter repeat interval in minutes"
                      min={0}
                    />
                    {errors.repeatIntervalMinutes && <p className="text-red-500 text-sm mt-1">{errors.repeatIntervalMinutes.message}</p>}
                  </div>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expire At</label>
              <Controller
                control={control}
                name="expireAt"
                render={({ field }) => (
                  <div>
                    <input
                      type="datetime-local"
                      {...field}
                      className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.expireAt ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.expireAt && <p className="text-red-500 text-sm mt-1">{errors.expireAt.message}</p>}
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

