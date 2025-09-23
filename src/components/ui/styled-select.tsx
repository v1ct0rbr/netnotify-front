import * as React from "react";
import { cn } from "@/lib/utils";

export interface StyledSelectOption {
  label: string;
  value: string;
}

interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: StyledSelectOption[];
  className?: string;
}

export const StyledSelect = React.forwardRef<HTMLSelectElement, StyledSelectProps>(
  ({ options, className, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <select
          ref={ref}
          className={cn(
            "w-full border rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none",
            className
          )}
          {...props}
        >
          <option value="" disabled hidden>
            Selecione o método
          </option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
    );
  }
);
