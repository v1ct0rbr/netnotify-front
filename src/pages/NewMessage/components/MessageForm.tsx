import useDepartmentsApi from '@/api/departments';
import { useMessagesApi } from '@/api/messages';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { MultiSelect } from '@/components/multi-select';
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
    publishedAt: z.string().optional(),
}).superRefine((data, ctx) => {
  // Se expireAt está preenchido, repeatIntervalMinutes é obrigatório e deve ser > 0
  if (data.expireAt && data.expireAt.trim()) {
    if (data.repeatIntervalMinutes === undefined || data.repeatIntervalMinutes === null || data.repeatIntervalMinutes <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'O intervalo de repetição é obrigatório quando a data de expiração é definida',
        path: ['repeatIntervalMinutes'],
      });
    }

    const expireDate = new Date(data.expireAt);
    if (isNaN(expireDate.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'Data de expiração inválida',
        path: ['expireAt'],
      });
    } else if (expireDate.getTime() <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        message: 'A data de expiração deve ser maior que a data corrente',
        path: ['expireAt'],
      });
    }
  }

  // Se publishedAt estiver definido, deve ser maior que a data corrente
  if (data.publishedAt && data.publishedAt.trim()) {
    const pubDate = new Date(data.publishedAt);
    if (isNaN(pubDate.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: 'Data de publicação inválida',
        path: ['publishedAt'],
      });
    } else if (pubDate.getTime() <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        message: 'A data de publicação deve ser maior que a data corrente',
        path: ['publishedAt'],
      });
    }
  }
});

type FormData = z.infer<typeof FormSchema>;

interface HomeFormProps {
  id?: string | null;
}

export const MessageForm: React.FC<HomeFormProps> = ({ id }: HomeFormProps) => {

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { getDepartments } = useDepartmentsApi();

  const { handleSubmit, control, reset, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: 0, expireAt: '', publishedAt: '' },
  });

  // Watch expireAt para controlar estado de repeatIntervalMinutes
  const expireAtValue = watch('expireAt');
  const hasExpireDate = expireAtValue && expireAtValue.trim();

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
        publishedAt: msg.publishedAt ?? '',
      });
    } catch (err) {
      console.error('Error resetting form values from message DTO:', err);
    }
  }, [msg, reset]);

  const submitForm = (data: FormData) => {
    createMessage({ title: data.title, content: htmlToString(data.content), level: data.level, type: data.type, departments: data.departments, sendToSubdivisions: data.sendToSubdivisions, repeatIntervalMinutes: data.repeatIntervalMinutes, expireAt: data.expireAt, publishedAt: data.publishedAt }).then(() => {
      toast.success('Mensagem criada com sucesso.');
      reset({ title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: 0, expireAt: '', publishedAt: '' });
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
              <label className="block text-sm font-medium mb-1">Departamentos</label>
              <Controller
                control={control}
                name="departments"
                render={({ field }) => (
                  <div>
                    <MultiSelect
                      options={(departmentsData || []).map((d: any) => ({ label: d.name, value: d.id }))}
                      value={field.value || []}
                      onValueChange={field.onChange}
                      placeholder="Select departments"
                    />
                    {errors.departments && <p className="text-red-500 text-sm mt-1">{errors.departments.message}</p>}
                  </div>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Enviar para Subdivisões</label>
              <Controller
                control={control}
                name="sendToSubdivisions"
                render={({ field }) => (
                  <div>
                    <StyledSelect
                      options={[{ label: 'Não', value: 'false' }, { label: 'Sim', value: 'true' }]}
                      value={field.value ? 'true' : 'false'}
                      onChange={(e) => field.onChange(e.target.value === 'true')}
                    />
                    {errors.sendToSubdivisions && <p className="text-red-500 text-sm mt-1">{errors.sendToSubdivisions.message}</p>}
                  </div>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Published At</label>
              <Controller
                control={control}
                name="publishedAt"
                render={({ field }) => (
                  <div>
                    <input
                      type="datetime-local"
                      {...field}
                      className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 ${errors.publishedAt ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.publishedAt && <p className="text-red-500 text-sm mt-1">{errors.publishedAt.message}</p>}
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
                      className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 ${errors.expireAt ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.expireAt && <p className="text-red-500 text-sm mt-1">{errors.expireAt.message}</p>}
                  </div>
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Repeat Interval (Minutes)
                {hasExpireDate && <span className="text-red-500">*</span>}
              </label>
              <Controller
                control={control}
                name="repeatIntervalMinutes"
                render={({ field }) => (
                  <div>
                    <input
                      type="number"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                      disabled={!hasExpireDate}
                      className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.repeatIntervalMinutes ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder={hasExpireDate ? 'Obrigatório quando data de expiração é definida' : 'Desabilitado - defina uma data de expiração primeiro'}
                      min={0}
                    />
                    {errors.repeatIntervalMinutes && <p className="text-red-500 text-sm mt-1">{errors.repeatIntervalMinutes.message}</p>}
                    {!hasExpireDate && <p className="text-gray-500 text-sm mt-1">Este campo é opcional. Ative preenchendo a data de expiração.</p>}
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

