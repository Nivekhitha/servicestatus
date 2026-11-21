import React from 'react';
import { Check } from 'lucide-react';
import { REPAIR_STAGES, type RepairStage } from '../types/domain';
import { getStageIndex } from '../utils/workflow';

interface StageTimelineProps {
  currentStage: RepairStage;
  interactive?: boolean;
  onSelectStage?: (stage: RepairStage) => void;
  compact?: boolean;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
  currentStage,
  interactive = false,
  onSelectStage,
  compact = false,
}) => {
  const activeIdx = getStageIndex(currentStage);

  return (
    <div className="w-full" aria-label="Seven-stage repair progress timeline">
      <ol className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-7'}`}>
        {REPAIR_STAGES.map((step) => {
          const isCompleted = step.index < activeIdx;
          const isCurrent = step.index === activeIdx;
          const isApprovalHold = isCurrent && step.key === 'waiting_for_approval';

          const baseClasses = isCurrent
            ? isApprovalHold
              ? 'border-[#6366F1] bg-[#6366F1]/8 text-[#0A1628]'
              : 'border-[#2563EB] bg-[#2563EB]/8 text-[#0A1628]'
            : isCompleted
              ? 'border-slate-200 bg-white text-[#0A1628]'
              : 'border-slate-200/80 bg-slate-50/70 text-slate-500';

          const content = (
            <div className="flex flex-col h-full justify-between text-left">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold font-mono-tabular ${
                    isCurrent
                      ? isApprovalHold
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#2563EB] text-white'
                      : isCompleted
                        ? 'bg-[#0A1628] text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.index + 1}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {isCompleted ? 'Done' : isCurrent ? 'Current' : 'Upcoming'}
                </span>
              </div>
              <div>
                <p className={`text-xs font-semibold leading-snug ${isCurrent || isCompleted ? 'text-[#0A1628]' : 'text-slate-500'}`}>
                  {step.label}
                </p>
                {!compact && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );

          return (
            <li key={step.key}>
              {interactive && onSelectStage ? (
                <button
                  type="button"
                  onClick={() => onSelectStage(step.key)}
                  className={`w-full h-full p-3 rounded-lg border transition-colors hover:border-[#2563EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${baseClasses}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {content}
                </button>
              ) : (
                <div
                  className={`w-full h-full p-3 rounded-lg border ${baseClasses}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
