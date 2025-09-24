import React, { useEffect, useState } from "react";
import { useMessagesApi } from "@/api/messages";
import type { MessageResponseDTO } from "@/api/messages";
import api from "@/config/axios";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { StyledSelect } from "@/components/ui/styled-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/useAuthStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

const PAGE_SIZE = 10;

const MessagesList: React.FC = () => {
    const { filterMessages, deleteMessage } = useMessagesApi();
    const { user } = useAuthStore();
        const isAdmin = user?.roles?.some((r) => r.name === "ROLE_SUPER");

    // form state
    const [contentFilter, setContentFilter] = useState("");
    const [levelIdFilter, setLevelIdFilter] = useState<string>("");
    const [messageTypeIdFilter, setMessageTypeIdFilter] = useState<string>("");

    // applied filters used by the query
    const [appliedFilters, setAppliedFilters] = useState<{
        content?: string;
        levelId?: number;
        messageTypeId?: number;
    }>({});

    // aux data for selects
    const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
    const [types, setTypes] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        api.get("/aux/levels").then((r) => setLevels(r.data)).catch(() => {});
        api.get("/aux/message-types").then((r) => setTypes(r.data)).catch(() => {});
    }, []);

    const [page, setPage] = useState(1);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["messages", page, appliedFilters],
        queryFn: async () => {
            const params = {
                page,
                pageSize: PAGE_SIZE,
                content: appliedFilters.content,
                levelId: appliedFilters.levelId,
                messageTypeId: appliedFilters.messageTypeId,
            } as any;

            const results = await filterMessages(params);
            // backend returns MessageResponseDTO[]; Try to infer total from headers if available in the API wrapper — fallback to length
            return {
                data: results,
                total: results.length,
            } as { data: MessageResponseDTO[]; total: number };
        },
    });

    const mutation = useMutation({
        mutationFn: (id: string) => deleteMessage(id),
        onSuccess: () => {
            setToast({ type: "success", message: "Mensagem apagada." });
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
            content: contentFilter || undefined,
            levelId: levelIdFilter ? Number(levelIdFilter) : undefined,
            messageTypeId: messageTypeIdFilter ? Number(messageTypeIdFilter) : undefined,
        });
        setPage(1);
    };

    const clearFilters = () => {
        setContentFilter("");
        setLevelIdFilter("");
        setMessageTypeIdFilter("");
        setAppliedFilters({});
        setPage(1);
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h1 style={{ fontSize: 28, margin: 0 }}>Mensagens</h1>
            </div>

            {/* Filter form */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ minWidth: 280 }}>
                        <label className="block text-sm font-medium mb-1">Conteúdo</label>
                        <input
                            value={contentFilter}
                            onChange={(e) => setContentFilter(e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm"
                            placeholder="Buscar por conteúdo"
                        />
                    </div>

                    <div style={{ width: 200 }}>
                        <label className="block text-sm font-medium mb-1">Level</label>
                        <StyledSelect
                            options={[{ label: "", value: "" }, ...levels.map((l) => ({ label: l.name, value: String(l.id) }))]}
                            value={levelIdFilter}
                            onChange={(e) => setLevelIdFilter(e.target.value)}
                        />
                    </div>

                    <div style={{ width: 220 }}>
                        <label className="block text-sm font-medium mb-1">Tipo</label>
                        <StyledSelect
                            options={[{ label: "", value: "" }, ...types.map((t) => ({ label: t.name, value: String(t.id) }))]}
                            value={messageTypeIdFilter}
                            onChange={(e) => setMessageTypeIdFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                    <Button variant="outline" size="sm" onClick={clearFilters} type="button">
                        Limpar
                    </Button>
                    <Button size="sm" onClick={applyFilters} type="button">
                        Aplicar
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Conteúdo</TableHead>
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
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-40" />
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            <Skeleton className="h-8 w-12 rounded-md" />
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        : data?.data.map((msg) => (
                                <TableRow key={msg.id}>
                                    <TableCell className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">{msg.content}</TableCell>
                                    <TableCell>{msg.user}</TableCell>
                                    <TableCell>{msg.level}</TableCell>
                                    <TableCell>{msg.messageType}</TableCell>
                                    <TableCell>{new Date(msg.createdAt).toLocaleString()}</TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            <button
                                                aria-label="Apagar"
                                                style={{
                                                    background: "#f56565",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    padding: 6,
                                                    cursor: mutation.isPending ? "not-allowed" : "pointer",
                                                    color: "#fff",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    opacity: mutation.isPending ? 0.6 : 1,
                                                }}
                                                onClick={() => handleDelete(msg.id)}
                                                disabled={mutation.isPending}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                </TableBody>
            </Table>

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
