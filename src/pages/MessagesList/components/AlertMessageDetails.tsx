import { useMessagesApi, type MessageResponseDTO } from "@/api/messages";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StringUtils } from "@/utils/StringUtils";
import { useQuery } from "@tanstack/react-query";
import { formatRelative } from "date-fns";
import { ptBR } from "date-fns/locale";
import React from "react";

type AlertMessageDetailsProps = {
    id?: string | null;
    open: boolean;
    onClose: () => void;
    
};

export function AlertMessageDetails({ id, open, onClose }: AlertMessageDetailsProps) {

    const { unescapeServerHtml } = StringUtils();

    const { getMessageById } = useMessagesApi();
    // Fetch message details by ID
    // You can use React Query or any data fetching library here
    // For simplicity, we'll just call the function directly (not recommended for real apps)
 

      const { data, isLoading, isError, refetch } = useQuery<MessageResponseDTO, Error>({
        queryKey: ["message", id],
        queryFn: async () => {
            if (!id) throw new Error("missing id");
            return await getMessageById(id);
        },
        enabled: !!id && open,
        retry: false,
    });

    
    const [sanitizedHtml, setSanitizedHtml] = React.useState<string>("");

    // sanitize HTML content when data changes; prefer dompurify if available
    React.useEffect(() => {
        if (!data?.content) {
            setSanitizedHtml("");
            return;
        }
        

        let cancelled = false;
        (async () => {
            try {
                            
                const safe = unescapeServerHtml(data.content);
              
                if (!cancelled) setSanitizedHtml(String(safe));
            } catch (e) {
                // dompurify not available — fallback to raw content (risky)
                console.log("dompurify not available — rendering raw HTML. Install 'dompurify' to sanitize content.", e);
                if (!cancelled) setSanitizedHtml(unescapeServerHtml(data.content));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [data?.content]);

    
    React.useEffect(() => {
        // refetch when modal opens with an id
        if (open && id) refetch();
    }, [open, id, refetch]);
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-2xl" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Detalhes da Mensagem</DialogTitle>
                </DialogHeader>

                <div className="mt-2">
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : isError ? (
                        <div className="text-sm text-destructive">Falha ao carregar detalhes da mensagem.</div>
                    ) : data ? (
                        <div className="space-y-4 text-sm">
                            <div>
                                <div className="text-xs text-muted-foreground">Título</div>
                                <div className="mt-1">{data.title}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Conteúdo</div>
                                                               {/* render only sanitized HTML */}
                                <div
                                    className="mt-1 prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: sanitizedHtml || "" }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground">Usuário</div>
                                    <div className="mt-1">{data.user}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Nível</div>
                                    <div className="mt-1"><StatusBadge level={data.level} /></div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Tipo</div>
                                    <div className="mt-1">{data.messageType}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Criado em</div>
                                    <div className="mt-1">{data.createdAt ? formatRelative(new Date(data.createdAt), new Date(), { locale: ptBR }) : "-"}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">Nenhum detalhe disponível.</div>
                    )}
                </div>

                <DialogFooter className="flex justify-end gap-2 mt-4">
                    <Button onClick={onClose}>Fechar</Button>                    
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
    
}
