import React from 'react';
import { HelpCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  description?: string;
  formula?: string;
  status?: 'success' | 'warning' | 'info' | 'default';
  statusText?: string;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  description,
  formula,
  status = 'default',
  statusText,
  icon,
}) => {
  const isAvailable = value !== null && value !== undefined && value !== 'N/A';

  const getStatusBadge = () => {
    if (!statusText) return null;
    if (status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 size={10} />
          {statusText}
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle size={10} />
          {statusText}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
        <Info size={10} />
        {statusText}
      </span>
    );
  };

  return (
    <div className="group relative bg-card p-5 rounded-2xl border border-surfaceBorder hover:border-slate-700 transition-all shadow-md flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className="text-slate-400 group-hover:text-primary transition-colors">{icon}</div>}
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {label}
          </span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Main Metric Value */}
      <div className="my-2">
        {isAvailable ? (
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-semibold text-slate-400 font-sans">
                {unit}
              </span>
            )}
          </div>
        ) : (
          <div className="text-slate-500 font-mono text-sm italic">
            Not Available
          </div>
        )}
      </div>

      {/* Description / Formula hint */}
      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="line-clamp-1">{description || 'Biomechanical metric'}</span>
        {formula && (
          <span
            className="cursor-help text-slate-500 hover:text-cyanAccent transition-colors ml-1"
            title={`Method: ${formula}`}
          >
            <HelpCircle size={14} />
          </span>
        )}
      </div>
    </div>
  );
};
