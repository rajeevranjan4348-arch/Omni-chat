import React from 'react';
import { AstraStageStatus } from '../../services/astraAgentService';
import { CheckCircle2, Circle, Clock, AlertTriangle, Play, ShieldAlert, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface AstraFlowStepperProps {
  stages: AstraStageStatus[];
  activeStageId?: string;
  onSelectStage?: (stage: AstraStageStatus) => void;
}

export const AstraFlowStepper: React.FC<AstraFlowStepperProps> = ({
  stages,
  activeStageId,
  onSelectStage,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`w-full p-4 rounded-xl border transition-all ${
      isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles size={13} />
            Core Astra Autonomous Flow Pipeline (13 Stages)
          </span>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Deterministic Execution & Security Gated
        </span>
      </div>

      {/* Horizontal Scrollable Flow Track */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 hide-scrollbar">
        {stages.map((stage, idx) => {
          const isSelected = activeStageId === stage.stageId;
          const isRunning = stage.status === 'running';
          const isCompleted = stage.status === 'completed';
          const isWaiting = stage.status === 'waiting_approval';
          const isFailed = stage.status === 'failed';

          return (
            <React.Fragment key={stage.stageId}>
              <button
                type="button"
                onClick={() => onSelectStage && onSelectStage(stage)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all border ${
                  isSelected
                    ? (isDarkMode ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200' : 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm')
                    : isWaiting
                    ? (isDarkMode ? 'border-amber-500 bg-amber-950/40 text-amber-200 animate-pulse' : 'border-amber-500 bg-amber-50 text-amber-900 animate-pulse')
                    : isRunning
                    ? (isDarkMode ? 'border-blue-500 bg-blue-950/40 text-blue-200' : 'border-blue-500 bg-blue-50 text-blue-900')
                    : isCompleted
                    ? (isDarkMode ? 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300')
                    : isFailed
                    ? (isDarkMode ? 'border-red-500 bg-red-950/40 text-red-200' : 'border-red-500 bg-red-50 text-red-900')
                    : (isDarkMode ? 'border-slate-800/40 bg-slate-900 text-slate-500 opacity-60' : 'border-slate-200/60 bg-slate-50 text-slate-400 opacity-60')
                }`}
              >
                {/* Stage Status Icon */}
                <div className="shrink-0">
                  {isRunning ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : isWaiting ? (
                    <ShieldAlert size={16} className="text-amber-500 animate-bounce" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : isFailed ? (
                    <AlertTriangle size={16} className="text-red-500" />
                  ) : (
                    <Circle size={15} className="text-slate-400 dark:text-slate-600" />
                  )}
                </div>

                {/* Stage Text */}
                <div className="min-w-[110px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {stage.stepNumber}
                    </span>
                    <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                      {stage.label}
                    </span>
                  </div>
                  <p className="text-[10px] truncate max-w-[130px] opacity-75">
                    {stage.details ? stage.details : stage.sublabel}
                  </p>
                </div>

                {/* Latency badge */}
                {stage.durationMs !== undefined && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-slate-500 dark:text-slate-400 whitespace-nowrap ml-1">
                    {stage.durationMs}ms
                  </span>
                )}
              </button>

              {/* Arrow Connector */}
              {idx < stages.length - 1 && (
                <span className="text-slate-400 dark:text-slate-600 text-xs font-bold px-0.5">
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
