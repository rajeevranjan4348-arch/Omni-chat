import React from 'react';
import { Shield, Lock, Eye, CheckCircle2, XCircle, AlertTriangle, Smartphone, Cpu, HardDrive, Wifi, Bell, Camera, Mic } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface AstraSecurityDashboardProps {
  permissions: Record<string, boolean>;
  onTogglePermission: (permKey: string) => void;
  auditLogs: { timestamp: string; action: string; status: 'granted' | 'blocked' | 'audited'; risk: string }[];
}

export const AstraSecurityDashboard: React.FC<AstraSecurityDashboardProps> = ({
  permissions,
  onTogglePermission,
  auditLogs,
}) => {
  const { isDarkMode } = useTheme();

  const permissionItems = [
    { key: 'Android Security Sandbox', label: 'Android Security Sandbox', desc: 'Strict runtime application sandboxing & container isolation', icon: Smartphone, alwaysEnforced: true },
    { key: 'Camera', label: 'Camera Sensor Feed', desc: 'Captures live camera frames and snapshots for Multimodal Vision', icon: Camera, alwaysEnforced: false },
    { key: 'Microphone', label: 'Microphone & Live Audio', desc: 'Bidirectional audio streaming, STT and wake-word listeners', icon: Mic, alwaysEnforced: false },
    { key: 'File System', label: 'Storage & Document Access', desc: 'Sandboxed read & write access to project workspace files', icon: HardDrive, alwaysEnforced: false },
    { key: 'Screen Capture', label: 'Screen Capture & OCR', desc: 'Permission to capture display buffers for UI inspection', icon: Eye, alwaysEnforced: false },
    { key: 'Network Egress', label: 'Network Egress & Search', desc: 'Google Search grounding, web research, and external API requests', icon: Wifi, alwaysEnforced: false },
    { key: 'Notification', label: 'Notifications & Reminders', desc: 'Desktop alerts, background triggers, and alarms', icon: Bell, alwaysEnforced: false },
    { key: 'Android Intent', label: 'Android Intent Simulator', desc: 'Simulates deep links, launcher shortcuts, and app broadcasts', icon: Cpu, alwaysEnforced: false },
  ];

  return (
    <div className="space-y-6">
      {/* Policy Banner */}
      <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
        isDarkMode ? 'bg-slate-900/80 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
      }`}>
        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
          <Shield size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-100">
              Astra Security Sandbox & Android Permission Governor
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Active Protection
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong>🛡️ Safety Rule Enforced:</strong> The AI may plan and prepare actions, but execution must respect Android permissions, app permissions, tool permissions, user approvals, privacy controls, and platform security. Never bypass Android security or falsely claim an action was completed.
          </p>
        </div>
      </div>

      {/* Permissions Grid */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Lock size={14} /> Hardware & Tool Permission Matrix (Category 18)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {permissionItems.map((item) => {
            const isGranted = item.alwaysEnforced ? true : (permissions[item.key] ?? true);
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isGranted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {item.label}
                      </span>
                      {item.alwaysEnforced && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                          LOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {item.alwaysEnforced ? (
                  <span className="text-xs font-bold text-emerald-400 shrink-0 flex items-center gap-1">
                    <CheckCircle2 size={16} /> Enforced
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onTogglePermission(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                      isGranted
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                    }`}
                  >
                    {isGranted ? 'Granted' : 'Revoked'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Audit Log (Feature 237) */}
      <div className={`p-4 rounded-xl border ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Immutable Audit Trail (Feature #237)
          </h4>
          <span className="text-[10px] text-slate-500">
            {auditLogs.length} events logged
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            No sensitive operations executed in this session. Audit log is clean.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {auditLogs.map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/40 border border-slate-700/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    {log.timestamp}
                  </span>
                  <span className="font-medium text-slate-300">
                    {log.action}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    log.risk === 'low' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {log.risk} risk
                  </span>
                  <span className={`text-[10px] font-bold ${
                    log.status === 'granted' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {log.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
