import { Button } from "./ui/button";


interface ConfirmationDialogProps {
   callback?: () => void;
   title?: string;
   description?: string;
   confirmText?: string;
   cancelText?: string;
   isOpen?: boolean;
   onClose?: () => void;
}

function ConfirmationDialog(props: ConfirmationDialogProps) {
    const { callback, title, description, confirmText, cancelText, isOpen, onClose } = props;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="rounded-lg shadow-lg p-6 dark:bg-gray-800 light:bg-gray-100">
                <h2 className="text-lg font-semibold mb-4">{title}</h2>
                <p className="mb-4">{description}</p>
                <div className="flex justify-end">
                    <Button variant="outline" className="mr-2" onClick={onClose}>{cancelText || 'Cancelar'}</Button>
                    <Button className="btn-primary" onClick={callback}>{confirmText || 'Confirmar'}</Button>
                </div>
            </div>
        </div>
    );
}
export default ConfirmationDialog;