import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, className = "", onClick }: CardProps) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-card rounded-xl shadow-sm border border-border p-6 transition-all",
      onClick && "cursor-pointer hover:shadow-md",
      className
    )}
  >
    {children}
  </div>
);
