import { useOfficeHoursApi } from "@/api/officeHours";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/react-query";
import { authService } from "@/services/AuthService";
import type { AvailabilityWindow } from "@/store/useFormStore";
import {
  buildOfficeHoursSummary,
  DAY_NAMES,
  DAYS_OF_WEEK,
  normalizeAvailabilityWindows,
  parseTimeToMinutes,
} from "@/utils/availabilityWindows";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type EditableAvailabilityWindow = AvailabilityWindow & { clientId: string };

const createClientId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `office-hours-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sortWindows = <T extends AvailabilityWindow>(windows: T[]): T[] =>
  [...windows].sort((left, right) => {
    const dayComparison = Number(left.day) - Number(right.day);
    if (dayComparison !== 0) {
      return dayComparison;
    }
    return left.startTime.localeCompare(right.startTime);
  });

const toEditableWindows = (windows: AvailabilityWindow[]): EditableAvailabilityWindow[] =>
  sortWindows(windows).map((window) => ({
    ...window,
    clientId: createClientId(),
  }));

const toPersistedWindows = (windows: EditableAvailabilityWindow[]): AvailabilityWindow[] =>
  sortWindows(
    windows.map(({ clientId: _clientId, ...window }) => window)
  );

const validateWindows = (windows: AvailabilityWindow[]): string | null => {
  const intervalsByDay = new Map<string, Array<{ start: number; end: number }>>();

  for (const window of windows) {
    const startMinutes = parseTimeToMinutes(window.startTime);
    const endMinutes = parseTimeToMinutes(window.endTime);

    if (startMinutes === null || endMinutes === null) {
      return "Todos os horários precisam estar no formato HH:mm.";
    }

    if (startMinutes >= endMinutes) {
      return "O horário inicial precisa ser menor que o horário final.";
    }

    const currentDayIntervals = intervalsByDay.get(window.day) ?? [];
    currentDayIntervals.push({ start: startMinutes, end: endMinutes });
    intervalsByDay.set(window.day, currentDayIntervals);
  }

  for (const intervals of intervalsByDay.values()) {
    intervals.sort((left, right) => left.start - right.start);
    for (let index = 1; index < intervals.length; index += 1) {
      if (intervals[index].start < intervals[index - 1].end) {
        return "Existem intervalos sobrepostos no mesmo dia.";
      }
    }
  }

  return null;
};

type GroupedWindow = EditableAvailabilityWindow;

const OfficeHoursAdminPage: React.FC = () => {
  const { getOfficeHoursSettings, updateOfficeHoursSettings } = useOfficeHoursApi();
  const isAdmin = authService.isAdmin?.() ?? false;
  const navigate = useNavigate();
  const [windows, setWindows] = React.useState<EditableAvailabilityWindow[]>([]);
  const [hasLocalChanges, setHasLocalChanges] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin) {
      navigate("/");
    }
  }, [isAdmin, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["officeHoursSettings"],
    queryFn: () => getOfficeHoursSettings(),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (!data || hasLocalChanges) {
      return;
    }

    setWindows(toEditableWindows(normalizeAvailabilityWindows(data.availabilityWindows)));
  }, [data, hasLocalChanges]);

  const groupedWindows = React.useMemo(
    () =>
      DAYS_OF_WEEK.map((day) => ({
        value: day.value,
        label: day.label,
        windows: windows.filter((window) => window.day === day.value) as GroupedWindow[],
      })).filter((day) => day.windows.length > 0),
    [windows]
  );

  const selectedDays = React.useMemo(
    () => new Set(groupedWindows.map((dayGroup) => dayGroup.value)),
    [groupedWindows]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validationMessage = validateWindows(toPersistedWindows(windows));
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      return updateOfficeHoursSettings({
        availabilityWindows: JSON.stringify(toPersistedWindows(windows)),
      });
    },
    onSuccess: async (result) => {
      const normalized = toEditableWindows(normalizeAvailabilityWindows(result.availabilityWindows));
      setWindows(normalized);
      setHasLocalChanges(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["officeHoursSettings"] }),
        queryClient.invalidateQueries({ queryKey: ["defaultOfficeHoursWindow"] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar o expediente padrão.");
    },
  });

  const updateWindow = (
    clientId: string,
    key: keyof AvailabilityWindow,
    value: AvailabilityWindow[keyof AvailabilityWindow]
  ) => {
    setWindows((current) =>
      sortWindows(
        current.map((window) =>
          window.clientId === clientId ? { ...window, [key]: String(value) } : window
        )
      )
    );
    setHasLocalChanges(true);
  };

  const addWindowForDay = (day: string) => {
    setWindows((current) =>
      sortWindows([...current, { clientId: createClientId(), day, startTime: "08:00", endTime: "17:00" }])
    );
    setHasLocalChanges(true);
  };

  const removeWindow = (clientId: string) => {
    setWindows((current) => current.filter((window) => window.clientId !== clientId));
    setHasLocalChanges(true);
  };

  const toggleDay = (day: string) => {
    setWindows((current) => {
      const exists = current.some((window) => window.day === day);
      if (exists) {
        return current.filter((window) => window.day !== day);
      }

      return sortWindows([
        ...current,
        { clientId: createClientId(), day, startTime: "08:00", endTime: "17:00" },
      ]);
    });
    setHasLocalChanges(true);
  };

  const resetToSaved = () => {
    setWindows(toEditableWindows(normalizeAvailabilityWindows(data?.availabilityWindows)));
    setHasLocalChanges(false);
  };

  const clearWindows = () => {
    setWindows([]);
    setHasLocalChanges(true);
  };

  const summary = React.useMemo(
    () => buildOfficeHoursSummary(JSON.stringify(toPersistedWindows(windows))),
    [windows]
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-sky-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-sky-500 to-cyan-500 rounded" />
          <CalendarClock size={22} className="text-sky-600" />
          <h2 className="text-xl font-semibold">Expediente padrão</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground ml-10">
          Configure no banco os horários globais usados quando uma mensagem não define janelas próprias.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de horários</CardTitle>
            <CardDescription>
              O administrador pode ajustar os intervalos por dia. Se a lista ficar vazia, o sistema opera sem
              restrição global de horário.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={clearWindows} disabled={saveMutation.isPending}>
                Limpar expediente
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetToSaved}
                disabled={saveMutation.isPending || isLoading}
                className="gap-2"
              >
                <RefreshCw size={16} />
                Recarregar salvo
              </Button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Dias com expediente</label>
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
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-white dark:bg-slate-900 text-foreground border-gray-300 dark:border-slate-600 hover:border-sky-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no dia para ativar ou remover todos os intervalos dele.
              </p>
            </div>

            {isLoading ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                Carregando expediente salvo...
              </div>
            ) : windows.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                Nenhum horário configurado — sem restrição global de expediente.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedWindows.length > 0 && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {groupedWindows.map((dayGroup) => (
                      <div
                        key={dayGroup.value}
                        className="rounded-xl border border-sky-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{dayGroup.label}</h4>
                            <p className="text-xs text-muted-foreground">
                              {dayGroup.windows.length} intervalo{dayGroup.windows.length > 1 ? "s" : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addWindowForDay(dayGroup.value)}
                            className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-medium border border-sky-300 hover:border-sky-500 rounded px-2 py-1"
                          >
                            <Plus size={12} /> Adicionar intervalo
                          </button>
                        </div>

                        <div className="space-y-2">
                          {dayGroup.windows.map((window) => (
                            <div
                              key={window.clientId}
                              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center"
                            >
                              <Input
                                type="time"
                                value={window.startTime}
                                onChange={(event) => updateWindow(window.clientId, "startTime", event.target.value)}
                                aria-label={`Horário inicial de ${dayGroup.label}`}
                              />
                              <Input
                                type="time"
                                value={window.endTime}
                                onChange={(event) => updateWindow(window.clientId, "endTime", event.target.value)}
                                aria-label={`Horário final de ${dayGroup.label}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => removeWindow(window.clientId)}
                                aria-label={`Remover intervalo de ${DAY_NAMES[dayGroup.value]}`}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar expediente
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => refetch()}
                disabled={saveMutation.isPending}
              >
                Atualizar dados do servidor
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo atual</CardTitle>
            <CardDescription>Prévia do expediente que será salvo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.length > 0 ? (
              summary.map((item) => (
                <div key={item.day} className="rounded-lg border bg-muted/30 px-4 py-3">
                  <div className="font-medium">{item.day}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.intervals.join(" | ")}</div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Sem restrição global de horário.
              </div>
            )}

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              Mensagens com janelas próprias continuam prevalecendo sobre este expediente padrão.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OfficeHoursAdminPage;
