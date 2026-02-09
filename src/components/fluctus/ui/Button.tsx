import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "warning" | "ghost" | "outline" | "active";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary: "bg-card text-foreground border border-border hover:bg-muted",
  danger: "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20",
  success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted",
  outline: "border border-border text-foreground hover:bg-muted",
  active: "bg-primary/10 text-primary border border-primary/20 shadow-inner"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, onClick, variant = "primary", className = "", disabled, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";
