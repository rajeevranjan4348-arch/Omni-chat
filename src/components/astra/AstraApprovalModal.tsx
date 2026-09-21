import React from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface AstraApprovalModalProps {
  isOpen: boolean;
  actionTitle: string;
  riskReason: string;
  permissionType: string;
  onApprove: () => void;
  onDeny: () => void;
}

export const AstraApprovalModal: React.FC<AstraApprovalModalProps> = ({
  isOpen,
  actionTitle,
  riskReason,
  permissionType,
  onApprove,
  onDeny,
}) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
        isDarkMode ? 'bg-slate-900 border-amber-500/40 text-white' : 'bg-white border-amber-300 text-slate-900'
      }`}>
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <ShieldAlert size={26} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Astra Safety Checkpoint (Stage 8)
              </span>
              <span className="text-[11px] font-mono text-red-400 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> High Risk Level
              </span>
            </div>
            <h3 className="text-lg font-bold">Human Approval Gate Required</h3>
            <p className="text-xs text-slate-400">
              The AI has planned an autonomous action that touches protected system boundaries.
            </p>
          </div>
        </div>

        {/* Action Details Box */}
        <div className={`p-4 rounded-xl border mb-4 space-y-2.5 ${
          isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Action</span>
            <p className="text-sm font-semibold mt-0.5 text-slate-200 dark:text-slate-100">
              {actionTitle}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Assessment Rationale</span>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
              {riskReason}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/40">
            <Lock size={12} className="text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">
              Required Permission: <strong className="text-slate-200 dark:text-slate-100">{permissionType}</strong>
            </span>
          </div>
        </div>

        {/* Safety Rule Reminder */}
        <div className="text-[11px] text-slate-400 mb-6 bg-slate-800/30 p-2.5 rounded-lg border border-slate-700/30">
          <strong className="text-slate-300">🛡️ Astra Safety Rule:</strong> Execution respects Android permissions, tool sandboxes, user approvals, and privacy boundaries. No sensitive action will execute without your explicit authorization.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onDeny}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all"
          >
            <XCircle size={16} />
            Deny Action (Safe Halt)
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
          >
            <CheckCircle2 size={16} />
            Authorize & Execute
          </button>
        </div>
      </div>
    </div>
  );
};
