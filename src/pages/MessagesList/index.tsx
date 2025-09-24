import { Pagination } from "@/components/ui/pagination";
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
import React, { useState } from "react";

// Tipos de mensagem e usuário
type Message = {
    id: string;
    content: string;
    createdAt: string;
    sender: string;
};





const fetchMessages = async (
    page: number,
    pageSize: number
): Promise<{ data: Message[]; total: number }> => {
    // Substitua pela chamada real de API
    return {
        data: Array.from({ length: pageSize }, (_, i) => ({
            id: `${page}-${i}`,
            content: `Mensagem ${page * pageSize + i + 1}`,
            createdAt: new Date().toISOString(),
            sender: "Usuário",
        })),
        total: 42,
    };
};

const deleteMessage = async (id: string) => {
    // Substitua pela chamada real de API
    // mock: reference id so lint/compiler doesn't complain
    // eslint-disable-next-line no-console
    console.debug("deleteMessage mock, id=", id);
    return true;
};

const PAGE_SIZE = 10;

const MessagesList: React.FC = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.roles.includes({ id: 1, name: 'ROLE_SUPER' });
    const [page, setPage] = useState(1);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const queryClient = useQueryClient();

    const {
        data,
        isLoading,
    } = useQuery({
        queryKey: ["messages", page],
        queryFn: () => fetchMessages(page, PAGE_SIZE),
        
    });

    const mutation = useMutation({
        mutationFn: deleteMessage,
        onSuccess: () => {
            setToast({ type: "success", message: "Mensagem apagada." });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
        onError: () => {
            setToast({ type: "error", message: "Erro ao apagar mensagem." });
        },
    });

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja apagar esta mensagem?")) return;
        mutation.mutate(id);
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, margin: 0 }}>Mensagens</h1>
            </div>
            {toast && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        borderRadius: 4,
                        background: toast.type === "success" ? "#e6ffed" : "#ffe6e6",
                        color: toast.type === "success" ? "#22543d" : "#c53030",
                        border: `1px solid ${toast.type === "success" ? "#38a169" : "#e53e3e"}`,
                    }}
                >
                    {toast.message}
                    <button
                        style={{
                            marginLeft: 16,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "inherit",
                            fontWeight: "bold",
                        }}
                        onClick={() => setToast(null)}
                    >
                        ×
                    </button>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Conteúdo</TableHead>
                        <TableHead>Enviado por</TableHead>
                        <TableHead>Data</TableHead>
                        {isAdmin && <TableHead>Ações</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    <TableCell>
                                        <Skeleton className="h-4 max-w-[300px]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-32" />
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
                        ) : (
                            data?.data.map((msg) => (
                                <TableRow key={msg.id}>
                                    <TableCell className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">{msg.content}</TableCell>
                                    <TableCell>{msg.sender}</TableCell>
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
                            ))
                        )}
                </TableBody>
            </Table>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                {isLoading ? (
                    <Skeleton className="h-9 w-64" />
                ) : (
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil((data?.total ?? 0) / PAGE_SIZE)}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </div>
    );
};

export default MessagesList;
