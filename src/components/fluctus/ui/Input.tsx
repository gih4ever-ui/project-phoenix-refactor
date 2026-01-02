import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, className = "", value, ...props }: InputProps) => (
  <div className={cn("flex flex-col gap-1 w-full", className)}>
    {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
    <input
      className={cn(
        "border border-input rounded-lg p-2 focus:ring-2 focus:ring-primary/50 outline-none w-full",
        "disabled:bg-muted transition-all text-sm bg-card text-foreground"
      )}
      value={value !== undefined && value !== null && !Number.isNaN(value) ? value : ''}
      {...props}
    />
  </div>
);
