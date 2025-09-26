import { useMessagesApi } from "@/api/messages";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";


type DeleteDialogProps = {
    id?: string | null;
    info?: string | null;
    open: boolean;
    onClose: () => void;

};

export function DeleteDialog({ id, info, open, onClose }: DeleteDialogProps) {

    const { deleteMessage } = useMessagesApi();

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteMessage(id);
            onClose();
            toast.success('Message deleted successfully.');
        } catch (error) {
            toast.error('Failed to delete the message.');
            // Optionally, show an error message
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Atenção</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    <p>Tem certeza que deseja deletar a mensagem?</p>
                    {info && <p className="mt-2 text-sm text-muted-foreground">Info: {info}</p>}
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button onClick={handleDelete} className="btn btn-danger">Deletar</button>
                    <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
                </div>
            </DialogContent>
        </Dialog>
    );
}