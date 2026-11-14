import React from 'react';
import type { SolvedLineProjection } from '../geometry/lineSolver';

interface ResultsTableProps {
  solution: SolvedLineProjection;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ solution }) => {
  if (!solution.valid) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900">Computed Projections &amp; Traces</h2>
        <p className="mt-2 text-xs text-slate-500">
          Adjust the input parameters above until a valid 3D straight line exists to inspect all derived parameters and traces.
        </p>
      </div>
    );
  }

  const fmt = (n: number, unit = 'mm') => `${n.toFixed(2)} ${unit}`;

  const primaryMetrics = [
    { label: 'True Length (TL)', value: fmt(solution.TL), note: '3D length AB' },
    { label: 'True Inclination to HP (θ)', value: `${solution.theta.toFixed(2)}°`, note: 'arcsin(|Δh|/TL)' },
    { label: 'True Inclination to VP (φ)', value: `${solution.phi.toFixed(2)}°`, note: 'arcsin(|Δd|/TL)' },
    { label: 'Front View Length (a′b′)', value: fmt(solution.FVL), note: 'TL · cos(φ)' },
    { label: 'FV Apparent Angle (α)', value: `${solution.alpha.toFixed(2)}°`, note: '∠ with XY' },
    { label: 'Top View Length (ab)', value: fmt(solution.TVL), note: 'TL · cos(θ)' },
    { label: 'TV Apparent Angle (β)', value: `${solution.beta.toFixed(2)}°`, note: '∠ with XY' },
    { label: 'End Projector Gap (p)', value: fmt(solution.projectorDistance), note: '|xB − xA|' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Computed Projections &amp; Traces</h2>
          <p className="text-xs text-slate-500">Complete analytical solution matching manual drafting sheet</p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          θ + φ = {(solution.theta + solution.phi).toFixed(1)}° ≤ 90°
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Column 1: Line & View Quantities */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-slate-700 mb-3">True &amp; Apparent Parameters</h3>
          <dl className="divide-y divide-slate-100">
            {primaryMetrics.map((m) => (
              <div key={m.label} className="py-2 flex items-baseline justify-between gap-3">
                <dt className="text-xs text-slate-600">{m.label}</dt>
                <dd className="text-xs font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Column 2: Endpoints & Quadrants */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-slate-700 mb-3">Endpoint &amp; Midpoint Locations</h3>
          <dl className="space-y-3">
            <div className="pb-2.5 border-b border-slate-100">
              <dt className="text-xs font-medium text-slate-900">End A</dt>
              <dd className="mt-1 text-xs font-mono tabular-nums text-slate-700">
                hA = {solution.A3D.y.toFixed(1)} mm · dA = {solution.A3D.z.toFixed(1)} mm
              </dd>
              <dd className="mt-0.5 text-[11px] text-slate-500">{solution.quadrantA}</dd>
            </div>
            <div className="pb-2.5 border-b border-slate-100">
              <dt className="text-xs font-medium text-slate-900">End B</dt>
              <dd className="mt-1 text-xs font-mono tabular-nums text-slate-700">
                hB = {solution.B3D.y.toFixed(1)} mm · dB = {solution.B3D.z.toFixed(1)} mm
              </dd>
              <dd className="mt-0.5 text-[11px] text-slate-500">{solution.quadrantB}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-900">Midpoint M</dt>
              <dd className="mt-1 text-xs font-mono tabular-nums text-slate-700">
                hM = {solution.M3D.y.toFixed(1)} mm · dM = {solution.M3D.z.toFixed(1)} mm
              </dd>
              <dd className="mt-0.5 text-[11px] text-slate-500">
                Δx = {solution.dx.toFixed(1)} mm · Δh = {solution.dy.toFixed(1)} mm · Δd = {solution.dz.toFixed(1)} mm
              </dd>
            </div>
          </dl>
        </div>

        {/* Column 3: Traces HT & VT */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-slate-700 mb-3">Horizontal &amp; Vertical Traces</h3>
          <dl className="space-y-3">
            <div className="pb-2.5 border-b border-slate-100">
              <dt className="text-xs font-medium text-rose-700">Horizontal Trace (HT)</dt>
              <dd className="mt-1 text-xs font-mono tabular-nums text-slate-900">
                {solution.HT.positionLabel}
              </dd>
              {solution.HT.exists && solution.HT.point3D ? (
                <dd className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500">
                  x = {solution.HT.point3D.x.toFixed(1)} mm from A · y = 0 · z = {solution.HT.point3D.z.toFixed(1)} mm
                </dd>
              ) : (
                <dd className="mt-0.5 text-[11px] text-slate-500">{solution.HT.reason}</dd>
              )}
            </div>

            <div className="pb-2.5 border-b border-slate-100">
              <dt className="text-xs font-medium text-rose-700">Vertical Trace (VT)</dt>
              <dd className="mt-1 text-xs font-mono tabular-nums text-slate-900">
                {solution.VT.positionLabel}
              </dd>
              {solution.VT.exists && solution.VT.point3D ? (
                <dd className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500">
                  x = {solution.VT.point3D.x.toFixed(1)} mm from A · y = {solution.VT.point3D.y.toFixed(1)} mm · z = 0
                </dd>
              ) : (
                <dd className="mt-0.5 text-[11px] text-slate-500">{solution.VT.reason}</dd>
              )}
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-900">Distance Between Traces</dt>
              <dd className="mt-1 text-xs font-mono tabular-nums text-slate-700">
                {solution.distanceBetweenTracesProjectors !== null
                  ? `Projector gap: ${solution.distanceBetweenTracesProjectors.toFixed(2)} mm`
                  : 'N/A (one or both traces do not exist)'}
              </dd>
              {solution.trueDistanceBetweenTraces !== null && (
                <dd className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500">
                  3D distance HT–VT: {solution.trueDistanceBetweenTraces.toFixed(2)} mm
                </dd>
              )}
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
