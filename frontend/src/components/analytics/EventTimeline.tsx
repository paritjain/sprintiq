import React from 'react';
import { MovementEvent } from '../../types';
import { Clock, Play, MapPin, CheckCircle, Flame } from 'lucide-react';

interface EventTimelineProps {
  events: MovementEvent[];
  onSelectEvent: (timestamp: number) => void;
  activeTime?: number;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events = [],
  onSelectEvent,
  activeTime = 0,
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-sm text-center">
        No discrete movement events were detected above the required kinematic prominence threshold.
      </div>
    );
  }

  const getEventBadgeColor = (type: string) => {
    if (type.includes('left')) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    if (type.includes('right')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (type.includes('takeoff')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    if (type.includes('landing')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-surfaceBorder">
        <span className="font-semibold uppercase tracking-wider font-mono">
          Detected Biomechanical Milestones ({events.length})
        </span>
        <span className="text-[11px] text-slate-500">
          Click any event to sync video player
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
        {events.map((ev) => {
          const isNear = Math.abs(activeTime - ev.timestamp_s) < 0.15;
          return (
            <div
              key={ev.event_id}
              onClick={() => onSelectEvent(ev.timestamp_s)}
              className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col justify-between ${
                isNear
                  ? 'bg-primary/15 border-primary text-white sports-glow-lime'
                  : 'bg-card border-surfaceBorder hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getEventBadgeColor(
                    ev.type
                  )}`}
                >
                  {ev.label}
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  {ev.timestamp_s.toFixed(3)}s
                </span>
              </div>

              <div className="text-[11px] text-slate-400 line-clamp-1">
                {ev.notes || `Frame #${ev.frame_index}`}
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Frame {ev.frame_index}</span>
                <span>Conf: {(ev.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
