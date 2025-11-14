import { Button } from "./ui/button";
import { useRef, useEffect } from "react";


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
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (isOpen && confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-lg shadow-2xl bg-white dark:bg-gray-900 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {title}
                    </h2>
                </div>

                {/* Content */}
                <div className="mb-8">
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Footer with Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end">
                    <Button 
                        variant="outline" 
                        className="w-full sm:w-auto order-2 sm:order-1"
                        onClick={onClose}
                    >
                        {cancelText || 'Cancelar'}
                    </Button>
                    <Button 
                        ref={confirmButtonRef}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium order-1 sm:order-2" 
                        onClick={callback}
                    >
                        {confirmText || 'Confirmar'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
export default ConfirmationDialog;