import React from 'react';
import {
  INPUT_MODES,
  type InputModeId,
  type LineInputParams,
  type SolvedLineProjection,
} from '../geometry/lineSolver';

interface ParameterDeckProps {
  params: LineInputParams;
  solution: SolvedLineProjection;
  onChange: (next: LineInputParams) => void;
  onReset: () => void;
}

interface FieldMeta {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  hint?: string;
}

const FIELD_META: Record<keyof LineInputParams, FieldMeta> = {
  mode: { label: 'Mode', unit: '', min: 0, max: 0, step: 1 },
  hA: { label: 'End A wrt HP (hA)', unit: 'mm', min: -80, max: 120, step: 1, hint: '+ above, − below' },
  dA: { label: 'End A wrt VP (dA)', unit: 'mm', min: -80, max: 120, step: 1, hint: '+ in front, − behind' },
  hB: { label: 'End B wrt HP (hB)', unit: 'mm', min: -80, max: 140, step: 1, hint: '+ above, − below' },
  dB: { label: 'End B wrt VP (dB)', unit: 'mm', min: -80, max: 140, step: 1, hint: '+ in front, − behind' },
  hM: { label: 'Midpoint M wrt HP', unit: 'mm', min: -60, max: 120, step: 1, hint: '+ above, − below' },
  dM: { label: 'Midpoint M wrt VP', unit: 'mm', min: -60, max: 120, step: 1, hint: '+ in front, − behind' },
  TL: { label: 'True Length (TL)', unit: 'mm', min: 15, max: 180, step: 1 },
  theta: { label: 'Inclination to HP (θ)', unit: '°', min: 0, max: 90, step: 0.5 },
  phi: { label: 'Inclination to VP (φ)', unit: '°', min: 0, max: 90, step: 0.5 },
  FVL: { label: 'Front View Length (a′b′)', unit: 'mm', min: 10, max: 180, step: 0.5 },
  TVL: { label: 'Top View Length (ab)', unit: 'mm', min: 10, max: 180, step: 0.5 },
  alpha: { label: 'FV Angle with XY (α)', unit: '°', min: 0, max: 89.5, step: 0.5 },
  beta: { label: 'TV Angle with XY (β)', unit: '°', min: 0, max: 89.5, step: 0.5 },
  projectorDistance: { label: 'End Projector Gap (p)', unit: 'mm', min: 0, max: 150, step: 1 },
  dHT: { label: 'HT wrt VP (dHT)', unit: 'mm', min: -90, max: 120, step: 1, hint: '+ in front, − behind' },
  hVT: { label: 'VT wrt HP (hVT)', unit: 'mm', min: -90, max: 120, step: 1, hint: '+ above, − below' },
  traceProjectorDistance: { label: 'HT–VT Projector Gap', unit: 'mm', min: 10, max: 180, step: 1 },
  bAboveA: { label: 'B Above A', unit: '', min: 0, max: 1, step: 1 },
  bInFrontOfA: { label: 'B In Front of A', unit: '', min: 0, max: 1, step: 1 },
  bRightOfA: { label: 'B Right of A', unit: '', min: 0, max: 1, step: 1 },
};

const CATEGORIES = ['Standard', 'True Length & Locus', 'Apparent Views', 'Traces', 'Midpoint'] as const;

export const ParameterDeck: React.FC<ParameterDeckProps> = ({
  params,
  solution,
  onChange,
  onReset,
}) => {
  const activeMode = INPUT_MODES.find((m) => m.id === params.mode) ?? INPUT_MODES[0];

  const handleNumberChange = (field: keyof LineInputParams, val: number) => {
    if (Number.isNaN(val)) return;
    onChange({ ...params, [field]: val });
  };

  const handleModeChange = (modeId: InputModeId) => {
    onChange({ ...params, mode: modeId });
  };

  const showDirY = ![
    'endpoints_p',
    'tl_phi_hb',
    'tl_hb_db',
    'hb_db_theta',
    'hb_db_phi',
    'fvl_tvl_hb',
    'fvl_hb_db',
    'tvl_hb_db',
    'traces_ht_vt_ab',
    'traces_a_vt_tl_phi',
  ].includes(params.mode);

  const showDirZ = ![
    'endpoints_p',
    'tl_theta_db',
    'tl_hb_db',
    'hb_db_theta',
    'hb_db_phi',
    'fvl_tvl_db',
    'fvl_hb_db',
    'tvl_hb_db',
    'traces_ht_vt_ab',
    'traces_ht_vt_a_tl',
    'traces_a_vt_tl_theta',
    'traces_a_ht_tl_theta',
  ].includes(params.mode);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Input Parameters</h2>
          <p className="text-xs text-slate-500">Select assignment given-data combination</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Input Mode Selector */}
      <div className="space-y-1.5">
        <label htmlFor="input-mode-select" className="block text-xs font-medium text-slate-700">
          Given Parameter Case
        </label>
        <select
          id="input-mode-select"
          value={params.mode}
          onChange={(e) => handleModeChange(e.target.value as InputModeId)}
          className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
        >
          {CATEGORIES.map((cat) => (
            <optgroup key={cat} label={cat}>
              {INPUT_MODES.filter((m) => m.category === cat).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 leading-relaxed">{activeMode.shortDesc}</p>
      </div>

      {/* Dynamic Input Sliders + Numeric Fields */}
      <div className="space-y-3 pt-1 border-t border-slate-100">
        {activeMode.fields.map((field) => {
          const meta = FIELD_META[field];
          const val = Number(params[field]);
          return (
            <div key={field} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`param-${field}`}
                  className="text-xs font-medium text-slate-700 truncate"
                  title={meta.label}
                >
                  {meta.label}
                </label>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    id={`param-${field}`}
                    type="number"
                    step={meta.step}
                    value={val}
                    onChange={(e) => handleNumberChange(field, parseFloat(e.target.value))}
                    className="w-16 px-2 py-1 text-right text-xs font-mono tabular-nums text-slate-900 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                  />
                  <span className="text-[11px] font-mono text-slate-500 w-5">{meta.unit}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  aria-label={meta.label}
                  min={meta.min}
                  max={meta.max}
                  step={meta.step}
                  value={Math.min(meta.max, Math.max(meta.min, val))}
                  onChange={(e) => handleNumberChange(field, parseFloat(e.target.value))}
                  className="draft-slider flex-1"
                />
              </div>
              {meta.hint && <p className="text-[10px] text-slate-400">{meta.hint}</p>}
            </div>
          );
        })}
      </div>

      {/* End B Relative Direction Toggles */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="block text-xs font-medium text-slate-700">End B Relative Direction</span>
        <div className="grid grid-cols-1 gap-1.5">
          {showDirY && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-600">Height wrt A:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => onChange({ ...params, bAboveA: true })}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    params.bAboveA ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Above A
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...params, bAboveA: false })}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    !params.bAboveA ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Below A
                </button>
              </div>
            </div>
          )}

          {showDirZ && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-600">Depth wrt A:</span>
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => onChange({ ...params, bInFrontOfA: true })}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    params.bInFrontOfA ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  In Front
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...params, bInFrontOfA: false })}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                    !params.bInFrontOfA ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Behind
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-600">Projector Side:</span>
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => onChange({ ...params, bRightOfA: true })}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  params.bRightOfA ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                B Right of A
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...params, bRightOfA: false })}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  !params.bRightOfA ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                B Left of A
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Geometric Validation Banner */}
      {!solution.valid && solution.error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 leading-relaxed">
          <span className="font-semibold block mb-0.5">Geometry Constraint Error</span>
          {solution.error}
        </div>
      )}

      {solution.valid && solution.warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
          {solution.warnings.map((w, idx) => (
            <p key={idx}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
};
