import React, { useMemo, useRef, useState } from 'react';
import { Download, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import type { Point2D, SolvedLineProjection } from '../geometry/lineSolver';

interface DraftingSheet2DProps {
  solution: SolvedLineProjection;
  activeHighlight?: string[] | null;
  activeStepNumber?: number | null;
}

interface SheetLayers {
  lociAndArcs: boolean;
  auxiliaryTL: boolean;
  traces: boolean;
  dimensions: boolean;
}

interface PointInspect {
  label: string;
  desc: string;
  x: number;
  y: number;
}

function dist(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function buildCompassArcPath(center: Point2D, start: Point2D, end: Point2D): string {
  const r = dist(center, start);
  if (r < 0.5) return '';
  const a1 = Math.atan2(-start.y - -center.y, start.x - center.x);
  const a2 = Math.atan2(-end.y - -center.y, end.x - center.x);
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const sweepFlag = delta >= 0 ? 1 : 0;
  const sx = start.x;
  const sy = -start.y;
  const ex = end.x;
  const ey = -end.y;
  if (Math.hypot(ex - sx, ey - sy) < 0.3) return '';
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

function buildAngleArcPath(
  vertex: Point2D,
  target: Point2D,
  radius: number,
  horizontalDir: number
): { path: string; labelPos: Point2D } | null {
  const vx = vertex.x;
  const vy = -vertex.y;
  const tx = target.x;
  const ty = -target.y;
  const len = Math.hypot(tx - vx, ty - vy);
  if (len < 1) return null;
  const angleToTarget = Math.atan2(ty - vy, tx - vx);
  const baseAngle = horizontalDir >= 0 ? 0 : Math.PI;
  let diff = angleToTarget - baseAngle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) < 0.03) return null;
  const sx = vx + radius * Math.cos(baseAngle);
  const sy = vy + radius * Math.sin(baseAngle);
  const ex = vx + radius * Math.cos(angleToTarget);
  const ey = vy + radius * Math.sin(angleToTarget);
  const sweepFlag = diff >= 0 ? 1 : 0;
  const midAngle = baseAngle + diff * 0.55;
  return {
    path: `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`,
    labelPos: {
      x: vx + (radius + 9) * Math.cos(midAngle),
      y: -(vy + (radius + 9) * Math.sin(midAngle)),
    },
  };
}

export const DraftingSheet2D: React.FC<DraftingSheet2DProps> = ({
  solution,
  activeHighlight = null,
  activeStepNumber = null,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [layers, setLayers] = useState<SheetLayers>({
    lociAndArcs: true,
    auxiliaryTL: true,
    traces: true,
    dimensions: true,
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PointInspect | null>(null);

  const showEntity = (key: string): boolean => {
    if (!activeHighlight) return true;
    return activeHighlight.includes(key);
  };

  // Compute smart bounding box in SVG coordinates (note: svgY = -sheetY)
  const bounds = useMemo(() => {
    if (!solution.valid) {
      return { minX: -40, maxX: 160, minY: -100, maxY: 100 };
    }
    const pts: Point2D[] = [
      solution.aPrime,
      solution.a,
      solution.bPrime,
      solution.b,
      solution.b1Prime,
      solution.b1,
      solution.b2,
      solution.b2Prime,
      { x: 0, y: 0 },
    ];
    if (solution.HT.exists && solution.HT.tracePoint2D && solution.HT.xyProjectorPoint) {
      pts.push(solution.HT.tracePoint2D, solution.HT.xyProjectorPoint);
    }
    if (solution.VT.exists && solution.VT.tracePoint2D && solution.VT.xyProjectorPoint) {
      pts.push(solution.VT.tracePoint2D, solution.VT.xyProjectorPoint);
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minSvgY = Infinity;
    let maxSvgY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      const sy = -p.y;
      if (sy < minSvgY) minSvgY = sy;
      if (sy > maxSvgY) maxSvgY = sy;
    }

    const spanX = Math.max(80, maxX - minX);
    const spanY = Math.max(80, maxSvgY - minSvgY);
    const padX = Math.max(36, spanX * 0.28);
    const padY = Math.max(32, spanY * 0.25);
    return {
      minX: minX - padX,
      maxX: maxX + padX,
      minY: minSvgY - padY,
      maxY: maxSvgY + padY,
    };
  }, [solution]);

  const baseW = bounds.maxX - bounds.minX;
  const baseH = bounds.maxY - bounds.minY;
  const viewBoxW = baseW / zoom;
  const viewBoxH = baseH / zoom;
  const cx = (bounds.minX + bounds.maxX) / 2 - pan.x;
  const cy = (bounds.minY + bounds.maxY) / 2 - pan.y;
  const viewBoxStr = `${(cx - viewBoxW / 2).toFixed(2)} ${(cy - viewBoxH / 2).toFixed(2)} ${viewBoxW.toFixed(2)} ${viewBoxH.toFixed(2)}`;

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => Math.min(4.5, Math.max(0.45, z * factor)));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setDragging(true);
    dragOrigin.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !dragOrigin.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBoxW / rect.width;
    const scaleY = viewBoxH / rect.height;
    const dxPx = e.clientX - dragOrigin.current.x;
    const dyPx = e.clientY - dragOrigin.current.y;
    setPan({
      x: dragOrigin.current.panX + dxPx * scaleX,
      y: dragOrigin.current.panY + dyPx * scaleY,
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragOrigin.current = null;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ortholine-projection-sheet.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!solution.valid) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-sm font-semibold text-rose-700">Cannot Construct 2D Projection Sheet</p>
        <p className="mt-1.5 text-xs text-slate-600 max-w-md">{solution.error}</p>
      </div>
    );
  }

  const {
    aPrime,
    a,
    bPrime,
    b,
    b1Prime,
    b1,
    b2,
    b2Prime,
    HT,
    VT,
    TL,
    FVL,
    TVL,
    theta,
    phi,
    alpha,
    beta,
    projectorDistance,
  } = solution;

  const hDir = bPrime.x >= aPrime.x ? 1 : -1;
  const arcFV = buildCompassArcPath(aPrime, b2Prime, bPrime);
  const arcTV = buildCompassArcPath(a, b1, b);
  const thetaArc = buildAngleArcPath(aPrime, b1Prime, 18, hDir);
  const phiArc = buildAngleArcPath(a, b2, 18, hDir);
  const alphaArc = buildAngleArcPath(aPrime, bPrime, 27, hDir);
  const betaArc = buildAngleArcPath(a, b, 27, hDir);

  const xyLeft = bounds.minX + 10;
  const xyRight = bounds.maxX - 10;
  const locusLeft = Math.min(aPrime.x, bPrime.x, b1Prime.x, b2.x) - 18;
  const locusRight = Math.max(aPrime.x, bPrime.x, b1Prime.x, b2.x) + 26;

  // Helper to render clickable/hoverable drafting point
  const renderPoint = (pt: Point2D, label: string, desc: string, color: string, labelOffset: { dx: number; dy: number }) => (
    <g
      key={label}
      className="cursor-pointer"
      onMouseEnter={() => setHoveredPoint({ label, desc, x: pt.x, y: pt.y })}
      onMouseLeave={() => setHoveredPoint(null)}
    >
      <circle cx={pt.x} cy={-pt.y} r={3.5} fill="transparent" />
      <circle cx={pt.x} cy={-pt.y} r={1.6} fill={color} stroke="#FFFFFF" strokeWidth={0.5} />
      <text
        x={pt.x + labelOffset.dx}
        y={-pt.y + labelOffset.dy}
        fontSize={4.8}
        fontWeight={600}
        fontFamily="IBM Plex Mono, monospace"
        fill={color}
      >
        {label}
      </text>
    </g>
  );

  return (
    <div className="relative flex flex-col h-full w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
            2D Orthographic Drafting Sheet
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-xs text-slate-500 whitespace-nowrap truncate">
            {activeStepNumber ? `Tutorial Step ${activeStepNumber}` : 'First Angle Projection (mm)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!activeHighlight && (
            <>
              <button
                type="button"
                onClick={() => setLayers((l) => ({ ...l, auxiliaryTL: !l.auxiliaryTL }))}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  layers.auxiliaryTL ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                True Length
              </button>
              <button
                type="button"
                onClick={() => setLayers((l) => ({ ...l, lociAndArcs: !l.lociAndArcs }))}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  layers.lociAndArcs ? 'bg-slate-200/80 text-slate-900 border border-slate-300' : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                Loci &amp; Arcs
              </button>
              <button
                type="button"
                onClick={() => setLayers((l) => ({ ...l, traces: !l.traces }))}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  layers.traces ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                Traces (HT/VT)
              </button>
              <button
                type="button"
                onClick={() => setLayers((l) => ({ ...l, dimensions: !l.dimensions }))}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  layers.dimensions ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                Dimensions
              </button>
              <span className="h-4 w-px bg-slate-200 mx-0.5" aria-hidden="true" />
            </>
          )}

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4.5, z * 1.2))}
            aria-label="Zoom in 2D sheet"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.45, z / 1.2))}
            aria-label="Zoom out 2D sheet"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="Fit sheet to view"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 min-h-[340px] bg-white select-none">
        <svg
          ref={svgRef}
          viewBox={viewBoxStr}
          className={`w-full h-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="gridMinor" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#F1F5F9" strokeWidth="0.4" />
            </pattern>
            <pattern id="gridMajor" width="50" height="50" patternUnits="userSpaceOnUse">
              <rect width="50" height="50" fill="url(#gridMinor)" />
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="0.6" />
            </pattern>
            <marker id="arrowArc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748B" />
            </marker>
          </defs>

          {/* Engineering Graph Paper Grid */}
          <rect
            x={bounds.minX - 400}
            y={bounds.minY - 400}
            width={baseW + 800}
            height={baseH + 800}
            fill="url(#gridMajor)"
          />

          {/* Plane Labels (VP / HP in First Angle) */}
          <text x={xyLeft + 2} y={-6} fontSize={4.6} fontWeight={600} fill="#94A3B8" fontFamily="Plus Jakarta Sans, sans-serif">
            VP (Above XY)
          </text>
          <text x={xyLeft + 2} y={8} fontSize={4.6} fontWeight={600} fill="#94A3B8" fontFamily="Plus Jakarta Sans, sans-serif">
            HP (Below XY)
          </text>

          {/* Reference Line XY */}
          {showEntity('xy') && (
            <g>
              <line x1={xyLeft} y1={0} x2={xyRight} y2={0} stroke="#0F172A" strokeWidth={0.95} />
              <text x={xyLeft - 5} y={1.5} fontSize={5.2} fontWeight={700} fill="#0F172A" fontFamily="IBM Plex Mono, monospace">
                X
              </text>
              <text x={xyRight + 2} y={1.5} fontSize={5.2} fontWeight={700} fill="#0F172A" fontFamily="IBM Plex Mono, monospace">
                Y
              </text>
            </g>
          )}

          {/* Loci Lines (Locus of b' and Locus of b) */}
          {layers.lociAndArcs && showEntity('loci') && (
            <g>
              <line
                x1={locusLeft}
                y1={-bPrime.y}
                x2={locusRight}
                y2={-bPrime.y}
                stroke="#64748B"
                strokeWidth={0.55}
                strokeDasharray="6 2 1.5 2"
              />
              <text
                x={locusRight + 2}
                y={-bPrime.y + 1.2}
                fontSize={4}
                fill="#475569"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                Locus of b′
              </text>

              <line
                x1={locusLeft}
                y1={-b.y}
                x2={locusRight}
                y2={-b.y}
                stroke="#64748B"
                strokeWidth={0.55}
                strokeDasharray="6 2 1.5 2"
              />
              <text
                x={locusRight + 2}
                y={-b.y + 1.2}
                fontSize={4}
                fill="#475569"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                Locus of b
              </text>

              {/* Horizontal helper lines through a' and a */}
              <line
                x1={aPrime.x - 10}
                y1={-aPrime.y}
                x2={Math.max(b1.x, b2Prime.x, bPrime.x) + 14}
                y2={-aPrime.y}
                stroke="#CBD5E1"
                strokeWidth={0.45}
                strokeDasharray="2 2"
              />
              <line
                x1={a.x - 10}
                y1={-a.y}
                x2={Math.max(b1.x, b2Prime.x, b.x) + 14}
                y2={-a.y}
                stroke="#CBD5E1"
                strokeWidth={0.45}
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* End A Projector */}
          {showEntity('endA') && (
            <g>
              <line x1={0} y1={-aPrime.y} x2={0} y2={-a.y} stroke="#94A3B8" strokeWidth={0.55} />
              <line x1={0} y1={0} x2={0} y2={-aPrime.y} stroke="#94A3B8" strokeWidth={0.45} strokeDasharray="1.5 1.5" />
              <line x1={0} y1={0} x2={0} y2={-a.y} stroke="#94A3B8" strokeWidth={0.45} strokeDasharray="1.5 1.5" />
            </g>
          )}

          {/* End B Projector */}
          {(showEntity('projectorB') || showEntity('finalViews')) && (
            <line
              x1={bPrime.x}
              y1={-bPrime.y}
              x2={b.x}
              y2={-b.y}
              stroke="#94A3B8"
              strokeWidth={0.55}
            />
          )}

          {/* Auxiliary True Length Line a'b1' & projector to b1 */}
          {layers.auxiliaryTL && showEntity('auxTheta') && (
            <g>
              <line
                x1={aPrime.x}
                y1={-aPrime.y}
                x2={b1Prime.x}
                y2={-b1Prime.y}
                stroke="#D97706"
                strokeWidth={1.15}
                strokeDasharray="4 2"
              />
              <line
                x1={b1Prime.x}
                y1={-b1Prime.y}
                x2={b1.x}
                y2={-b1.y}
                stroke="#CBD5E1"
                strokeWidth={0.5}
              />
              {thetaArc && (
                <>
                  <path d={thetaArc.path} fill="none" stroke="#D97706" strokeWidth={0.6} />
                  <text
                    x={thetaArc.labelPos.x}
                    y={-thetaArc.labelPos.y}
                    fontSize={3.9}
                    fill="#B45309"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    θ={theta.toFixed(1)}°
                  </text>
                </>
              )}
              <text
                x={(aPrime.x + b1Prime.x) / 2 + 2}
                y={-(aPrime.y + b1Prime.y) / 2 - 2}
                fontSize={3.8}
                fill="#B45309"
                fontFamily="IBM Plex Mono, monospace"
              >
                TL={TL.toFixed(1)}
              </text>
              {renderPoint(b1Prime, "b₁'", `Auxiliary TL endpoint in Elevation (${b1Prime.x.toFixed(1)}, ${b1Prime.y.toFixed(1)})`, '#D97706', { dx: 2.5, dy: -2 })}
              {renderPoint(b1, 'b₁', `Top view length projected from b₁' (${b1.x.toFixed(1)}, ${b1.y.toFixed(1)})`, '#D97706', { dx: 2.5, dy: 4.5 })}
            </g>
          )}

          {/* Auxiliary True Length Line ab2 & projector to b2' */}
          {layers.auxiliaryTL && showEntity('auxPhi') && (
            <g>
              <line
                x1={a.x}
                y1={-a.y}
                x2={b2.x}
                y2={-b2.y}
                stroke="#D97706"
                strokeWidth={1.15}
                strokeDasharray="4 2"
              />
              <line
                x1={b2.x}
                y1={-b2.y}
                x2={b2Prime.x}
                y2={-b2Prime.y}
                stroke="#CBD5E1"
                strokeWidth={0.5}
              />
              {phiArc && (
                <>
                  <path d={phiArc.path} fill="none" stroke="#D97706" strokeWidth={0.6} />
                  <text
                    x={phiArc.labelPos.x}
                    y={-phiArc.labelPos.y}
                    fontSize={3.9}
                    fill="#B45309"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    φ={phi.toFixed(1)}°
                  </text>
                </>
              )}
              <text
                x={(a.x + b2.x) / 2 + 2}
                y={-(a.y + b2.y) / 2 + 4.5}
                fontSize={3.8}
                fill="#B45309"
                fontFamily="IBM Plex Mono, monospace"
              >
                TL={TL.toFixed(1)}
              </text>
              {renderPoint(b2, 'b₂', `Auxiliary TL endpoint in Plan (${b2.x.toFixed(1)}, ${b2.y.toFixed(1)})`, '#D97706', { dx: 2.5, dy: 4.5 })}
              {renderPoint(b2Prime, "b₂'", `Front view length projected from b₂ (${b2Prime.x.toFixed(1)}, ${b2Prime.y.toFixed(1)})`, '#D97706', { dx: 2.5, dy: -2 })}
            </g>
          )}

          {/* Compass Rotation Arcs */}
          {layers.lociAndArcs && showEntity('arcFV') && arcFV && (
            <path
              d={arcFV}
              fill="none"
              stroke="#64748B"
              strokeWidth={0.6}
              strokeDasharray="2.5 2"
              markerEnd="url(#arrowArc)"
            />
          )}
          {layers.lociAndArcs && showEntity('arcTV') && arcTV && (
            <path
              d={arcTV}
              fill="none"
              stroke="#64748B"
              strokeWidth={0.6}
              strokeDasharray="2.5 2"
              markerEnd="url(#arrowArc)"
            />
          )}

          {/* Traces (HT and VT) */}
          {layers.traces && showEntity('traces') && (
            <g>
              {HT.exists && HT.xyProjectorPoint && HT.tracePoint2D && (
                <g>
                  {/* Extension from a'b' to h' on XY */}
                  <line
                    x1={aPrime.x}
                    y1={-aPrime.y}
                    x2={HT.xyProjectorPoint.x}
                    y2={-HT.xyProjectorPoint.y}
                    stroke="#0284C7"
                    strokeWidth={0.65}
                    strokeDasharray="2.5 2"
                  />
                  {/* Extension from ab to HT */}
                  <line
                    x1={a.x}
                    y1={-a.y}
                    x2={HT.tracePoint2D.x}
                    y2={-HT.tracePoint2D.y}
                    stroke="#059669"
                    strokeWidth={0.65}
                    strokeDasharray="2.5 2"
                  />
                  {/* Vertical projector h' to HT */}
                  <line
                    x1={HT.xyProjectorPoint.x}
                    y1={-HT.xyProjectorPoint.y}
                    x2={HT.tracePoint2D.x}
                    y2={-HT.tracePoint2D.y}
                    stroke="#DC2626"
                    strokeWidth={0.75}
                    strokeDasharray="2 1.5"
                  />
                  <circle cx={HT.tracePoint2D.x} cy={-HT.tracePoint2D.y} r={2.8} fill="none" stroke="#DC2626" strokeWidth={0.75} />
                  {renderPoint(HT.xyProjectorPoint, "h'", `Front view of HT on XY (x=${HT.xyProjectorPoint.x.toFixed(1)} mm)`, '#DC2626', { dx: -5, dy: -3 })}
                  {renderPoint(HT.tracePoint2D, 'HT', `Horizontal Trace: ${HT.positionLabel}`, '#DC2626', { dx: 3.5, dy: 4 })}
                </g>
              )}

              {VT.exists && VT.xyProjectorPoint && VT.tracePoint2D && (
                <g>
                  {/* Extension from ab to v on XY */}
                  <line
                    x1={a.x}
                    y1={-a.y}
                    x2={VT.xyProjectorPoint.x}
                    y2={-VT.xyProjectorPoint.y}
                    stroke="#059669"
                    strokeWidth={0.65}
                    strokeDasharray="2.5 2"
                  />
                  {/* Extension from a'b' to VT */}
                  <line
                    x1={aPrime.x}
                    y1={-aPrime.y}
                    x2={VT.tracePoint2D.x}
                    y2={-VT.tracePoint2D.y}
                    stroke="#0284C7"
                    strokeWidth={0.65}
                    strokeDasharray="2.5 2"
                  />
                  {/* Vertical projector v to VT */}
                  <line
                    x1={VT.xyProjectorPoint.x}
                    y1={-VT.xyProjectorPoint.y}
                    x2={VT.tracePoint2D.x}
                    y2={-VT.tracePoint2D.y}
                    stroke="#DC2626"
                    strokeWidth={0.75}
                    strokeDasharray="2 1.5"
                  />
                  <circle cx={VT.tracePoint2D.x} cy={-VT.tracePoint2D.y} r={2.8} fill="none" stroke="#DC2626" strokeWidth={0.75} />
                  {renderPoint(VT.xyProjectorPoint, 'v', `Top view of VT on XY (x=${VT.xyProjectorPoint.x.toFixed(1)} mm)`, '#DC2626', { dx: 2.5, dy: 4.5 })}
                  {renderPoint(VT.tracePoint2D, 'VT', `Vertical Trace: ${VT.positionLabel}`, '#DC2626', { dx: 3.5, dy: -2 })}
                </g>
              )}
            </g>
          )}

          {/* Final Projections: Front View (a'b') and Top View (ab) */}
          {showEntity('finalViews') && (
            <g>
              {/* Front View a'b' */}
              <line
                x1={aPrime.x}
                y1={-aPrime.y}
                x2={bPrime.x}
                y2={-bPrime.y}
                stroke="#0284C7"
                strokeWidth={1.9}
                strokeLinecap="round"
              />
              {/* Top View ab */}
              <line
                x1={a.x}
                y1={-a.y}
                x2={b.x}
                y2={-b.y}
                stroke="#059669"
                strokeWidth={1.9}
                strokeLinecap="round"
              />

              {layers.dimensions && alphaArc && (
                <>
                  <path d={alphaArc.path} fill="none" stroke="#0284C7" strokeWidth={0.55} />
                  <text
                    x={alphaArc.labelPos.x}
                    y={-alphaArc.labelPos.y}
                    fontSize={3.8}
                    fill="#0369A1"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    α={alpha.toFixed(1)}°
                  </text>
                </>
              )}
              {layers.dimensions && betaArc && (
                <>
                  <path d={betaArc.path} fill="none" stroke="#059669" strokeWidth={0.55} />
                  <text
                    x={betaArc.labelPos.x}
                    y={-betaArc.labelPos.y}
                    fontSize={3.8}
                    fill="#047857"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    β={beta.toFixed(1)}°
                  </text>
                </>
              )}

              {layers.dimensions && (
                <>
                  <text
                    x={(aPrime.x + bPrime.x) / 2 - 8}
                    y={-(aPrime.y + bPrime.y) / 2 - 3.5}
                    fontSize={4}
                    fontWeight={600}
                    fill="#0369A1"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    FV={FVL.toFixed(1)}
                  </text>
                  <text
                    x={(a.x + b.x) / 2 - 8}
                    y={-(a.y + b.y) / 2 + 5.5}
                    fontSize={4}
                    fontWeight={600}
                    fill="#047857"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    TV={TVL.toFixed(1)}
                  </text>
                </>
              )}

              {renderPoint(bPrime, "b'", `Front view of End B: (${bPrime.x.toFixed(1)}, ${bPrime.y.toFixed(1)} mm)`, '#0284C7', { dx: 2.5, dy: -2.5 })}
              {renderPoint(b, 'b', `Top view of End B: (${b.x.toFixed(1)}, ${b.y.toFixed(1)} mm)`, '#059669', { dx: 2.5, dy: 4.5 })}
            </g>
          )}

          {/* End A points (rendered on top so always crisp) */}
          {showEntity('endA') && (
            <g>
              {renderPoint(aPrime, "a'", `Front view of End A: (0, ${aPrime.y.toFixed(1)} mm)`, '#0284C7', { dx: -5.5, dy: -2.5 })}
              {renderPoint(a, 'a', `Top view of End A: (0, ${a.y.toFixed(1)} mm)`, '#059669', { dx: -5.5, dy: 4.5 })}
            </g>
          )}

          {/* Projector distance dimension bar at bottom */}
          {layers.dimensions && showEntity('finalViews') && projectorDistance > 2 && (
            <g>
              <line
                x1={0}
                y1={bounds.maxY - 12}
                x2={bPrime.x}
                y2={bounds.maxY - 12}
                stroke="#64748B"
                strokeWidth={0.55}
              />
              <line x1={0} y1={bounds.maxY - 15} x2={0} y2={bounds.maxY - 9} stroke="#64748B" strokeWidth={0.55} />
              <line x1={bPrime.x} y1={bounds.maxY - 15} x2={bPrime.x} y2={bounds.maxY - 9} stroke="#64748B" strokeWidth={0.55} />
              <text
                x={bPrime.x / 2}
                y={bounds.maxY - 14}
                textAnchor="middle"
                fontSize={4}
                fill="#334155"
                fontFamily="IBM Plex Mono, monospace"
              >
                p = {projectorDistance.toFixed(1)} mm
              </text>
            </g>
          )}
        </svg>

        {/* Legend & Point Inspection Bar */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 px-3 py-1.5 bg-white/95 border border-slate-200 rounded-lg text-[11px] text-slate-600 shadow-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-600 inline-block" />
              <span className="font-medium text-slate-800">FV (a′b′)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
              <span className="font-medium text-slate-800">TV (ab)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-amber-600 inline-block" />
              <span className="font-medium text-slate-800">TL</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-rose-600 inline-block" />
              <span className="font-medium text-slate-800">HT / VT</span>
            </span>
          </div>

          {hoveredPoint && (
            <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-mono tabular-nums shadow-xs">
              <span className="font-semibold text-sky-300">{hoveredPoint.label}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span>{hoveredPoint.desc}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
