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
import { Copy, Eraser, Eye, Search, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AlertMessageDetails } from "./components/AlertMessageDetails";

const PAGE_SIZE = 10;

const MessagesList: React.FC = () => {
    const { filterMessages, deleteMessage} = useMessagesApi();
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
        <div style={{ padding: 24 }}>

            {/* Filter form */}
            <div className="mb-4">
                <form
                    onSubmit={(e) => { e.preventDefault(); setPage(1); applyFilters(); }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
                >
                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium mb-1">Título</label>
                        <input
                            value={titleFilter}
                            onChange={(e) => setTitleFilter(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setPage(1); applyFilters(); } }}
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            placeholder="Buscar por título"
                        />
                    </div>

                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium mb-1">Conteúdo</label>
                        <input
                            value={contentFilter}
                            onChange={(e) => setContentFilter(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setPage(1); applyFilters(); } }}
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            placeholder="Buscar por conteúdo"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Level</label>
                        <StyledSelect
                            options={[{ label: "Todos", value: "" }, ...(levels ?? []).map((l) => ({ label: l.name, value: String(l.id) }))]}
                            value={levelIdFilter}
                            onChange={(e) => setLevelIdFilter(e.target.value)}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Tipo</label>
                        <StyledSelect
                            options={[{ label: "Todos", value: "" }, ...(types ?? []).map((t) => ({ label: t.name, value: String(t.id) }))]}
                            value={messageTypeIdFilter}
                            onChange={(e) => setMessageTypeIdFilter(e.target.value)}
                        />
                    </div>

                    <div className="md:col-span-12 flex flex-col md:flex-row md:justify-end gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { clearFilters(); }}
                            type="button"
                            className="w-full md:w-auto"
                        >
                            <Eraser className="mr-1" />
                            Limpar
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => { setPage(1); applyFilters(); }}
                            type="button"
                            className="w-full md:w-auto"
                        >
                            <Search className="mr-1" />
                            Aplicar
                        </Button>
                    </div>
                </form>
            </div>

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Título</TableHead>   
                        <TableHead>Setores</TableHead>                     
                        <TableHead>Usuário</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        {isAdmin && <TableHead>Ações</TableHead>}
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
                                            to={{ pathname: `/`, search: `?id=${msg.id}` }}
                                        >
                                            <Copy size={18} />
                                        </Link>
                                    </TableCell>
                                
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
            <AlertMessageDetails open={isAlertOpen} id={selectedMessageId} onClose={closeAlert} />

            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                {isLoading ? (
                    <Skeleton className="h-9 w-64" />
                ) : (
                    <Pagination currentPage={page} totalPages={Math.ceil((data?.total ?? 0) / PAGE_SIZE)} onPageChange={setPage} />
                )}
            </div>

            {toast && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ padding: 8, borderRadius: 6, background: toast.type === "success" ? "#e6ffed" : "#ffe6e6" }}>
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesList;
