import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type BadgeColor = "blue" | "green" | "red" | "orange" | "purple" | "gold" | "pink" | "gray";

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colors: Record<BadgeColor, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/10 text-success",
  red: "bg-destructive/10 text-destructive",
  orange: "bg-warning/10 text-warning",
  purple: "bg-badge-purple/10 text-badge-purple",
  gold: "bg-badge-gold/10 text-badge-gold border border-badge-gold/20",
  pink: "bg-badge-pink/10 text-badge-pink",
  gray: "bg-muted text-muted-foreground"
};

export const Badge = ({ children, color = "blue", className = "" }: BadgeProps) => (
  <span className={cn("px-2 py-1 rounded-full text-xs font-bold", colors[color], className)}>
    {children}
  </span>
);
