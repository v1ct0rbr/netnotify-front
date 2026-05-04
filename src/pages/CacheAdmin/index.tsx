import { useCacheApi, type ClearCacheResponse } from "@/api/cache";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/AuthService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router";

const CacheAdminPage: React.FC = () => {
    const { clearApplicationCache } = useCacheApi();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const isAdmin = authService.isAdmin?.() ?? false;

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [lastResult, setLastResult] = React.useState<ClearCacheResponse | null>(null);

    React.useEffect(() => {
        if (!isAdmin) {
            navigate("/");
        }
    }, [isAdmin, navigate]);

    const clearCacheMutation = useMutation({
        mutationFn: () => clearApplicationCache(),
        onSuccess: async (result) => {
            setLastResult(result);
            setIsDialogOpen(false);
            await queryClient.invalidateQueries();
        },
    });

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-red-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-orange-500 rounded" />
                    <Database size={22} className="text-red-500" />
                    <h2 className="text-xl font-semibold">Administração de Cache</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground ml-10">
                    Área restrita para administradores limparem os caches da aplicação e forçarem o próximo carregamento com dados atualizados.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-red-200/70 dark:border-slate-700">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={18} className="text-red-500" />
                            <CardTitle>Limpar caches do backend</CardTitle>
                        </div>
                        <CardDescription>
                            Remove todos os caches registrados no Spring Cache/Redis. Use quando precisar invalidar dados antigos imediatamente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                            Essa ação afeta toda a aplicação. Depois da limpeza, telas e APIs voltarão a consultar a fonte de dados até o cache ser reconstruído.
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDialogOpen(true)}
                            disabled={clearCacheMutation.isPending}
                            className="gap-2"
                        >
                            {clearCacheMutation.isPending ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : (
                                <Trash2 size={16} />
                            )}
                            Limpar cache agora
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Última execução nesta sessão</CardTitle>
                        <CardDescription>
                            Resumo do retorno mais recente da limpeza de cache feita por esta página.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {lastResult ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                        {lastResult.clearedCount} cache{lastResult.clearedCount !== 1 ? "s" : ""}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">limpos com sucesso</span>
                                </div>
                                <div className="space-y-2">
                                    {lastResult.clearedCaches.map((cacheName) => (
                                        <div
                                            key={cacheName}
                                            className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-mono"
                                        >
                                            {cacheName}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                                Nenhuma limpeza executada ainda nesta sessão.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmationDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    if (!clearCacheMutation.isPending) {
                        setIsDialogOpen(false);
                    }
                }}
                callback={() => {
                    if (!clearCacheMutation.isPending) {
                        clearCacheMutation.mutate();
                    }
                }}
                title="Confirmar limpeza de cache?"
                description="Todos os caches registrados pela aplicação serão invalidados imediatamente. Essa ação é global e deve ser usada apenas quando necessário."
                confirmText={clearCacheMutation.isPending ? "Limpando..." : "Confirmar limpeza"}
                cancelText="Cancelar"
            />
        </div>
    );
};

export default CacheAdminPage;
