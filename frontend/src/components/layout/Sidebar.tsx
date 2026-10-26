import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  GitCompare,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/analyze', label: 'New Analysis', icon: PlusCircle, badge: 'Core' },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/compare', label: 'Athlete Comparison', icon: GitCompare },
    { to: '/methodology', label: 'Methodology', icon: BookOpen },
    { to: '/validation', label: 'Validation & Testing', icon: CheckCircle2 },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-card border-r border-surfaceBorder flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-surfaceBorder">
        <NavLink to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary sports-glow-lime flex-shrink-0">
            <Zap className="w-5 h-5 fill-primary" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                Sprint<span className="text-primary">IQ</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Biomechanics Lab
              </span>
            </div>
          )}
        </NavLink>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:block"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          {!collapsed && 'Navigation'}
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30 font-semibold sports-glow-lime'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>

      {/* Assignment / BITS Pilani Project Badge Footer */}
      <div className="p-4 border-t border-surfaceBorder bg-slate-900/40">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
              <Activity className="w-3.5 h-3.5 text-cyanAccent" />
              <span>BITS Pilani Sports Eng.</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Assignment 2 &bull; Project 7: Automated Video Sprint & Jump Analysis
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="BITS Pilani Sports Engineering Project 7">
            <Activity className="w-5 h-5 text-cyanAccent" />
          </div>
        )}
      </div>
    </aside>
  );
};
