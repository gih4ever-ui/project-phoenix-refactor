import { cn } from "@/lib/utils";
import { forwardRef, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", onClick }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl shadow-sm border border-border p-6 transition-all",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";
