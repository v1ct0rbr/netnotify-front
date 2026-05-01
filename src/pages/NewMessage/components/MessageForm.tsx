import useDepartmentsApi from '@/api/departments';
import { useMessagesApi } from '@/api/messages';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { MultiSelect } from '@/components/multi-select';
import TinyMceEditor from '@/components/TinyMceEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StyledSelect } from '@/components/ui/styled-select';
import api from '@/config/axios';
import { unescapeServerHtml } from '@/utils/StringUtils';
import { useFormStore } from '@/store/useFormStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { AlertCircle, FileText, Zap, Tag, Building2, GitBranch, Calendar, Clock, RefreshCw, Plus, MessageSquareText, Globe } from 'lucide-react';

const FormSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório').max(100, 'O título deve ter no máximo 100 caracteres').optional(),
  content: z.string().min(1, 'O conteúdo é obrigatório'),
  level: z.number().min(1, 'O nível é obrigatório'),
  type: z.number().min(1, 'O tipo é obrigatório'),
  departments: z.array(z.string()).optional(),
  sendToSubdivisions: z.boolean().optional(),
  repeatIntervalMinutes: z.number().min(1, 'O intervalo de repetição deve ser no mínimo 1 minuto').optional(),
  expireAt: z.string().optional(),
  publishedAt: z.string().optional(),
  agentScope: z.enum(['INTERNAL', 'EXTERNAL', 'BOTH']).default('BOTH').optional(),
}).superRefine((data, ctx) => {
  // Se expireAt está preenchido, repeatIntervalMinutes é obrigatório e deve ser > 0
  if (data.expireAt && data.expireAt.trim()) {
    if (!data.repeatIntervalMinutes || data.repeatIntervalMinutes < 1) {
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
  const { saveFormData, getFormData, clearFormData } = useFormStore();

  const { handleSubmit, control, reset, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: undefined, expireAt: '', publishedAt: '', agentScope: 'BOTH' },
  });

  // Watch expireAt para controlar estado do campo repeatIntervalMinutes
  const expireAtValue = watch('expireAt');
  const hasExpireDate = !!(expireAtValue && expireAtValue.trim());

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
        repeatIntervalMinutes: msg.repeatIntervalMinutes ?? undefined,
        expireAt: msg.expireAt ?? '',
        publishedAt: msg.publishedAt ?? '',
        agentScope: (msg.agentScope as 'INTERNAL' | 'EXTERNAL' | 'BOTH') ?? 'BOTH',
      });
    } catch (err) {
      console.error('Error resetting form values from message DTO:', err);
    }
  }, [msg, reset]);

  // ✅ NOVO: Limpar dados do formulário se parâmetro new=true na URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isNew = urlParams.get('new') === 'true';

    if (isNew) {
      console.log('✨ [MessageForm] Parâmetro new=true detectado - limpando formulário');
        clearFormData();
        reset({ title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: undefined, expireAt: '', publishedAt: '', agentScope: 'BOTH' });
    }
  }, []);

  // ✅ NOVO: Recuperar dados salvos ao montar o componente
  React.useEffect(() => {
    const savedData = getFormData();
    if (savedData && !id) { // Só restaura se não estiver editando uma mensagem existente
      console.log('✅ [MessageForm] Dados do formulário restaurados após reauth:', savedData);
      
      // Mostrar toast informando que o formulário foi recuperado
      toast.success('✅ Formulário restaurado! Seus dados foram preservados durante a reautenticação.');
      
      // Sanitiza repeatIntervalMinutes: 0 ou falsy → undefined (valores legados do localStorage)
      reset({
        ...savedData,
        repeatIntervalMinutes: savedData.repeatIntervalMinutes && savedData.repeatIntervalMinutes > 0
          ? savedData.repeatIntervalMinutes
          : undefined,
      });
    }
  }, []);

  // ✅ NOVO: Salvar dados do formulário automaticamente quando mudam
  React.useEffect(() => {
    const subscription = watch(() => {
      // Salva a cada mudança
      const data = watch();
      saveFormData({
        title: data.title ?? '',
        content: data.content ?? '',
        level: data.level ?? 0,
        type: data.type ?? 0,
        departments: data.departments ?? [],
        sendToSubdivisions: data.sendToSubdivisions ?? false,
        repeatIntervalMinutes: data.repeatIntervalMinutes,
        expireAt: data.expireAt ?? '',
        publishedAt: data.publishedAt ?? '',
        agentScope: data.agentScope ?? 'BOTH',
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, saveFormData]);

  const submitForm = (data: FormData) => {
    createMessage({ title: data.title, content: data.content, level: data.level, type: data.type, departments: data.departments, sendToSubdivisions: data.sendToSubdivisions, repeatIntervalMinutes: data.repeatIntervalMinutes, expireAt: data.expireAt, publishedAt: data.publishedAt }).then(() => {
      // ✅ NOVO: Limpar dados salvos após envio bem-sucedido
      console.log('✅ [MessageForm] Mensagem enviada com sucesso - limpando dados salvos');
      clearFormData();
      reset({ title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: undefined, expireAt: '', publishedAt: '', agentScope: 'BOTH' });
      toast.success('✅ Mensagem enviada com sucesso!');
    }).catch(err => {
      // ✅ NOVO: NÃO limpar dados se houver erro
      // Os dados são preservados para que o usuário possa tentar novamente
      console.warn('⚠️ [MessageForm] Erro ao enviar - dados preservados para novo envio');
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
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6 pb-16">
          {/* Informações Básicas */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-blue-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded"></div>
              <div className='w-full flex justify-between items-center'>
                <h3 className="text-lg font-semibold text-foreground justify-between">Informações Básicas


                </h3>
                <div className='flex items-center'>
                  <button type="button" onClick={() => reset()} className="ml-4 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 py-1 flex items-center gap-1">
                    <RefreshCw size={16} />
                    Restaurar
                  </button>
                  <button type="button" onClick={() => reset({ title: '', content: '', level: 0, type: 0, departments: [], sendToSubdivisions: false, repeatIntervalMinutes: undefined, expireAt: '', publishedAt: '', agentScope: 'BOTH' })} className="ml-4 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 py-1 flex items-center gap-1">
                    <Plus size={16} />
                    Novo Formulário
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Título */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />
                  <label className="block text-sm font-medium">Título</label>
                </div>
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <div>
                      <input
                        type="text"
                        {...field}
                        className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Digite o título da mensagem"

                      />
                      {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                      <p className="text-xs text-muted-foreground italic">Obrigatório: Identifique a mensagem com um título</p>
                    </div>
                  )}
                />
              </div>

              {/* Conteúdo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-cyan-500" />
                  <label className="block text-sm font-medium">Conteúdo</label>
                </div>
                <Controller
                  control={control}
                  name="content"
                  render={({ field }) => (
                    <div>
                      <TinyMceEditor key={msg ? `msg-content-${unescapeServerHtml(msg.content)}` : 'tinymce-initial'} value={field.value} onChange={field.onChange} />
                      {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
                      <p className="text-xs text-muted-foreground italic">Obrigatório: Use o editor para formatar o conteúdo</p>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Configuração da Mensagem */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-amber-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded"></div>
              <h3 className="text-lg font-semibold text-foreground">Configuração da Mensagem</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nível */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-500" />
                  <label className="block text-sm font-medium">Nível de Severidade</label>
                </div>
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
                      {errors.level && <p className="text-red-500 text-xs mt-1">{errors.level.message}</p>}
                      <p className="text-xs text-muted-foreground italic">Obrigatório: Define a importância da mensagem</p>
                    </div>
                  )}
                />
              </div>

              {/* Tipo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag size={18} className="text-orange-500" />
                  <label className="block text-sm font-medium">Tipo de Mensagem</label>
                </div>
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
                      {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
                      <p className="text-xs text-muted-foreground italic">Obrigatório: Categorize a mensagem</p>
                    </div>
                  )}
                />
              </div>

              {/* Departamentos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-orange-500" />
                  <label className="block text-sm font-medium">Departamentos</label>
                </div>
                <Controller
                  control={control}
                  name="departments"
                  render={({ field }) => (
                    <div>
                      <MultiSelect
                        options={(departmentsData || []).map((d: any) => ({ label: d.name, value: d.id }))}
                        value={field.value || []}
                        onValueChange={field.onChange}
                        placeholder="Selecione os departamentos"
                      />
                      {errors.departments && <p className="text-red-500 text-xs mt-1">{errors.departments.message}</p>}
                      <p className="text-xs text-muted-foreground italic">Opcional: Deixe vazio para enviar a todos</p>
                    </div>
                  )}
                />
              </div>

              {/* Enviar para Subdivisões */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GitBranch size={18} className="text-amber-500" />
                  <label className="block text-sm font-medium">Incluir Subdivisões</label>
                </div>
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
                      {errors.sendToSubdivisions && <p className="text-red-500 text-xs mt-1">{errors.sendToSubdivisions.message}</p>}
                      <p className="text-xs text-muted-foreground italic">Ativa a propagação para subdivisões</p>
                    </div>
                  )}
                />
              </div>

              {/* Visibilidade do Agente */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-amber-500" />
                  <label className="block text-sm font-medium">Visibilidade do Agente</label>
                </div>
                <Controller
                  control={control}
                  name="agentScope"
                  render={({ field }) => (
                    <div>
                      <StyledSelect
                        options={[
                          { label: 'Todos os Agentes (padrão)', value: 'BOTH' },
                          { label: 'Apenas Agentes Internos (rede local)', value: 'INTERNAL' },
                          { label: 'Apenas Agentes Externos (web)', value: 'EXTERNAL' },
                        ]}
                        value={field.value ?? 'BOTH'}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      {errors.agentScope && <p className="text-red-500 text-xs mt-1">{errors.agentScope.message}</p>}
                      <p className="text-xs text-muted-foreground italic">Define quais agentes receberão esta mensagem</p>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Agendamento e Repetição */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-purple-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded"></div>
              <h3 className="text-lg font-semibold text-foreground">Agendamento e Repetição</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Publicar em */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-purple-500" />
                  <label className="block text-sm font-medium">Publicar em</label>
                </div>
                <Controller
                  control={control}
                  name="publishedAt"
                  render={({ field }) => (
                    <div>
                      <input
                        type="datetime-local"
                        {...field}
                        className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all ${errors.publishedAt ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.publishedAt && <p className="text-red-500 text-xs mt-1">{errors.publishedAt.message}</p>}
                    </div>
                  )}
                />
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  onClick={() => {
                    reset({ ...watch(), publishedAt: '' });
                  }}
                >
                  ✕ Limpar data
                </button>
                <p className="text-xs text-muted-foreground italic">Opcional: data de publicação futura</p>
              </div>

              {/* Expirar em */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-pink-500" />
                  <label className="block text-sm font-medium">Expirar em</label>
                </div>
                <Controller
                  control={control}
                  name="expireAt"
                  render={({ field }) => (
                    <div>
                      <input
                        type="datetime-local"
                        {...field}
                        className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all ${errors.expireAt ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.expireAt && <p className="text-red-500 text-xs mt-1">{errors.expireAt.message}</p>}
                    </div>
                  )}
                />
                <button
                  type="button"
                  className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors"
                  onClick={() => {
                    reset({ ...watch(), expireAt: '' });
                  }}
                >
                  ✕ Limpar data
                </button>
                <p className="text-xs text-muted-foreground italic">Opcional: data de expiração da mensagem</p>
              </div>

              {/* Intervalo de Repetição */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RefreshCw size={18} className="text-pink-500" />
                  <label className="block text-sm font-medium">
                    Repetir (min)
                    {hasExpireDate && <span className="text-red-500 ml-1">*</span>}
                  </label>
                </div>
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
                        className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${errors.repeatIntervalMinutes ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder={hasExpireDate ? 'ex: 60' : 'Defina expiração primeiro'}
                        min={1}
                      />
                      {errors.repeatIntervalMinutes && <p className="text-red-500 text-xs mt-1">{errors.repeatIntervalMinutes.message}</p>}
                      {!hasExpireDate && <p className="text-xs text-amber-600 dark:text-amber-400 italic font-medium">⚠️ Ative preenchendo "Expirar em"</p>}
                      {hasExpireDate && <p className="text-xs text-green-600 dark:text-green-400 italic">✓ Obrigatório quando expiração ativa</p>}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-purple-200 dark:border-slate-700">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">💡 Dica:</span> Configure quando a mensagem será publicada, expirada e repetida automaticamente
              </p>
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={openDialog} className='btn-primary min-w-32'>
              <MessageSquareText size={18} className="mr-2" />
              Enviar Mensagem
            </Button>
          </div>
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

