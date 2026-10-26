import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { AnalysisSession, EventType } from '../types';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Play,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AnalysisHistory: React.FC = () => {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<'all' | 'sprint' | 'jump'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'coverage'>('date');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getAnalyses();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete session '${name}'?`)) {
      return;
    }
    try {
      setDeletingId(id);
      await ApiService.deleteAnalysis(id);
      setSessions(sessions.filter((s) => s.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSessions = sessions
    .filter((s) => {
      if (eventFilter !== 'all' && s.event_type !== eventFilter) return false;
      if (searchTerm.trim() && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'coverage') {
        const covA = a.sprint_metrics?.pose_coverage_pct || a.jump_metrics?.pose_coverage_pct || 0;
        const covB = b.sprint_metrics?.pose_coverage_pct || b.jump_metrics?.pose_coverage_pct || 0;
        return covB - covA;
      }
      return 0;
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="text-primary" />
            <span>Analysis Archive &amp; History</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, export, and manage stored kinematic trial sessions.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          className="p-2.5 rounded-xl bg-card border border-surfaceBorder hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-surfaceBorder grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search sessions by athlete or trial name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Event Filter */}
        <div className="md:col-span-4 flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-mono hidden sm:inline">Event:</span>
          {(['all', 'sprint', 'jump'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setEventFilter(f)}
              className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-all ${
                eventFilter === f
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort By */}
        <div className="md:col-span-3 flex items-center gap-1.5 text-xs">
          <ArrowUpDown size={14} className="text-slate-400 hidden sm:inline" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="coverage">Sort by Tracking Coverage</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-card border border-surfaceBorder text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          Loading archived sessions...
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="rounded-2xl bg-card border border-surfaceBorder overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-mono border-b border-surfaceBorder">
                <tr>
                  <th className="p-4">Session Name &amp; ID</th>
                  <th className="p-4">Event</th>
                  <th className="p-4">Recorded Date</th>
                  <th className="p-4">Primary Metrics</th>
                  <th className="p-4">Scale Calibration</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSessions.map((s) => {
                  const isSp = s.event_type === 'sprint';
                  return (
                    <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4">
                        <Link
                          to={`/results/${s.id}`}
                          className="font-bold text-white hover:text-primary transition-colors block text-sm"
                        >
                          {s.name}
                        </Link>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-0.5">
                          <span>{s.id}</span>
                          {s.is_sample && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[9px]">
                              Sample Data
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-mono uppercase font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyanAccent border border-slate-700">
                          {s.event_type}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-slate-400">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 font-mono">
                        {isSp ? (
                          <div>
                            <span className="text-white font-bold">
                              {s.sprint_metrics?.cadence_spm ? `${s.sprint_metrics.cadence_spm} spm` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {s.sprint_metrics?.avg_speed_mps ? `${s.sprint_metrics.avg_speed_mps} m/s` : 'Uncalibrated'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-cyanAccent font-bold">
                              {s.jump_metrics?.flight_time_s ? `${s.jump_metrics.flight_time_s} s` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {s.jump_metrics?.displacement_calibrated ? `${s.jump_metrics.horizontal_displacement_m} m` : 'Pixel only'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-mono text-slate-400">
                        {s.calibration.is_calibrated ? (
                          <span className="text-emerald-400 font-semibold">
                            {s.calibration.pixels_per_meter} px/m
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Uncalibrated</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            s.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/results/${s.id}`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                            title="View Results"
                          >
                            <ExternalLink size={14} />
                          </Link>

                          <a
                            href={ApiService.getExportUrl(s.id, 'pdf')}
                            download
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-primary transition-all"
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </a>

                          <button
                            disabled={deletingId === s.id}
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all"
                            title="Delete Session"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-card border border-surfaceBorder text-center text-slate-400 space-y-3">
          <div className="text-base font-bold text-white">No Matching Analysis Records Found</div>
          <p className="text-xs text-slate-500">
            {searchTerm ? `No sessions match '${searchTerm}'.` : 'Your analysis history is currently empty.'}
          </p>
        </div>
      )}
    </div>
  );
};
