import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { HealthResponse } from '../../types';
import { PlusCircle, Activity, Menu, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await ApiService.checkHealth();
      setHealth(res);
      setError(false);
    } catch {
      setError(true);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 20000); // Poll status every 20s
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview Dashboard';
    if (path.startsWith('/analyze')) return 'New Analysis Workspace';
    if (path.startsWith('/results')) return 'Biomechanical Analysis Results';
    if (path.startsWith('/compare')) return 'Athlete Comparison Engine';
    if (path.startsWith('/history')) return 'Analysis History & Archive';
    if (path.startsWith('/methodology')) return 'Engineering Methodology & Theory';
    if (path.startsWith('/validation')) return 'Model Validation & Ground Truth';
    return 'SprintIQ';
  };

  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-surfaceBorder sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            Measure Motion. Understand Performance.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {/* Connection status indicator */}
        <div
          onClick={checkStatus}
          className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-xs"
          title="Click to refresh connection status"
        >
          {loading ? (
            <span className="flex items-center gap-1.5 text-slate-400">
              <RefreshCw className="w-3 h-3 animate-spin text-cyanAccent" />
              <span className="hidden sm:inline">Checking Backend...</span>
            </span>
          ) : error ? (
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Backend Offline</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-primary sports-glow-lime" />
              <span className="hidden sm:inline">MediaPipe Active</span>
              <span className="sm:hidden">Online</span>
            </span>
          )}
        </div>

        {/* Quick CTA */}
        <Link
          to="/analyze"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-slate-950 font-semibold text-xs md:text-sm hover:bg-primary-hover transition-all sports-glow-lime"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Analysis</span>
        </Link>
      </div>
    </header>
  );
};
