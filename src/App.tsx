import React, { useMemo, useState } from 'react';
import { ScanText } from 'lucide-react';
import {
  DEFAULT_INPUT_PARAMS,
  PRESET_PROBLEMS,
  solveLineProjection,
  type LineInputParams,
} from './geometry/lineSolver';
import { ParameterDeck } from './components/ParameterDeck';
import { DraftingSheet2D } from './components/DraftingSheet2D';
import { Viewport3D } from './components/Viewport3D';
import { ResultsTable } from './components/ResultsTable';
import { TutorialPanel } from './components/TutorialPanel';
import { OcrScannerModal } from './components/OcrScannerModal';

type AppTab = 'solver' | 'tutorial' | 'problems' | 'formulas';
type StageLayout = 'split' | '2d' | '3d';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('solver');
  const [stageLayout, setStageLayout] = useState<StageLayout>('split');
  const [params, setParams] = useState<LineInputParams>(DEFAULT_INPUT_PARAMS);
  const [tutorialStepIdx, setTutorialStepIdx] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [problemBanner, setProblemBanner] = useState<{
    title: string;
    statement: string;
    sourceLabel: string;
    extractedSummary?: string;
  } | null>({
    title: PRESET_PROBLEMS[0].title,
    statement: PRESET_PROBLEMS[0].statement,
    sourceLabel: 'Standard Assignment Problem',
  });

  const solution = useMemo(() => solveLineProjection(params), [params]);

  const activeTutorialHighlight = useMemo(() => {
    if (activeTab !== 'tutorial' || !solution.valid || solution.tutorialSteps.length === 0) {
      return null;
    }
    const idx = Math.min(Math.max(0, tutorialStepIdx), solution.tutorialSteps.length - 1);
    return solution.tutorialSteps[idx].highlightEntities;
  }, [activeTab, solution, tutorialStepIdx]);

  const activeTutorialStepNum =
    activeTab === 'tutorial' && solution.valid && solution.tutorialSteps.length > 0
      ? Math.min(Math.max(0, tutorialStepIdx), solution.tutorialSteps.length - 1) + 1
      : null;

  const handleLoadPreset = (
    presetParams: LineInputParams,
    meta?: {
      title: string;
      statement: string;
      sourceLabel: string;
      extractedSummary?: string;
    },
    targetTab?: AppTab
  ) => {
    setParams(presetParams);
    setTutorialStepIdx(0);
    if (meta) setProblemBanner(meta);
    if (targetTab) setActiveTab(targetTab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => setActiveTab('solver')}
          className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
        >
          OrthoLine Studio
        </button>

        <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Primary navigation">
          {(
            [
              { id: 'solver', label: 'Solver' },
              { id: 'tutorial', label: 'Tutorial' },
              { id: 'problems', label: 'Problems' },
              { id: 'formulas', label: 'Formulas' },
            ] as const
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'tutorial') setTutorialStepIdx(0);
                }}
                className={`text-sm font-medium whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors ${
                  isActive
                    ? 'text-sky-700 border-sky-700'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ScanText className="w-4 h-4" />
            <span>Scan Problem</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {(activeTab === 'solver' || activeTab === 'tutorial') && (
          <>
            {/* Workspace Toolbar & Problem Context */}
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">
                    {problemBanner?.title ?? 'Custom Line Configuration'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{problemBanner?.sourceLabel ?? 'Interactive Parameters'}</span>
                  {problemBanner?.extractedSummary && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-sky-800">{problemBanner.extractedSummary}</span>
                    </>
                  )}
                </div>
                {problemBanner?.statement && (
                  <p className="text-xs text-slate-600 line-clamp-2">{problemBanner.statement}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Viewport Mode Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      { id: 'split', label: '2D + 3D Split' },
                      { id: '2d', label: '2D Sheet' },
                      { id: '3d', label: '3D Spatial' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setStageLayout(mode.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        stageLayout === mode.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'solver' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTutorialStepIdx(0);
                      setActiveTab('tutorial');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    Step-by-Step Tutorial
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Tutorial Deck when in Tutorial Mode */}
            {activeTab === 'tutorial' && (
              <TutorialPanel
                solution={solution}
                activeStepIndex={tutorialStepIdx}
                onStepChange={setTutorialStepIdx}
                onSelectPreset={(presetParams) =>
                  handleLoadPreset(presetParams, {
                    title: 'Tutorial Practice Scenario',
                    statement:
                      PRESET_PROBLEMS.find((p) => p.params.mode === presetParams.mode)?.statement ??
                      '',
                    sourceLabel: 'Guided Walkthrough',
                  })
                }
                onExitTutorial={() => setActiveTab('solver')}
              />
            )}

            {/* Primary 2-Zone Sandbox: Parameter Deck + 2D/3D Stage */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-3">
                <ParameterDeck
                  params={params}
                  solution={solution}
                  onChange={(next) => {
                    setParams(next);
                    setProblemBanner(null);
                  }}
                  onReset={() =>
                    handleLoadPreset(DEFAULT_INPUT_PARAMS, {
                      title: PRESET_PROBLEMS[0].title,
                      statement: PRESET_PROBLEMS[0].statement,
                      sourceLabel: 'Standard Assignment Problem',
                    })
                  }
                />
              </div>

              <div className="xl:col-span-9 space-y-5">
                {/* 2D & 3D Viewports */}
                <div
                  className={`grid gap-4 ${
                    stageLayout === 'split'
                      ? 'grid-cols-1 lg:grid-cols-2 min-h-[500px]'
                      : 'grid-cols-1 min-h-[560px]'
                  }`}
                >
                  {(stageLayout === 'split' || stageLayout === '2d') && (
                    <div className="h-[500px] lg:h-[540px]">
                      <DraftingSheet2D
                        solution={solution}
                        activeHighlight={activeTutorialHighlight}
                        activeStepNumber={activeTutorialStepNum}
                      />
                    </div>
                  )}

                  {(stageLayout === 'split' || stageLayout === '3d') && (
                    <div className="h-[500px] lg:h-[540px]">
                      <Viewport3D
                        solution={solution}
                        activeHighlight={activeTutorialHighlight}
                      />
                    </div>
                  )}
                </div>

                {/* Full Analytical Output Readout */}
                <ResultsTable solution={solution} />
              </div>
            </div>
          </>
        )}

        {/* Problem Library View */}
        {activeTab === 'problems' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-display font-semibold text-slate-900">
                  Assignment &amp; Exam Problem Library
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  Load classic engineering graphics problems covering true inclinations, double loci, trace-to-line reverse constructions, and multi-quadrant crossings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-4 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap"
              >
                Scan Custom Problem via OCR
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_PROBLEMS.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{item.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{item.params.mode}</span>
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.statement}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() =>
                        handleLoadPreset(
                          item.params,
                          {
                            title: item.title,
                            statement: item.statement,
                            sourceLabel: item.difficulty,
                          },
                          'solver'
                        )
                      }
                      className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Solve in 2D &amp; 3D
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleLoadPreset(
                          item.params,
                          {
                            title: item.title,
                            statement: item.statement,
                            sourceLabel: item.difficulty,
                          },
                          'tutorial'
                        )
                      }
                      className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Step-by-Step Tutorial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulas & Manual Drafting Rules Reference */}
        {activeTab === 'formulas' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h1 className="text-xl font-display font-semibold text-slate-900">
                Descriptive Geometry Reference &amp; Manual Rules
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Core trigonometric identities, First Angle sign conventions, and Rotating Line Method steps used in engineering graphics assignments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  01. Fundamental Line Projection Identities
                </h2>
                <dl className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-600">Front View Length (a′b′)</dt>
                    <dd className="font-mono text-slate-900">FVL = TL · cos(φ)</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-600">Top View Length (ab)</dt>
                    <dd className="font-mono text-slate-900">TVL = TL · cos(θ)</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-600">Projector Distance (p)</dt>
                    <dd className="font-mono text-slate-900">p = FVL·cos(α) = TVL·cos(β)</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-600">True Length from Views</dt>
                    <dd className="font-mono text-slate-900">TL = √(FVL² + Δd²) = √(TVL² + Δh²)</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-600">Angle Constraints</dt>
                    <dd className="font-mono text-slate-900">θ + φ ≤ 90°, α ≥ θ, β ≥ φ</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  02. Traces &amp; First-Angle Quadrant Convention
                </h2>
                <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                  <p>
                    <strong className="text-slate-900">Horizontal Trace (HT):</strong> Point where the line (or its extension) meets HP (height y = 0). Extend Front View a′b′ to cut XY at h′, then project vertically to extended Top View ab to locate HT (h).
                  </p>
                  <p>
                    <strong className="text-slate-900">Vertical Trace (VT):</strong> Point where the line (or its extension) meets VP (depth z = 0). Extend Top View ab to cut XY at v, then project vertically to extended Front View a′b′ to locate VT (v′).
                  </p>
                  <p>
                    <strong className="text-slate-900">First-Angle Sign Convention:</strong> Above HP (+) plots above XY; Below HP (−) plots below XY. In front of VP (+) plots below XY; Behind VP (−) plots above XY.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* OCR Problem Scanner Modal */}
      <OcrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onApplyExtracted={(extractedParams, meta) => {
          const summary = Object.entries(meta.extractedParameters)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          handleLoadPreset(
            extractedParams,
            {
              title: 'Extracted Problem',
              statement: meta.transcribedText,
              sourceLabel: meta.notes || `Mode: ${meta.detectedMode}`,
              extractedSummary: summary,
            },
            meta.openTutorial ? 'tutorial' : 'solver'
          );
        }}
      />
    </div>
  );
}
