import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  className?: string;
}

const statusConfig = {
  idle: { icon: null, label: '', color: '' },
  saving: { icon: Loader2, label: 'Salvando...', color: 'text-warning animate-spin' },
  saved: { icon: Check, label: 'Salvo na nuvem', color: 'text-success' },
  error: { icon: CloudOff, label: 'Erro ao salvar', color: 'text-destructive' }
};

export const SyncIndicator = ({ status, className = '' }: SyncIndicatorProps) => {
  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium transition-all duration-300", config.color, className)}>
      <Icon size={14} />
      <span>{config.label}</span>
    </div>
  );
};
