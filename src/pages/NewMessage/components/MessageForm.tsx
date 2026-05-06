import useDepartmentsApi from '@/api/departments';
import { useMessagesApi } from '@/api/messages';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { MultiSelect } from '@/components/multi-select';
import TinyMceEditor from '@/components/TinyMceEditor';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { StyledSelect } from '@/components/ui/styled-select';
import api from '@/config/axios';
import type { ScheduleTimeGroup } from '@/store/useFormStore';
import { unescapeServerHtml } from '@/utils/StringUtils';
import { useFormStore } from '@/store/useFormStore';
import {
  buildOfficeHoursSummary,
  DAY_NAMES,
  DAYS_OF_WEEK,
  isIgnoredAvailabilityDay,
  normalizeAvailabilityWindows,
  parseTimeToMinutes,
  serializeAvailabilityWindows,
  sortAvailabilityWindows,
} from '@/utils/availabilityWindows';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  AlertCircle,
  FileText,
  Zap,
  Building2,
  GitBranch,
  Calendar,
  ChevronDown,
  RefreshCw,
  Plus,
  MessageSquareText,
  Trash2,
} from 'lucide-react';

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

const SCHEDULE_TYPE_META: Record<
  FormData['scheduleType'],
  { label: string; description: string }
> = {
  NONE: {
    label: 'Envio unico',
    description: 'A mensagem sera enviada uma vez, respeitando as datas configuradas.',
  },
  INTERVAL: {
    label: 'Repeticao por intervalo',
    description: 'Repete automaticamente em ciclos de minutos enquanto a mensagem estiver ativa.',
  },
  WEEKLY: {
    label: 'Programacao semanal',
    description: 'Organize os disparos por dias da semana e horarios especificos.',
  },
  MONTHLY: {
    label: 'Programacao mensal',
    description: 'Defina dias do mes e horarios fixos para o disparo da mensagem.',
  },
};

const sortScheduleDays = (days: string[], mode: 'weekly' | 'monthly'): string[] => {
  if (mode === 'weekly') {
    return DAYS_OF_WEEK.map((day) => day.value).filter((value) => days.includes(value));
  }

  return [...days].sort((a, b) => Number(a) - Number(b));
};

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }

  if (typeof value === 'string' && value.trim()) {
    return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
  }

  return [];
};

const toggleSelection = (
  currentValue: unknown,
  nextValue: string,
  mode: 'weekly' | 'monthly'
): string[] => {
  const selected = normalizeStringArray(currentValue);
  const updated = selected.includes(nextValue)
    ? selected.filter((value) => value !== nextValue)
    : [...selected, nextValue];

  if (mode === 'weekly') {
    return sortScheduleDays(updated, 'weekly');
  }

  return sortScheduleDays(updated, 'monthly');
};

const normalizeScheduleTimeGroups = (
  value: unknown,
  fallbackDays: unknown,
  mode: 'weekly' | 'monthly'
): ScheduleTimeGroup[] => {
  const normalizeGroups = (groups: unknown[]): ScheduleTimeGroup[] => {
    const mapped = groups
      .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      .map((item) => {
        const group = item as { day?: unknown; times?: unknown };
        return {
          day: String(group.day ?? '').trim(),
          times: normalizeStringArray(group.times),
        };
      })
      .filter((group) => group.day);

    const groupedByDay = new Map<string, ScheduleTimeGroup>();
    for (const group of mapped) {
      groupedByDay.set(group.day, {
        day: group.day,
        times: normalizeStringArray(group.times),
      });
    }

    return sortScheduleDays([...groupedByDay.keys()], mode).map(
      (day) => groupedByDay.get(day) ?? { day, times: [] }
    );
  };

  if (Array.isArray(value)) {
    const hasStructuredItems = value.some(
      (item) => item && typeof item === 'object' && !Array.isArray(item) && 'day' in item
    );
    if (hasStructuredItems) {
      return normalizeGroups(value);
    }
  }

  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return normalizeScheduleTimeGroups(parsed, fallbackDays, mode);
      }
    } catch {
      // fallback para formato legado CSV logo abaixo
    }
  }

  const days = sortScheduleDays(normalizeStringArray(fallbackDays), mode);
  const legacyTimes = normalizeStringArray(value);
  return days.map((day) => ({ day, times: [...legacyTimes] }));
};

const syncScheduleTimeGroups = (
  selectedDays: unknown,
  groupsValue: unknown,
  mode: 'weekly' | 'monthly'
): ScheduleTimeGroup[] => {
  const days = sortScheduleDays(normalizeStringArray(selectedDays), mode);
  const groups = normalizeScheduleTimeGroups(groupsValue, [], mode);
  const groupMap = new Map(groups.map((group) => [group.day, group]));

  return days.map((day) => {
    const group = groupMap.get(day);
    return group ? { day, times: normalizeStringArray(group.times) } : { day, times: [] };
  });
};

const getNextSuggestedTime = (times: string[]): string => {
  const validTimes = normalizeStringArray(times)
    .map((time) => parseTimeToMinutes(time))
    .filter((minutes): minutes is number => minutes !== null);

  const used = new Set(validTimes);
  for (let hour = 9; hour <= 23; hour += 1) {
    const minutes = hour * 60;
    if (!used.has(minutes)) {
      return `${String(hour).padStart(2, '0')}:00`;
    }
  }

  for (let hour = 0; hour <= 8; hour += 1) {
    const minutes = hour * 60;
    if (!used.has(minutes)) {
      return `${String(hour).padStart(2, '0')}:00`;
    }
  }

  return '09:00';
};

const FormSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    content: z.string().min(1),
    level: z.number().min(1),
    type: z.number().min(1),
    departments: z.array(z.string()).optional(),
    sendToSubdivisions: z.boolean().optional(),
    repeatIntervalMinutes: z.number().min(1).optional(),
    expireAt: z.string().optional(),
    publishedAt: z.string().optional(),
    scheduleType: z.enum(['NONE', 'INTERVAL', 'WEEKLY', 'MONTHLY']).default('NONE'),
    scheduleDaysOfWeek: z.array(z.string()).optional(),
    scheduleTimes: z
      .array(
        z.object({
          day: z.string(),
          times: z.array(z.string()),
        })
      )
      .optional(),
    scheduleMonthDays: z.array(z.string()).optional(),
    availabilityWindows: z
      .array(
        z.object({
          day: z.string(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          ignored: z.boolean().optional(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.expireAt && data.expireAt.trim()) {
      const d = new Date(data.expireAt);
      if (isNaN(d.getTime()))
        ctx.addIssue({ code: 'custom', message: 'Data de expiracao invalida', path: ['expireAt'] });
      else if (d.getTime() <= Date.now())
        ctx.addIssue({
          code: 'custom',
          message: 'A data de expiracao deve ser maior que a data corrente',
          path: ['expireAt'],
        });
    }
    if (data.publishedAt && data.publishedAt.trim()) {
      const d = new Date(data.publishedAt);
      if (isNaN(d.getTime()))
        ctx.addIssue({ code: 'custom', message: 'Data de publicacao invalida', path: ['publishedAt'] });
      else if (d.getTime() <= Date.now())
        ctx.addIssue({
          code: 'custom',
          message: 'A data de publicacao deve ser maior que a data corrente',
          path: ['publishedAt'],
        });
    }
    if (data.scheduleType === 'INTERVAL') {
      if (!data.repeatIntervalMinutes || data.repeatIntervalMinutes < 1)
        ctx.addIssue({
          code: 'custom',
          message: 'O intervalo de repeticao e obrigatorio e deve ser maior que zero',
          path: ['repeatIntervalMinutes'],
        });
    }
    if (data.scheduleType === 'WEEKLY') {
      if (!data.scheduleDaysOfWeek || data.scheduleDaysOfWeek.length === 0)
        ctx.addIssue({
          code: 'custom',
          message: 'Selecione ao menos um dia da semana',
          path: ['scheduleDaysOfWeek'],
        });
    }
    if (data.scheduleType === 'MONTHLY') {
      if (!data.scheduleMonthDays || data.scheduleMonthDays.length === 0)
        ctx.addIssue({
          code: 'custom',
          message: 'Selecione ao menos um dia do mes',
          path: ['scheduleMonthDays'],
        });
    }

    if (data.scheduleTimes && data.scheduleTimes.length > 0) {
      const expectedDays =
        data.scheduleType === 'WEEKLY'
          ? new Set(normalizeStringArray(data.scheduleDaysOfWeek))
          : data.scheduleType === 'MONTHLY'
          ? new Set(normalizeStringArray(data.scheduleMonthDays))
          : new Set<string>();

      const seenDays = new Set<string>();
      data.scheduleTimes.forEach((group, groupIndex) => {
        const day = String(group.day ?? '').trim();
        if (!day) {
          ctx.addIssue({
            code: 'custom',
            message: 'Dia da recorrencia invalido',
            path: ['scheduleTimes', groupIndex, 'day'],
          });
          return;
        }

        if (expectedDays.size > 0 && !expectedDays.has(day)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Existe card de horario para um dia nao selecionado',
            path: ['scheduleTimes', groupIndex, 'day'],
          });
        }

        if (seenDays.has(day)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Dia duplicado na configuracao de horarios',
            path: ['scheduleTimes', groupIndex, 'day'],
          });
        }
        seenDays.add(day);

        const seenTimes = new Set<string>();
        group.times.forEach((time, timeIndex) => {
          const normalizedTime = String(time ?? '').trim();
          if (parseTimeToMinutes(normalizedTime) === null) {
            ctx.addIssue({
              code: 'custom',
              message: 'Horario invalido. Use o formato HH:mm',
              path: ['scheduleTimes', groupIndex, 'times', timeIndex],
            });
            return;
          }

          if (seenTimes.has(normalizedTime)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Horario duplicado no mesmo dia',
              path: ['scheduleTimes', groupIndex, 'times', timeIndex],
            });
          }
          seenTimes.add(normalizedTime);
        });
      });
    }

    if (data.availabilityWindows && data.availabilityWindows.length > 0) {
      const byDay = new Map<string, { ignored: boolean; intervals: Array<{ start: number; end: number }> }>();

      data.availabilityWindows.forEach((window, index) => {
        const day = String(window.day ?? '').trim();
        const dayNumber = Number(day);
        if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
          ctx.addIssue({
            code: 'custom',
            message: 'Dia da janela de disponibilidade invalido',
            path: ['availabilityWindows', index, 'day'],
          });
          return;
        }

        const currentDay = byDay.get(day) ?? { ignored: false, intervals: [] };
        if (window.ignored) {
          if (currentDay.ignored || currentDay.intervals.length > 0) {
            ctx.addIssue({
              code: 'custom',
              message: `Dia ${DAY_NAMES[day] ?? day} ja possui configuracao personalizada`,
              path: ['availabilityWindows', index, 'day'],
            });
            return;
          }
          byDay.set(day, { ignored: true, intervals: [] });
          return;
        }

        if (currentDay.ignored) {
          ctx.addIssue({
            code: 'custom',
            message: `Dia ${DAY_NAMES[day] ?? day} esta marcado para nao disparar mensagens`,
            path: ['availabilityWindows', index, 'day'],
          });
          return;
        }

        const startMinutes = parseTimeToMinutes(window.startTime ?? '');
        const endMinutes = parseTimeToMinutes(window.endTime ?? '');

        if (startMinutes === null) {
          ctx.addIssue({
            code: 'custom',
            message: 'Horario inicial invalido. Use o formato HH:mm',
            path: ['availabilityWindows', index, 'startTime'],
          });
        }
        if (endMinutes === null) {
          ctx.addIssue({
            code: 'custom',
            message: 'Horario final invalido. Use o formato HH:mm',
            path: ['availabilityWindows', index, 'endTime'],
          });
        }
        if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
          ctx.addIssue({
            code: 'custom',
            message: 'Horario inicial deve ser menor que o horario final',
            path: ['availabilityWindows', index, 'endTime'],
          });
        }

        if (startMinutes !== null && endMinutes !== null && startMinutes < endMinutes) {
          currentDay.intervals.push({ start: startMinutes, end: endMinutes });
          byDay.set(day, currentDay);
        }
      });

      for (const [day, config] of byDay.entries()) {
        if (config.ignored) {
          continue;
        }
        const sorted = [...config.intervals].sort((a, b) => a.start - b.start);
        for (let i = 1; i < sorted.length; i += 1) {
          if (sorted[i].start < sorted[i - 1].end) {
            ctx.addIssue({
              code: 'custom',
              message: `Janelas de disponibilidade sobrepostas no dia ${DAY_NAMES[day] ?? day}`,
              path: ['availabilityWindows'],
            });
            break;
          }
        }
      }
    }
  });

type FormValues = z.input<typeof FormSchema>;
type FormData = z.output<typeof FormSchema>;

const buildEmptyFormValues = (): FormValues => ({
  title: '',
  content: '',
  level: 0,
  type: 0,
  departments: [],
  sendToSubdivisions: false,
  repeatIntervalMinutes: undefined,
  expireAt: '',
  publishedAt: '',
  scheduleType: 'NONE',
  scheduleDaysOfWeek: [],
  scheduleTimes: [],
  scheduleMonthDays: [],
  availabilityWindows: [],
});

interface HomeFormProps {
  id?: string | null;
}

export const MessageForm: React.FC<HomeFormProps> = ({ id }: HomeFormProps) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isOfficeHoursCardOpen, setIsOfficeHoursCardOpen] = React.useState(false);
  const { getDepartments } = useDepartmentsApi();
  
  const { saveFormData, getFormData, clearFormData } = useFormStore();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watch,
  } = useForm<FormValues, unknown, FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: buildEmptyFormValues(),
  });

  const scheduleTypeValue = watch('scheduleType');
  const scheduleTypeMeta = SCHEDULE_TYPE_META[scheduleTypeValue ?? 'NONE'];

  const { createMessage, getCreateMessageDtoById, getDefaultOfficeHoursWindow } = useMessagesApi();

  const { data: msg, isLoading: msgLoading } = useQuery({
    queryKey: ['messageDto', id],
    queryFn: async () => (id ? await getCreateMessageDtoById(id) : null),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: defaultOfficeHoursWindow, isLoading: defaultOfficeHoursLoading } = useQuery({
    queryKey: ['defaultOfficeHoursWindow'],
    queryFn: async () => {
      try {
        const window = await getDefaultOfficeHoursWindow();
        return window;
      } catch (err) {
        console.error('Erro ao obter janela de horário comercial padrão:', err);
        return null;
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const defaultOfficeHoursSummary = React.useMemo(
    () => buildOfficeHoursSummary(defaultOfficeHoursWindow),
    [defaultOfficeHoursWindow]
  );

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

  const resetToEmptyForm = React.useCallback(() => {
    clearFormData();
    reset(buildEmptyFormValues());
  }, [clearFormData, reset]);

  React.useEffect(() => {
    if (!msg) return;
    try {
      const scheduleType = (
        msg.scheduleMonthDays
          ? 'MONTHLY'
          : msg.scheduleDaysOfWeek
          ? 'WEEKLY'
          : msg.repeatIntervalMinutes
          ? 'INTERVAL'
          : 'NONE'
      ) as 'NONE' | 'INTERVAL' | 'WEEKLY' | 'MONTHLY';
      const weeklyDays = msg.scheduleDaysOfWeek ? normalizeStringArray(msg.scheduleDaysOfWeek) : [];
      const monthDays = msg.scheduleMonthDays ? normalizeStringArray(msg.scheduleMonthDays) : [];
      reset({
        title: msg.title ?? '',
        content: unescapeServerHtml(msg.content ?? ''),
        level: msg.level ?? 0,
        type: msg.type ?? 0,
        departments: msg.departments ?? [],
        sendToSubdivisions: msg.sendToSubdivisions ?? false,
        repeatIntervalMinutes: msg.repeatIntervalMinutes ?? undefined,
        expireAt: msg.expireAt ?? '',
        publishedAt: msg.publishedAt ?? '',
        scheduleType,
        scheduleDaysOfWeek: weeklyDays,
        scheduleTimes:
          scheduleType === 'WEEKLY'
            ? syncScheduleTimeGroups(
                weeklyDays,
                normalizeScheduleTimeGroups(msg.scheduleTimes, weeklyDays, 'weekly'),
                'weekly'
              )
            : scheduleType === 'MONTHLY'
            ? syncScheduleTimeGroups(
                monthDays,
                normalizeScheduleTimeGroups(msg.scheduleTimes, monthDays, 'monthly'),
                'monthly'
              )
            : [],
        scheduleMonthDays: monthDays,
        availabilityWindows: normalizeAvailabilityWindows(msg.availabilityWindows),
      });
    } catch (err) {
      console.error(err);
    }
  }, [msg, reset]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === 'true') {
      resetToEmptyForm();
    }
  }, [resetToEmptyForm]);

  React.useEffect(() => {
    const savedData = getFormData();
    if (savedData && !id) {
      toast.success('Formulario restaurado! Seus dados foram preservados durante a reautenticacao.');
      reset({
        ...savedData,
        scheduleDaysOfWeek: normalizeStringArray(savedData.scheduleDaysOfWeek),
        scheduleTimes:
          savedData.scheduleType === 'WEEKLY'
            ? syncScheduleTimeGroups(
                savedData.scheduleDaysOfWeek,
                normalizeScheduleTimeGroups(
                  (savedData as { scheduleTimes?: unknown }).scheduleTimes,
                  savedData.scheduleDaysOfWeek,
                  'weekly'
                ),
                'weekly'
              )
            : savedData.scheduleType === 'MONTHLY'
            ? syncScheduleTimeGroups(
                savedData.scheduleMonthDays,
                normalizeScheduleTimeGroups(
                  (savedData as { scheduleTimes?: unknown }).scheduleTimes,
                  savedData.scheduleMonthDays,
                  'monthly'
                ),
                'monthly'
              )
            : [],
        scheduleMonthDays: normalizeStringArray(savedData.scheduleMonthDays),
        repeatIntervalMinutes:
          savedData.repeatIntervalMinutes && savedData.repeatIntervalMinutes > 0
            ? savedData.repeatIntervalMinutes
            : undefined,
      });
    }
  }, [getFormData, id, reset]);

  React.useEffect(() => {
    const subscription = watch(() => {
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
        scheduleType: data.scheduleType ?? 'NONE',
        scheduleDaysOfWeek: data.scheduleDaysOfWeek ?? [],
        scheduleTimes: data.scheduleTimes ?? [],
        scheduleMonthDays: data.scheduleMonthDays ?? [],
        availabilityWindows: data.availabilityWindows ?? [],
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, saveFormData]);

  const submitForm = (data: FormData) => {
    const payload: import('@/api/messages').CreateMessageDTO = {
      title: data.title,
      content: data.content,
      level: data.level,
      type: data.type,
      departments: data.departments,
      sendToSubdivisions: data.sendToSubdivisions,
      expireAt: data.expireAt,
      publishedAt: data.publishedAt,
    };
    if (data.scheduleType === 'INTERVAL') {
      payload.repeatIntervalMinutes = data.repeatIntervalMinutes;
    } else if (data.scheduleType === 'WEEKLY') {
      const weeklyGroups = syncScheduleTimeGroups(data.scheduleDaysOfWeek, data.scheduleTimes, 'weekly');
      payload.scheduleDaysOfWeek = (data.scheduleDaysOfWeek ?? []).join(',');
      payload.scheduleTimes = JSON.stringify(weeklyGroups);
    } else if (data.scheduleType === 'MONTHLY') {
      const monthlyGroups = syncScheduleTimeGroups(
        data.scheduleMonthDays,
        data.scheduleTimes,
        'monthly'
      );
      payload.scheduleMonthDays = (data.scheduleMonthDays ?? []).join(',');
      payload.scheduleTimes = JSON.stringify(monthlyGroups);
    }
    if (data.availabilityWindows && data.availabilityWindows.length > 0) {
      payload.availabilityWindows = serializeAvailabilityWindows(data.availabilityWindows);
    }
    createMessage(payload)
      .then(() => {
        resetToEmptyForm();
        toast.success('Mensagem enviada com sucesso!');
      })
      .catch((err) => {
        toast.error(
          'Erro ao criar mensagem.' +
            (err?.response?.data?.message ? ' ' + err.response.data.message : '')
        );
      });
  };

  const openDialog = handleSubmit(() => setIsDialogOpen(true));
  const handleConfirmSend = () => {
    setIsDialogOpen(false);
    handleSubmit(submitForm)();
  };

  return (
    <>
      {isLoading ? (
        <>
          <Skeleton className="w-full h-10 mb-4" />
          <Skeleton className="w-full h-10 mb-4" />
          <Skeleton className="w-full h-10 mb-4" />
        </>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8 pb-24">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-blue-200 dark:border-slate-700">
            <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded" />
                  <h3 className="text-lg font-semibold text-foreground">Mensagem</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Preencha o conteúdo principal e defina quem recebe a mensagem. Os campos
                  mais usados ficam concentrados aqui para facilitar a edição.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-3 py-2 flex items-center gap-1"
                >
                  <RefreshCw size={16} />
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={resetToEmptyForm}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-3 py-2 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Novo formulário
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] gap-6">
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} className="text-blue-500" />
                    <label className="block text-sm font-medium">Título</label>
                  </div>
                  <Controller
                    control={control}
                    name="title"
                    render={({ field }) => (
                      <div>
                        <input
                          {...field}
                          type="text"
                          placeholder="Título da mensagem (opcional)"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 border-gray-300"
                        />
                        {errors.title && (
                          <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" />
                    <label className="block text-sm font-medium">Conteúdo</label>
                  </div>
                  <Controller
                    control={control}
                    name="content"
                    render={({ field }) => (
                      <div>
                        <TinyMceEditor value={field.value} onChange={field.onChange} />
                        {errors.content && (
                          <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-blue-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-950/40 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-blue-500" />
                    <h4 className="text-sm font-semibold text-foreground">Classificação</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Nível</label>
                      <Controller
                        control={control}
                        name="level"
                        render={({ field }) => (
                          <div>
                            <StyledSelect
                              value={field.value ? String(field.value) : ''}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              options={
                                levelsData
                                  ? levelsData.map((l: { id: number; name: string }) => ({
                                      value: String(l.id),
                                      label: l.name,
                                    }))
                                  : []
                              }
                            />
                            {errors.level && (
                              <p className="text-xs text-red-500 mt-1">{errors.level.message}</p>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Tipo</label>
                      <Controller
                        control={control}
                        name="type"
                        render={({ field }) => (
                          <div>
                            <StyledSelect
                              value={field.value ? String(field.value) : ''}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              options={
                                typesData
                                  ? typesData.map((t: { id: number; name: string }) => ({
                                      value: String(t.id),
                                      label: t.name,
                                    }))
                                  : []
                              }
                            />
                            {errors.type && (
                              <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>
                            )}
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-green-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-950/40 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-green-600" />
                    <h4 className="text-sm font-semibold text-foreground">Destino</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Departamentos</label>
                    <Controller
                      control={control}
                      name="departments"
                      render={({ field }) => (
                        <MultiSelect
                          options={
                            departmentsData
                              ? departmentsData.map((d) => ({ value: d.id, label: d.name }))
                              : []
                          }
                          value={field.value ?? []}
                          onValueChange={(val) => field.onChange(val.map(String))}
                          placeholder="Selecione os departamentos..."
                        />
                      )}
                    />
                  </div>

                  <div className="rounded-lg border border-green-200/80 dark:border-slate-700 bg-green-50/50 dark:bg-slate-900/50 p-3">
                    <div className="flex items-start gap-3">
                      <GitBranch size={18} className="text-green-600 mt-0.5" />
                      <Controller
                        control={control}
                        name="sendToSubdivisions"
                        render={({ field }) => (
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.value ?? false}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-0.5"
                            />
                            <span className="text-sm">
                              <span className="font-medium block">Enviar para subdivisões</span>
                              <span className="text-muted-foreground">
                                Inclui automaticamente os departamentos filhos dos setores
                                selecionados.
                              </span>
                            </span>
                          </label>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agendamento e Repeticao */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-purple-200 dark:border-slate-700">
            <div className="flex flex-col gap-2 mb-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-violet-500 rounded" />
                  <h3 className="text-lg font-semibold text-foreground">Agendamento e Repeticao</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Defina a vigencia da mensagem e escolha como ela deve ser repetida ao longo do tempo.
                </p>
              </div>
             
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] gap-6">
              <div className="rounded-xl border border-purple-200/80 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-purple-500" />
                  <label className="block text-sm font-medium">Tipo de Recorrencia</label>
                </div>
                <Controller
                  control={control}
                  name="scheduleType"
                  render={({ field }) => (
                    <StyledSelect
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value as 'NONE' | 'INTERVAL' | 'WEEKLY' | 'MONTHLY'
                        )
                      }
                      options={[
                        { value: 'NONE', label: 'Sem repeticao (envio unico)' },
                        { value: 'INTERVAL', label: 'Repetir por intervalo (em minutos)' },
                        { value: 'WEEKLY', label: 'Programado semanal (dias da semana)' },
                        { value: 'MONTHLY', label: 'Programado mensal (dias do mes)' },
                      ]}
                    />
                  )}
                />
                 <div className="rounded-lg border border-dashed border-purple-200/70 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 px-4 py-3 min-w-[240px]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                  Modo atual
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{scheduleTypeMeta.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{scheduleTypeMeta.description}</p>
              </div>
              </div>

              <div className="rounded-xl border border-purple-200/80 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-purple-500" />
                  <h4 className="text-md font-medium">Janela de vigencia</h4>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Data de publicacao */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">                      
                      <label className="block text-sm font-medium">Data de publicacao</label>
                    </div>
                    <Controller
                      control={control}
                      name="publishedAt"
                      render={({ field }) => (
                        <div>
                          <div className="flex items-center gap-2">
                            <input
                              type="datetime-local"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 border-gray-300"
                            />
                            {field.value && (
                              <button
                                type="button"
                                onClick={() => field.onChange('')}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Se vazio, a mensagem pode ser publicada assim que estiver pronta.
                          </p>
                          {errors.publishedAt && (
                            <p className="text-xs text-red-500 mt-1">{errors.publishedAt.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  {/* Data de expiracao */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      
                      <label className="block text-sm font-medium">Data de expiracao</label>
                    </div>
                    <Controller
                      control={control}
                      name="expireAt"
                      render={({ field }) => (
                        <div>
                          <div className="flex items-center gap-2">
                            <input
                              type="datetime-local"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 border-gray-300"
                            />
                            {field.value && (
                              <button
                                type="button"
                                onClick={() => field.onChange('')}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Depois desta data, o agendamento deixa de gerar novos disparos.
                          </p>
                          {errors.expireAt && (
                            <p className="text-xs text-red-500 mt-1">{errors.expireAt.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tipo de Recorrencia */}
            <div className="space-y-4 mt-6">

              {/* INTERVAL */}
              {scheduleTypeValue === 'INTERVAL' && (
                <div className="space-y-2 mt-3">
                  <label className="block text-sm font-medium">Intervalo de repeticao (minutos)</label>
                  <Controller
                    control={control}
                    name="repeatIntervalMinutes"
                    render={({ field }) => (
                      <div className="max-w-xs">
                        <input
                          type="number"
                          min={1}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                          placeholder="Ex.: 60"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 border-gray-300"
                        />
                        {errors.repeatIntervalMinutes && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.repeatIntervalMinutes.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>
              )}

              {/* WEEKLY */}
              {scheduleTypeValue === 'WEEKLY' && (
                <Controller
                  control={control}
                  name="scheduleDaysOfWeek"
                  render={({ field: daysField }) => (
                    <Controller
                      control={control}
                      name="scheduleTimes"
                      render={({ field: timesField }) => {
                        const selectedDays = normalizeStringArray(daysField.value);
                        const groupedTimes = syncScheduleTimeGroups(
                          selectedDays,
                          timesField.value,
                          'weekly'
                        );

                        const setGroups = (groups: ScheduleTimeGroup[]) => {
                          timesField.onChange(syncScheduleTimeGroups(selectedDays, groups, 'weekly'));
                        };

                        const toggleDaySelection = (day: string) => {
                          const nextDays = toggleSelection(selectedDays, day, 'weekly');
                          daysField.onChange(nextDays);
                          timesField.onChange(syncScheduleTimeGroups(nextDays, groupedTimes, 'weekly'));
                        };

                        const removeDayCard = (day: string) => {
                          const nextDays = selectedDays.filter((value) => value !== day);
                          daysField.onChange(nextDays);
                          timesField.onChange(syncScheduleTimeGroups(nextDays, groupedTimes, 'weekly'));
                        };

                        const addTimeForDay = (day: string) => {
                          setGroups(
                            groupedTimes.map((group) =>
                              group.day === day
                                ? { day, times: [...group.times, getNextSuggestedTime(group.times)] }
                                : group
                            )
                          );
                        };

                        const updateTimeForDay = (day: string, index: number, value: string) => {
                          setGroups(
                            groupedTimes.map((group) =>
                              group.day === day
                                ? {
                                    day,
                                    times: group.times.map((time, timeIndex) =>
                                      timeIndex === index ? value : time
                                    ),
                                  }
                                : group
                            )
                          );
                        };

                        const removeTimeForDay = (day: string, index: number) => {
                          setGroups(
                            groupedTimes.map((group) =>
                              group.day === day
                                ? {
                                    day,
                                    times: group.times.filter((_, timeIndex) => timeIndex !== index),
                                  }
                                : group
                            )
                          );
                        };

                        return (
                          <div className="space-y-4 mt-3">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium">Dias da semana</label>
                              <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => {
                                  const isSelected = selectedDays.includes(day.value);
                                  return (
                                    <button
                                      key={day.value}
                                      type="button"
                                      onClick={() => toggleDaySelection(day.value)}
                                      aria-pressed={isSelected}
                                      className={`min-w-14 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                        isSelected
                                          ? 'bg-purple-600 text-white border-purple-600'
                                          : 'bg-white dark:bg-slate-900 text-foreground border-gray-300 dark:border-slate-600 hover:border-purple-400'
                                      }`}
                                    >
                                      {day.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Selecione um dia para criar o card e adicionar os horários daquele dia.
                              </p>
                              {errors.scheduleDaysOfWeek && (
                                <p className="text-xs text-red-500 mt-1">
                                  {errors.scheduleDaysOfWeek.message}
                                </p>
                              )}
                            </div>

                            {groupedTimes.length > 0 && (
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                {groupedTimes.map((group) => (
                                  <div
                                    key={group.day}
                                    className="rounded-xl border border-purple-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-4 space-y-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <h4 className="font-semibold text-foreground">
                                          {DAY_NAMES[group.day]}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                          {group.times.length} horário{group.times.length > 1 ? 's' : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => addTimeForDay(group.day)}
                                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium border border-purple-300 hover:border-purple-500 rounded px-2 py-1"
                                        >
                                          <Plus size={12} /> Adicionar horário
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeDayCard(group.day)}
                                          className="text-red-500 hover:text-red-700 border border-red-300 hover:border-red-500 rounded p-1.5"
                                          aria-label={`Remover card de ${DAY_NAMES[group.day]}`}
                                          title={`Remover card de ${DAY_NAMES[group.day]}`}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>

                                    {group.times.length > 0 ? (
                                      <div className="space-y-2">
                                        {group.times.map((time, index) => (
                                          <div
                                            key={`${group.day}-${index}`}
                                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center"
                                          >
                                            <input
                                              type="time"
                                              value={time}
                                              onChange={(e) =>
                                                updateTimeForDay(group.day, index, e.target.value)
                                              }
                                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 border-gray-300"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeTimeForDay(group.day, index)}
                                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                                              aria-label={`Remover horário de ${DAY_NAMES[group.day]}`}
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        Sem horário fixo: dispara uma vez no primeiro tick disponível deste dia.
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  )}
                />
              )}

              {/* MONTHLY */}
              {scheduleTypeValue === 'MONTHLY' && (
                <Controller
                  control={control}
                  name="scheduleMonthDays"
                  render={({ field: daysField }) => (
                    <Controller
                      control={control}
                      name="scheduleTimes"
                      render={({ field: timesField }) => {
                        const selectedDays = normalizeStringArray(daysField.value);
                        const groupedTimes = syncScheduleTimeGroups(
                          selectedDays,
                          timesField.value,
                          'monthly'
                        );

                        const setGroups = (groups: ScheduleTimeGroup[]) => {
                          timesField.onChange(syncScheduleTimeGroups(selectedDays, groups, 'monthly'));
                        };

                        const toggleDaySelection = (day: string) => {
                          const nextDays = toggleSelection(selectedDays, day, 'monthly');
                          daysField.onChange(nextDays);
                          timesField.onChange(syncScheduleTimeGroups(nextDays, groupedTimes, 'monthly'));
                        };

                        const removeDayCard = (day: string) => {
                          const nextDays = selectedDays.filter((value) => value !== day);
                          daysField.onChange(nextDays);
                          timesField.onChange(syncScheduleTimeGroups(nextDays, groupedTimes, 'monthly'));
                        };

                        const addTimeForDay = (day: string) => {
                          setGroups(
                            groupedTimes.map((group) =>
                              group.day === day
                                ? { day, times: [...group.times, getNextSuggestedTime(group.times)] }
                                : group
                            )
                          );
                        };

                        const updateTimeForDay = (day: string, index: number, value: string) => {
                          setGroups(
                            groupedTimes.map((group) =>
                              group.day === day
                                ? {
                                    day,
                                    times: group.times.map((time, timeIndex) =>
                                      timeIndex === index ? value : time
                                    ),
                                  }
                                : group
                            )
                          );
                        };

                        const removeTimeForDay = (day: string, index: number) => {
                          setGroups(
                            groupedTimes.map((group) =>
                              group.day === day
                                ? {
                                    day,
                                    times: group.times.filter((_, timeIndex) => timeIndex !== index),
                                  }
                                : group
                            )
                          );
                        };

                        return (
                          <div className="space-y-4 mt-3">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium">Dias do mês</label>
                              <div className="flex flex-wrap gap-1.5 max-w-3xl">
                                {MONTH_DAYS.map((day) => {
                                  const isSelected = selectedDays.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => toggleDaySelection(day)}
                                      aria-pressed={isSelected}
                                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors border ${
                                        isSelected
                                          ? 'bg-pink-600 text-white border-pink-600'
                                          : 'bg-white dark:bg-slate-900 text-foreground border-gray-300 dark:border-slate-600 hover:border-pink-400'
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Selecione um dia para criar o card e adicionar os horários daquele dia.
                              </p>
                              {errors.scheduleMonthDays && (
                                <p className="text-xs text-red-500 mt-1">
                                  {errors.scheduleMonthDays.message}
                                </p>
                              )}
                            </div>

                            {groupedTimes.length > 0 && (
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                {groupedTimes.map((group) => (
                                  <div
                                    key={group.day}
                                    className="rounded-xl border border-pink-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-4 space-y-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <h4 className="font-semibold text-foreground">Dia {group.day}</h4>
                                        <p className="text-xs text-muted-foreground">
                                          {group.times.length} horário{group.times.length > 1 ? 's' : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => addTimeForDay(group.day)}
                                          className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-800 font-medium border border-pink-300 hover:border-pink-500 rounded px-2 py-1"
                                        >
                                          <Plus size={12} /> Adicionar horário
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeDayCard(group.day)}
                                          className="text-red-500 hover:text-red-700 border border-red-300 hover:border-red-500 rounded p-1.5"
                                          aria-label={`Remover card do dia ${group.day}`}
                                          title={`Remover card do dia ${group.day}`}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>

                                    {group.times.length > 0 ? (
                                      <div className="space-y-2">
                                        {group.times.map((time, index) => (
                                          <div
                                            key={`${group.day}-${index}`}
                                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center"
                                          >
                                            <input
                                              type="time"
                                              value={time}
                                              onChange={(e) =>
                                                updateTimeForDay(group.day, index, e.target.value)
                                              }
                                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 border-gray-300"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeTimeForDay(group.day, index)}
                                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                                              aria-label={`Remover horário do dia ${group.day}`}
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        Sem horário fixo: dispara uma vez no primeiro tick disponível deste dia.
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  )}
                />
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-purple-200 dark:border-slate-700">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Dica:</span> Configure quando a mensagem sera
                publicada, expirada e repetida automaticamente
              </p>
            </div>
          </div>

          {/* Janelas de Disponibilidade */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-orange-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-amber-500 rounded" />
              <h3 className="text-lg font-semibold text-foreground">Janelas de Disponibilidade</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Define os horarios em que a mensagem pode ser disparada (ex.: horario de expediente).
              Fora desses horarios, o envio sera bloqueado. Se nenhuma janela for configurada,
              sera aplicado o expediente padrao global.
            </p>
            <Controller
              control={control}
              name="availabilityWindows"
              render={({ field }) => {
                const normalizedWindows = sortAvailabilityWindows(
                  (field.value ?? []).map((window) => ({
                    day: String(window.day ?? ''),
                    startTime: window.startTime,
                    endTime: window.endTime,
                    ignored: window.ignored ?? false,
                  }))
                );
                const selectedDays = new Set(normalizedWindows.map((window) => window.day));
                const groupedWindows = DAYS_OF_WEEK.map((day) => ({
                  ...day,
                  ignored: normalizedWindows.some(
                    (window) => window.day === day.value && isIgnoredAvailabilityDay(window)
                  ),
                  windows: normalizedWindows
                    .map((window, index) => ({ ...window, index }))
                    .filter((window) => window.day === day.value && !isIgnoredAvailabilityDay(window)),
                })).filter((day) => day.ignored || day.windows.length > 0);

                const removeDayOverrides = (day: string) => {
                  field.onChange(normalizedWindows.filter((window) => window.day !== day));
                };

                const toggleDay = (day: string) => {
                  if (selectedDays.has(day)) {
                    removeDayOverrides(day);
                    return;
                  }

                  field.onChange(sortAvailabilityWindows([
                    ...normalizedWindows,
                    { day, startTime: '08:00', endTime: '17:00' },
                  ]));
                };
                const setDayMode = (day: string, ignored: boolean) => {
                  const nextWindows = normalizedWindows.filter((window) => window.day !== day);
                  if (ignored) {
                    field.onChange(sortAvailabilityWindows([...nextWindows, { day, ignored: true }]));
                    return;
                  }

                  field.onChange(
                    sortAvailabilityWindows([
                      ...nextWindows,
                      { day, startTime: '08:00', endTime: '17:00' },
                    ])
                  );
                };
                const addWindowForDay = (day: string) => {
                  field.onChange(
                    sortAvailabilityWindows([
                      ...normalizedWindows.filter((window) => window.day !== day || !window.ignored),
                      { day, startTime: '08:00', endTime: '17:00' },
                    ])
                  );
                };
                const removeWindow = (idx: number) => {
                  field.onChange(sortAvailabilityWindows(normalizedWindows.filter((_, i) => i !== idx)));
                };
                const updateWindow = (
                  idx: number,
                  key: 'day' | 'startTime' | 'endTime',
                  value: string
                ) => {
                  const updated = normalizedWindows.map((w, i) =>
                    i === idx ? { ...w, [key]: value } : w
                  );
                  field.onChange(sortAvailabilityWindows(updated));
                };
                return (
                  <div className="space-y-4">
                    {normalizedWindows.length === 0 ? (
                      <div className="rounded-lg border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/20 p-3">
                        <Collapsible open={isOfficeHoursCardOpen} onOpenChange={setIsOfficeHoursCardOpen}>
                          <div className="space-y-2">
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 rounded-md text-left text-xs text-amber-800 dark:text-amber-200"
                              >
                                <div>
                                  <span className="font-semibold">Expediente padrão ativo</span>
                                  <span className="ml-2 text-[11px] opacity-80">
                                    {defaultOfficeHoursLoading
                                      ? 'Carregando...'
                                      : defaultOfficeHoursSummary.length > 0
                                      ? `${defaultOfficeHoursSummary.length} dia(s) configurado(s)`
                                      : 'Não configurado'}
                                  </span>
                                </div>
                                <ChevronDown
                                  size={16}
                                  className={`shrink-0 transition-transform ${isOfficeHoursCardOpen ? 'rotate-180' : ''}`}
                                />
                              </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="space-y-2">
                              {defaultOfficeHoursLoading ? (
                                <p className="text-xs text-amber-800 dark:text-amber-200">Carregando...</p>
                              ) : defaultOfficeHoursSummary.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                  {defaultOfficeHoursSummary.map((item) => (
                                    <div
                                      key={item.day}
                                      className="rounded-md border border-amber-300/50 dark:border-amber-700/40 bg-white/80 dark:bg-slate-900/60 px-2.5 py-2"
                                    >
                                      <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-100">
                                        {item.day}
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {item.intervals.map((interval) => (
                                          <span
                                            key={`${item.day}-${interval}`}
                                            className="inline-flex items-center rounded-full border border-amber-300/60 dark:border-amber-700/50 bg-amber-100/80 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-100"
                                          >
                                            {interval}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-amber-800 dark:text-amber-200">Não configurado.</p>
                              )}

                              <p className="text-xs text-amber-800 dark:text-amber-200">
                                Configure apenas os dias que precisam sobrescrever esse padrão nesta mensagem.
                              </p>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-orange-300/60 dark:border-orange-700/60 bg-orange-50/70 dark:bg-orange-950/20 p-3">
                        <p className="text-xs text-orange-800 dark:text-orange-200">
                          <span className="font-semibold">Dias personalizados da mensagem:</span>{' '}
                          os dias configurados abaixo sobrescrevem o expediente padrão global. Os demais
                          continuam seguindo o expediente cadastrado.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Dias personalizados</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected = selectedDays.has(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleDay(day.value)}
                              aria-pressed={isSelected}
                              className={`min-w-14 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-500'
                                  : 'bg-white dark:bg-slate-900 text-foreground border-gray-300 dark:border-slate-600 hover:border-orange-400'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Clique no dia para criar uma sobrescrita. Clique novamente para remover a
                        sobrescrita e voltar ao expediente padrão global.
                      </p>
                    </div>

                    {groupedWindows.length > 0 && (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {groupedWindows.map((dayGroup) => (
                          <div
                            key={dayGroup.value}
                            className="rounded-xl border border-orange-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-4 space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-foreground">{dayGroup.label}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {dayGroup.ignored
                                    ? 'Nenhum disparo permitido neste dia'
                                    : `${dayGroup.windows.length} intervalo${dayGroup.windows.length > 1 ? 's' : ''}`}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDayMode(dayGroup.value, !dayGroup.ignored)}
                                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium border border-orange-300 hover:border-orange-500 rounded px-2 py-1"
                                >
                                  {dayGroup.ignored ? 'Usar horarios personalizados' : 'Desconsiderar dia'}
                                </button>
                                {!dayGroup.ignored && (
                                  <button
                                    type="button"
                                    onClick={() => addWindowForDay(dayGroup.value)}
                                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium border border-orange-300 hover:border-orange-500 rounded px-2 py-1"
                                  >
                                    <Plus size={12} /> Adicionar intervalo
                                  </button>
                                )}
                              </div>
                            </div>

                            {dayGroup.ignored ? (
                              <div className="rounded-lg border border-dashed border-orange-300/70 dark:border-orange-700/60 bg-orange-100/60 dark:bg-orange-950/20 px-3 py-2 text-xs text-orange-900 dark:text-orange-100">
                                Neste dia a mensagem nao sera disparada, mesmo que o expediente padrao
                                global permita envio.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {dayGroup.windows.map((window) => (
                                  <div
                                    key={window.index}
                                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center"
                                  >
                                    <input
                                      type="time"
                                      value={window.startTime ?? ''}
                                      onChange={(e) =>
                                        updateWindow(window.index, 'startTime', e.target.value)
                                      }
                                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
                                    />
                                    <input
                                      type="time"
                                      value={window.endTime ?? ''}
                                      onChange={(e) =>
                                        updateWindow(window.index, 'endTime', e.target.value)
                                      }
                                      className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeWindow(window.index)}
                                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                                      aria-label={`Remover intervalo de ${DAY_NAMES[dayGroup.value]}`}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {normalizedWindows.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        Nenhum dia personalizado — a mensagem seguira apenas o expediente padrão global
                      </p>
                    )}
                    {errors.availabilityWindows && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.availabilityWindows.message as string}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <div className="mt-4 pt-4 border-t border-orange-200 dark:border-slate-700">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Dica:</span> Ex.: Segunda 08:00-12:00 e
                13:30-17:00 simula horario de expediente com intervalo de almoco
              </p>
            </div>
          </div>

          {/* Botao de Envio */}
          <div className="sticky bottom-0 z-10 flex justify-end gap-3 pt-4">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/95 backdrop-blur px-4 py-3 shadow-sm">
              <Button type="button" variant="outline" onClick={resetToEmptyForm}>
                Limpar formulário
              </Button>
              <Button type="button" onClick={openDialog} className="btn-primary min-w-32">
              <MessageSquareText size={18} className="mr-2" />
              Enviar Mensagem
              </Button>
            </div>
          </div>
        </form>
      )}

      <ConfirmationDialog
        isOpen={isDialogOpen}
        title="Confirmar envio"
        description="Voce tem certeza que deseja enviar esta mensagem?"
        confirmText="Enviar"
        cancelText="Cancelar"
        onClose={() => setIsDialogOpen(false)}
        callback={handleConfirmSend}
      />
    </>
  );
};
