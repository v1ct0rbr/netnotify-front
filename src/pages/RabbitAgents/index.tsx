import { useRabbitAgentsApi, type DirectNotifyRequest, type RabbitAgentDTO, type SortDirection, type SortBy } from "@/api/rabbitAgents";
import api from "@/config/axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { authService } from "@/services/AuthService";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Cpu,
    RefreshCw,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Send,
    Wifi,
    Hash,
    Building2,
    Network,
    MessageSquare,
    X,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const AUTO_REFRESH_INTERVAL_MS = 30_000;

type AuxOption = { id: number; name: string };

const getDefaultOption = (options: string[], preferred: string): string => {
    const normalizedPreferred = preferred.trim().toLowerCase();
    const found = options.find((opt) => opt.trim().toLowerCase() === normalizedPreferred);
    return found ?? options[0] ?? preferred;
};

const RabbitAgentsPage: React.FC = () => {
    const { listAgents, sendDirectMessage } = useRabbitAgentsApi();
    const isAdmin = authService.isAdmin?.() ?? false;
    const navigate = useNavigate();

    const [sortBy, setSortBy] = useState<SortBy>("queue");
    const [direction, setDirection] = useState<SortDirection>("asc");
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Direct message modal state
    const [selectedAgent, setSelectedAgent] = useState<RabbitAgentDTO | null>(null);
    const [directTitle, setDirectTitle] = useState("");
    const [directContent, setDirectContent] = useState("");
    const [directLevel, setDirectLevel] = useState("Normal");
    const [directType, setDirectType] = useState("Notificação");
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            navigate("/");
        }
    }, [isAdmin, navigate]);

    const { data: agents, isLoading, refetch } = useQuery<RabbitAgentDTO[]>({
        queryKey: ["rabbit-agents", sortBy, direction],
        queryFn: () => listAgents(sortBy, direction),
        staleTime: 20_000,
        enabled: isAdmin,
    });

    const { data: levelsData, isLoading: levelsLoading } = useQuery<AuxOption[]>({
        queryKey: ["direct-notify-levels"],
        queryFn: async () => {
            const res = await api.get<AuxOption[]>("/aux/levels");
            return res.data;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const { data: typesData, isLoading: typesLoading } = useQuery<AuxOption[]>({
        queryKey: ["direct-notify-types"],
        queryFn: async () => {
            const res = await api.get<AuxOption[]>("/aux/message-types");
            return res.data;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const levelOptions = levelsData?.map((l) => l.name).filter(Boolean) ?? [];
    const typeOptions = typesData?.map((t) => t.name).filter(Boolean) ?? [];

    useEffect(() => {
        if (selectedAgent && levelOptions.length > 0) {
            setDirectLevel((current) =>
                levelOptions.includes(current) ? current : getDefaultOption(levelOptions, "Normal")
            );
        }
    }, [selectedAgent, levelOptions]);

    useEffect(() => {
        if (selectedAgent && typeOptions.length > 0) {
            setDirectType((current) =>
                typeOptions.includes(current) ? current : getDefaultOption(typeOptions, "Notificação")
            );
        }
    }, [selectedAgent, typeOptions]);

    // Auto-refresh
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(() => {
                refetch();
            }, AUTO_REFRESH_INTERVAL_MS);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, refetch]);

    const handleSort = (column: SortBy) => {
        if (sortBy === column) {
            setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(column);
            setDirection("asc");
        }
    };

    const SortIcon = ({ column }: { column: SortBy }) => {
        if (sortBy !== column) return <ArrowUpDown size={14} className="opacity-40" />;
        return direction === "asc" ? <ArrowUp size={14} className="text-purple-500" /> : <ArrowDown size={14} className="text-purple-500" />;
    };

    const directMutation = useMutation({
        mutationFn: ({ queueName, payload }: { queueName: string; payload: DirectNotifyRequest }) =>
            sendDirectMessage(queueName, payload),
        onSuccess: () => {
            setSelectedAgent(null);
            setDirectTitle("");
            setDirectContent("");
            setDirectLevel(getDefaultOption(levelOptions, "Normal"));
            setDirectType(getDefaultOption(typeOptions, "Notificação"));
        },
    });

    const handleSendDirect = () => {
        if (!selectedAgent) return;
        if (!directContent.trim()) {
            toast.warning("O conteúdo da mensagem é obrigatório.");
            return;
        }
        if (levelOptions.length === 0 || typeOptions.length === 0) {
            toast.warning("Aguarde o carregamento de nível e tipo para enviar a mensagem.");
            return;
        }
        directMutation.mutate({
            queueName: selectedAgent.queueName,
            payload: {
                title: directTitle || undefined,
                content: directContent,
                level: directLevel,
                type: directType,
            },
        });
    };

    const openModal = (agent: RabbitAgentDTO) => {
        setSelectedAgent(agent);
        setDirectTitle("");
        setDirectContent("");
        setDirectLevel(getDefaultOption(levelOptions, "Normal"));
        setDirectType(getDefaultOption(typeOptions, "Notificação"));
    };

    const queueTypeBadge = (type: string) => {
        const map: Record<string, string> = {
            geral: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
            departamento: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
            outro: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        };
        return map[type] ?? map.outro;
    };

    if (!isAdmin) return null;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-purple-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-indigo-500 rounded" />
                        <Cpu size={22} className="text-purple-500" />
                        <h2 className="text-xl font-semibold">Agentes Conectados</h2>
                        {agents && (
                            <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5 font-medium">
                                {agents.length} agente{agents.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAutoRefresh((v) => !v)}
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-all ${autoRefresh
                                    ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
                                    : "bg-white border-gray-300 text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400"
                                }`}
                        >
                            <Wifi size={14} />
                            {autoRefresh ? "Auto-atualização ativa" : "Auto-atualização"}
                        </button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isLoading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                            Atualizar
                        </Button>
                    </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground ml-10">
                    Agentes conectados via RabbitMQ em tempo real. Clique nos cabeçalhos para ordenar.
                </p>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-slate-800/60">
                            <TableHead
                                className="cursor-pointer select-none hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors"
                                onClick={() => handleSort("queue")}
                            >
                                <div className="flex items-center gap-2">
                                    <Hash size={14} className="text-purple-500" />
                                    Fila
                                    <SortIcon column="queue" />
                                </div>
                            </TableHead>

                            <TableHead>
                                <div className="flex items-center gap-2">
                                    <Cpu size={14} className="text-indigo-500" />
                                    Hostname
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="flex items-center gap-2">
                                    <Building2 size={14} className="text-teal-500" />
                                    Departamento
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer select-none hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors"
                                onClick={() => handleSort("ip")}
                            >
                                <div className="flex items-center gap-2">
                                    <Network size={14} className="text-orange-500" />
                                    Endereço IP
                                    <SortIcon column="ip" />
                                </div>
                            </TableHead>

                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading &&
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}

                        {!isLoading && (!agents || agents.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                    <Cpu size={32} className="mx-auto mb-3 opacity-30" />
                                    <p>Nenhum agente conectado no momento.</p>
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading &&
                            agents?.map((agent) => (
                                <TableRow key={agent.queueName} className="hover:bg-purple-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                    <TableCell className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                        {agent.queueName}
                                    </TableCell>

                                    <TableCell className="font-medium">{agent.agentHostname || "—"}</TableCell>
                                    <TableCell>{agent.department ?? <span className="text-muted-foreground italic text-xs">geral</span>}</TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {agent.peerAddress}
                                        {agent.peerPort ? `:${agent.peerPort}` : ""}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20"
                                            onClick={() => openModal(agent)}
                                        >
                                            <Send size={13} />
                                            Enviar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            {/* Direct Send Modal */}
            {selectedAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-purple-200 dark:border-slate-700 w-full max-w-md mx-4 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Send size={18} className="text-purple-500" />
                                <h3 className="text-lg font-semibold">Enviar Mensagem Direta</h3>
                            </div>
                            <button
                                onClick={() => setSelectedAgent(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-sm text-muted-foreground bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2 font-mono">
                            {selectedAgent.queueName}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Título (opcional)</label>
                                <input
                                    type="text"
                                    value={directTitle}
                                    onChange={(e) => setDirectTitle(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    placeholder="Título da notificação"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Conteúdo <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={directContent}
                                    onChange={(e) => setDirectContent(e.target.value)}
                                    rows={4}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                                    placeholder="Conteúdo da notificação..."
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nível</label>
                                    <select
                                        value={directLevel}
                                        onChange={(e) => setDirectLevel(e.target.value)}
                                        disabled={levelsLoading || levelOptions.length === 0}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    >
                                        {(levelOptions.length > 0 ? levelOptions : ["Carregando..."]).map((level) => (
                                            <option key={level} value={level}>
                                                {level}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipo</label>
                                    <select
                                        value={directType}
                                        onChange={(e) => setDirectType(e.target.value)}
                                        disabled={typesLoading || typeOptions.length === 0}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    >
                                        {(typeOptions.length > 0 ? typeOptions : ["Carregando..."]).map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                            <Button variant="outline" onClick={() => setSelectedAgent(null)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSendDirect}
                                disabled={
                                    directMutation.isPending ||
                                    !directContent.trim() ||
                                    levelsLoading ||
                                    typesLoading ||
                                    levelOptions.length === 0 ||
                                    typeOptions.length === 0
                                }
                                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                            >
                                {directMutation.isPending ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                                Enviar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RabbitAgentsPage;
