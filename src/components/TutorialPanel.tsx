import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, XCircle } from 'lucide-react';
import {
  PRESET_PROBLEMS,
  type LineInputParams,
  type SolvedLineProjection,
} from '../geometry/lineSolver';

interface TutorialPanelProps {
  solution: SolvedLineProjection;
  activeStepIndex: number;
  onStepChange: (index: number) => void;
  onSelectPreset: (params: LineInputParams) => void;
  onExitTutorial: () => void;
}

export const TutorialPanel: React.FC<TutorialPanelProps> = ({
  solution,
  activeStepIndex,
  onStepChange,
  onSelectPreset,
  onExitTutorial,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const steps = solution.tutorialSteps;
  const safeIndex = Math.min(Math.max(0, activeStepIndex), Math.max(0, steps.length - 1));
  const currentStep = steps[safeIndex];

  useEffect(() => {
    setSelectedAnswers({});
  }, [solution.mode, solution.TL, solution.dx, solution.dy, solution.dz]);

  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const timer = window.setInterval(() => {
      onStepChange(safeIndex + 1 >= steps.length ? 0 : safeIndex + 1);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [isPlaying, safeIndex, steps.length, onStepChange]);

  if (!solution.valid || steps.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Interactive Step-by-Step Tutorial</h2>
          <button
            type="button"
            onClick={onExitTutorial}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Exit Tutorial
          </button>
        </div>
        <p className="text-xs text-rose-700">
          Fix the current geometry constraint error or pick a valid problem below to launch the guided manual drafting tutorial.
        </p>
      </div>
    );
  }

  const chosenOption = selectedAnswers[safeIndex];
  const checkpoint = currentStep.checkpoint;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header & Stepper Controls */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Interactive Step-by-Step Construction Tutorial
          </h2>
          <p className="text-xs text-slate-500">
            Watch the 2D drafting sheet and 3D planes build progressively step by step
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onStepChange(Math.max(0, safeIndex - 1));
            }}
            disabled={safeIndex === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Auto-Step'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onStepChange(Math.min(steps.length - 1, safeIndex + 1));
            }}
            disabled={safeIndex >= steps.length - 1}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onStepChange(0);
            }}
            aria-label="Restart tutorial"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExitTutorial}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Show Full Solution
          </button>
        </div>
      </div>

      {/* Step Tabs */}
      <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
        {steps.map((st, idx) => (
          <button
            key={st.stepNumber}
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onStepChange(idx);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              idx === safeIndex
                ? 'bg-sky-50 text-sky-900 border border-sky-200'
                : idx < safeIndex
                  ? 'text-slate-700 bg-slate-100 hover:bg-slate-200/70'
                  : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Step {st.stepNumber}
          </button>
        ))}
      </div>

      {/* Active Step Content + Interactive Checkpoint */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-mono font-semibold text-sky-700">
              0{currentStep.stepNumber}.
            </span>
            <h3 className="text-base font-semibold text-slate-900">{currentStep.title}</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{currentStep.actionSummary}</p>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-700">
              Manual Drafting Sheet Procedure
            </span>
            <p className="text-xs text-slate-800 leading-relaxed">{currentStep.draftingInstruction}</p>
            {currentStep.formulaUsed && (
              <p className="pt-1 text-[11px] font-mono tabular-nums text-sky-800">
                {currentStep.formulaUsed}
              </p>
            )}
          </div>
        </div>

        {/* Interactive Practice Checkpoint OR Complex Geometry Preset Switcher */}
        <div className="lg:col-span-5 space-y-3">
          {checkpoint ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-slate-900">
                Concept Check · Step {currentStep.stepNumber}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{checkpoint.question}</p>
              <div className="space-y-1.5">
                {checkpoint.options.map((opt, idx) => {
                  const isSelected = chosenOption === idx;
                  const isCorrect = idx === checkpoint.correctIndex;
                  const showResult = chosenOption !== undefined;
                  let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';
                  if (showResult) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-50 border-rose-300 text-rose-900';
                    } else {
                      btnStyle = 'bg-white border-slate-200 text-slate-400';
                    }
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedAnswers((prev) => ({ ...prev, [safeIndex]: idx }))}
                      className={`w-full text-left px-3 py-2 text-xs border rounded-lg transition-colors flex items-start gap-2 ${btnStyle}`}
                    >
                      {showResult && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {chosenOption !== undefined && (
                <p className="text-[11px] text-slate-700 leading-relaxed pt-1 border-t border-slate-200">
                  {checkpoint.explanation}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="text-xs font-semibold text-slate-900">
                Try Complex Geometry Scenarios
              </div>
              <p className="text-[11px] text-slate-500">
                Load a benchmark university exam problem to inspect its construction sequence:
              </p>
              <div className="space-y-1.5">
                {PRESET_PROBLEMS.slice(1, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      onSelectPreset(p.params);
                      onStepChange(0);
                    }}
                    className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
                  >
                    <div className="text-xs font-medium text-slate-900">{p.title}</div>
                    <div className="text-[11px] text-slate-500">{p.difficulty}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
