import * as React from "react";
import { CommandList, CommandItem, CommandEmpty } from "./command";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface ComboboxOption {
    label: string;
    value: string;
}



interface ComboboxProps extends React.HTMLAttributes<HTMLButtonElement> {
    value: string;
    onValueChange: (value: string) => void;
    options: ComboboxOption[];
    placeholder?: string;
    className?: string;
    name?: string;
    onBlur?: React.FocusEventHandler<HTMLButtonElement>;
    inputRef?: React.Ref<HTMLButtonElement>;
}

export const Combobox: React.FC<ComboboxProps> = React.forwardRef<HTMLButtonElement, ComboboxProps>(
    ({ value, onValueChange, options, placeholder, className, name, onBlur, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value);

    // Fecha o dropdown ao clicar fora
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Navegação por teclado
    const [highlighted, setHighlighted] = React.useState<number>(-1);
    React.useEffect(() => {
        if (!open) setHighlighted(-1);
    }, [open]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!open) return;
        if (e.key === "ArrowDown") {
            setHighlighted(h => Math.min(h + 1, options.length - 1));
        } else if (e.key === "ArrowUp") {
            setHighlighted(h => Math.max(h - 1, 0));
        } else if (e.key === "Enter" && highlighted >= 0) {
            onValueChange(options[highlighted].value);
            setOpen(false);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className={cn("relative", className)} tabIndex={0} onKeyDown={handleKeyDown}>
            <button
                type="button"
                name={name}
                ref={ref}
                className={cn(
                    "flex items-center w-full border rounded-md shadow-sm bg-white px-3 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary",
                    open ? "ring-2 ring-primary" : ""
                )}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                onBlur={onBlur}
                {...props}
            >
                <span className={selected ? "" : "text-gray-400"}>
                    {selected ? selected.label : placeholder || "Selecione"}
                </span>
                <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
            </button>
            {open && (
                <CommandList className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {options.length === 0 ? (
                        <CommandEmpty className="py-2 px-4 text-gray-500">Nenhuma opção encontrada</CommandEmpty>
                    ) : (
                        options.map((option, idx) => (
                            <CommandItem
                                key={option.value}
                                value={option.value}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                    onValueChange(option.value);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "cursor-pointer px-4 py-2 hover:bg-primary/10 transition-colors",
                                    option.value === value ? "bg-primary/20 text-primary font-semibold" : "",
                                    highlighted === idx ? "bg-primary/10" : ""
                                )}
                                aria-selected={option.value === value}
                                role="option"
                            >
                                {option.label}
                            </CommandItem>
                        ))
                    )}
                </CommandList>
            )}
        </div>
    );
});
