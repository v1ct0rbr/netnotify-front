import type { MessageResponseDTO } from "@/api/messages";
import { useMessagesApi } from "@/api/messages";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledSelect } from "@/components/ui/styled-select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import api from "@/config/axios";
import { useAuthStore } from "@/store/useAuthStore";
import type { ApiPageResponse } from "@/utils/ApiPageResponse";
import { formatRelativeDate } from "@/utils/DateUtils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eraser, Eye, Search, Trash2, Filter, FileText, Zap, AlertCircle, Tag, Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AlertMessageDetails } from "./components/AlertMessageDetails";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";

const PAGE_SIZE = 10;

const MessagesList: React.FC = () => {
    const { filterMessages, deleteMessage } = useMessagesApi();
    const { user } = useAuthStore();
    const isAdmin = user?.roles?.includes(import.meta.env.VITE_ROLE_ADMIN || 'admin');

    const [searchParams, setSearchParams] = useSearchParams();

    const initialPage = Number(searchParams.get("page") || "1");
    const [page, setPage] = useState(initialPage);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);



    const openAlert = (id: string) => {
        setSelectedMessageId(id);
        setIsAlertOpen(true);
    };

    const closeAlert = () => {
        setSelectedMessageId(null);
        setIsAlertOpen(false);
    };
    // form state (initialized from URL search params so the first request
    // uses them immediately)
    const [titleFilter, setTitleFilter] = useState<string>(() => searchParams.get("title") || "");
    const [contentFilter, setContentFilter] = useState<string>(() => searchParams.get("content") || "");
    const [levelIdFilter, setLevelIdFilter] = useState<string>(() => searchParams.get("levelId") || "");
    const [messageTypeIdFilter, setMessageTypeIdFilter] = useState<string>(() => searchParams.get("messageTypeId") || "");

    // applied filters used by the query (initialized from URL)
    const [appliedFilters, setAppliedFilters] = useState<{
        title?: string;
        content?: string;
        levelId?: number;
        messageTypeId?: number;

    }>(() => {
        // Initialize from URL search params
        const spTitle = searchParams.get("title") || "";
        const spContent = searchParams.get("content") || "";
        const spLevel = searchParams.get("levelId") || "";
        const spType = searchParams.get("messageTypeId") || "";

        return {
            title: spTitle || undefined,
            content: spContent || undefined,
            levelId: spLevel ? Number(spLevel) : undefined,
            messageTypeId: spType ? Number(spType) : undefined,
        };
    });

    // aux data for selects
    const { data: levels } = useQuery({
        queryKey: ['levels'],
        queryFn: async () => {
            console.log("Loading levels...")
            const res = await api.get<{ id: number; name: string }[]>('/aux/levels');
            return res.data;
        },
        staleTime: 10 * 60 * 1000,  // Cache por 10min
    });

    const { data: types } = useQuery({
        queryKey: ['types'],
        queryFn: async () => {
            console.log("Loading types...")
            const res = await api.get<{ id: number; name: string }[]>('/aux/message-types');
            return res.data;
        },
        staleTime: 10 * 60 * 1000,  // Cache por 10min
    });



    // NOTE: initialization above reads URL params synchronously so the first
    // query will use them immediately (no mount effect required).

    // Helper to build URLSearchParams from current filter state and page
    const buildParams = (opts: { title?: string; content?: string; levelId?: string; messageTypeId?: string; page?: number; size?: number }) => {
        const params = new URLSearchParams();
        if (opts.title) params.set("title", opts.title);
        if (opts.content) params.set("content", opts.content);
        if (opts.levelId) params.set("levelId", opts.levelId);
        if (opts.messageTypeId) params.set("messageTypeId", opts.messageTypeId);
        if (opts.page && opts.page > 1) params.set("page", String(opts.page));
        if (PAGE_SIZE) params.set("size", String(PAGE_SIZE));
        return params;
    };


    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["messages", page, appliedFilters],
        queryFn: async () => {
            const params = {
                title: appliedFilters.title,
                content: appliedFilters.content,
                levelId: appliedFilters.levelId,
                messageTypeId: appliedFilters.messageTypeId,
                page: page - 1,
                size: PAGE_SIZE,
                sortBy: 1,
                sortOrder: 1,

            } as any;


            const pageResp = await filterMessages(params) as ApiPageResponse<MessageResponseDTO>;
            // map ApiPageResponse to the UI shape expected by the component
            return {
                data: pageResp.content,
                total: pageResp.totalElements ?? pageResp.content.length,
            } as { data: MessageResponseDTO[]; total: number };
        },
    });

    const mutation = useMutation({
        mutationFn: (id: string) => deleteMessage(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
        onError: () => setToast({ type: "error", message: "Erro ao apagar mensagem." }),
    });

    const handleDelete = (id: string) => {
        if (!window.confirm("Tem certeza que deseja apagar esta mensagem?")) return;
        mutation.mutate(id);
    };



    const applyFilters = () => {
        setAppliedFilters({
            title: titleFilter || undefined,
            content: contentFilter || undefined,
            levelId: levelIdFilter ? Number(levelIdFilter) : undefined,
            messageTypeId: messageTypeIdFilter ? Number(messageTypeIdFilter) : undefined,
        });

        setSearchParams(buildParams({ content: contentFilter || undefined as any, levelId: levelIdFilter, messageTypeId: messageTypeIdFilter, page, size: PAGE_SIZE }));
    };

    const clearFilters = () => {
        setContentFilter("");
        setLevelIdFilter("");
        setMessageTypeIdFilter("");
        setTitleFilter("");
        setAppliedFilters({});
        setPage(1);
        setSearchParams(buildParams({ page: 1 }));
    };


    // Update URL when page changes
    useEffect(() => {
        setSearchParams(buildParams({ content: contentFilter || undefined as any, levelId: levelIdFilter, messageTypeId: messageTypeIdFilter, page, title: titleFilter || undefined, size: PAGE_SIZE }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Keep URL in sync whenever appliedFilters change so someone loading the URL
    // with parameters will see the same request performed earlier (we also
    // initialized appliedFilters from URL during state setup).
    useEffect(() => {
        setSearchParams(buildParams({ title: appliedFilters.title || undefined, content: appliedFilters.content || undefined as any, levelId: appliedFilters.levelId ? String(appliedFilters.levelId) : undefined, messageTypeId: appliedFilters.messageTypeId ? String(appliedFilters.messageTypeId) : undefined, page }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appliedFilters]);

    return (
        <div className="p-6">

            {/* Filtros Section */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-blue-200 dark:border-slate-700 mb-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded"></div>
                    <div className="flex items-center justify-between w-full">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Filter size={20} className="text-blue-500" />
                            Filtrar Mensagens
                        </h3>
                        <Link to="/new-message" className=" flex items-center gap-2 text-blue-950">
                            <Plus size={18} />
                            Nova Mensagem
                        </Link>
                    </div>
                </div>

                <form
                    onSubmit={(e) => { e.preventDefault(); setPage(1); applyFilters(); }}
                    className="space-y-5"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Título */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-blue-500" />
                                <label className="block text-sm font-medium">Título</label>
                            </div>
                            <input
                                value={titleFilter}
                                onChange={(e) => setTitleFilter(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setPage(1); applyFilters(); } }}
                                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all text-sm"
                                placeholder="Buscar por título"
                            />
                        </div>

                        {/* Conteúdo */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Zap size={18} className="text-cyan-500" />
                                <label className="block text-sm font-medium">Conteúdo</label>
                            </div>
                            <input
                                value={contentFilter}
                                onChange={(e) => setContentFilter(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setPage(1); applyFilters(); } }}
                                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-slate-950 dark:text-white dark:border-slate-700 transition-all text-sm"
                                placeholder="Buscar por conteúdo"
                            />
                        </div>

                        {/* Level */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-amber-500" />
                                <label className="block text-sm font-medium">Nível</label>
                            </div>
                            <StyledSelect
                                options={[{ label: "Todos", value: "" }, ...(levels ?? []).map((l) => ({ label: l.name, value: String(l.id) }))]}
                                value={levelIdFilter}
                                onChange={(e) => setLevelIdFilter(e.target.value)}
                            />
                        </div>

                        {/* Tipo */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Tag size={18} className="text-orange-500" />
                                <label className="block text-sm font-medium">Tipo</label>
                            </div>
                            <StyledSelect
                                options={[{ label: "Todos", value: "" }, ...(types ?? []).map((t) => ({ label: t.name, value: String(t.id) }))]}
                                value={messageTypeIdFilter}
                                onChange={(e) => setMessageTypeIdFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-3 border-t border-blue-200 dark:border-slate-700">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { clearFilters(); }}
                            type="button"
                            className="w-full md:w-auto"
                        >
                            <Eraser size={18} className="mr-2" />
                            Limpar
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => { setPage(1); applyFilters(); }}
                            type="button"
                            className="w-full md:w-auto btn-primary"
                        >
                            <Search size={18} className="mr-2" />
                            Aplicar
                        </Button>
                    </div>
                </form>
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Setores</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    <TableCell>
                                        <Skeleton className="h-4 max-w-[300px]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-32" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-32" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-40" />
                                    </TableCell>

                                    <TableCell>
                                        <Skeleton className="h-8 w-12 rounded-md" />
                                    </TableCell>

                                </TableRow>
                            ))
                            : data?.data.map((msg) => (
                                <TableRow key={msg.id}>
                                    <TableCell className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-left">{msg.title}</TableCell>
                                    <TableCell className="text-left">
                                        {msg.departments.map((dept) => dept.name).join(", ")}
                                    </TableCell>
                                    <TableCell className="text-left">{msg.user}</TableCell>
                                    <TableCell className="text-left"> <StatusBadge level={msg.level} /></TableCell>
                                    <TableCell className="text-left">{msg.messageType}</TableCell>
                                    <TableCell className="text-left">{formatRelativeDate(msg.createdAt)}</TableCell>

                                    <TableCell className="text-left flex flex-row items-center gap-0.5">
                                        {isAdmin && (
                                            <button
                                                aria-label="Apagar"
                                                style={{
                                                    background: "var(--btn-destructive-bg, #f56565)",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    padding: 6,
                                                    cursor: mutation.isPending ? "not-allowed" : "pointer",
                                                    color: "var(--btn-destructive-foreground, #fff)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    opacity: mutation.isPending ? 0.6 : 1,
                                                }}
                                                onClick={() => handleDelete(msg.id)}
                                                disabled={mutation.isPending}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}

                                        <Tooltip>
                                            <TooltipTrigger asChild>

                                                <button
                                                    aria-label="Detalhes"
                                                    style={{
                                                        background: "var(--btn-primary-bg, #4299e1)",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        padding: 6,
                                                        cursor: "pointer",
                                                        color: "var(--btn-primary-foreground, #fff)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        marginLeft: 8,
                                                    }}
                                                    onClick={() => openAlert(msg.id)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="tooltip-content">Ver detalhes</div>
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    aria-label="Clonar"
                                                    style={{
                                                        background: "var(--btn-success-bg, #68d391)",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        padding: 6,
                                                        cursor: "pointer",
                                                        color: "var(--btn-success-foreground, #fff)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        marginLeft: 8,
                                                    }}
                                                    to={{ pathname: `/new-message`, search: `?id=${msg.id}` }}
                                                >
                                                    <Copy size={18} />
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="tooltip-content">Clonar mensagem</div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>

                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>
            <AlertMessageDetails open={isAlertOpen} id={selectedMessageId} onClose={closeAlert} />

            <div className="flex justify-center mt-8">
                {isLoading ? (
                    <Skeleton className="h-9 w-64" />
                ) : (
                    <Pagination currentPage={page} totalPages={Math.ceil((data?.total ?? 0) / PAGE_SIZE)} onPageChange={setPage} />
                )}
            </div>

            {toast && (
                <div className="mt-6">
                    <div className={`p-4 rounded-lg border ${toast.type === "success"
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                        } font-medium`}>
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesList;
