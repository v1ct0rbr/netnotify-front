

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
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-4">{title}</h2>
                <p className="mb-4">{description}</p>
                <div className="flex justify-end">
                    <button className="mr-2" onClick={onClose}>{cancelText || 'Cancelar'}</button>
                    <button className="btn-primary" onClick={callback}>{confirmText || 'Confirmar'}</button>
                </div>
            </div>
        </div>
    );
}
export default ConfirmationDialog;