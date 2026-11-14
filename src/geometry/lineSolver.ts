export type InputModeId =
  | 'tl_theta_phi'
  | 'tl_fvl_tvl'
  | 'endpoints_p'
  | 'p_theta_phi'
  | 'tl_theta_db'
  | 'tl_phi_hb'
  | 'tl_hb_db'
  | 'tl_theta_beta'
  | 'tl_phi_alpha'
  | 'tl_theta_alpha'
  | 'tl_phi_beta'
  | 'fvl_tvl_p'
  | 'fvl_tvl_hb'
  | 'fvl_tvl_db'
  | 'fvl_hb_db'
  | 'tvl_hb_db'
  | 'hb_db_theta'
  | 'hb_db_phi'
  | 'fvl_alpha_beta'
  | 'tvl_beta_alpha'
  | 'alpha_beta_p'
  | 'fvl_tvl_alpha'
  | 'fvl_tvl_beta'
  | 'fvl_alpha_tl'
  | 'fvl_alpha_theta'
  | 'fvl_alpha_phi'
  | 'tvl_beta_tl'
  | 'tvl_beta_theta'
  | 'tvl_beta_phi'
  | 'traces_ht_vt_ab'
  | 'traces_ht_vt_a_tl'
  | 'traces_a_vt_tl_theta'
  | 'traces_a_vt_tl_phi'
  | 'traces_a_ht_tl_theta'
  | 'midpoint_tl_theta_phi'
  | 'midpoint_fvl_tvl_p';

export type DirSign = 1 | -1;

export interface LineInputParams {
  mode: InputModeId;
  // Endpoint A distances (signed: + above HP / in front of VP; - below HP / behind VP)
  hA: number;
  dA: number;
  // Endpoint B distances (used when hB or dB is an input)
  hB: number;
  dB: number;
  // Midpoint M distances (used in midpoint mode)
  hM: number;
  dM: number;
  // True Length & true angles (degrees)
  TL: number;
  theta: number; // true inclination with HP (0..90)
  phi: number;   // true inclination with VP (0..90)
  // Apparent lengths & angles (degrees)
  FVL: number;   // Front View length a'b'
  TVL: number;   // Top View length ab
  alpha: number; // Apparent angle of FV with XY (0..90)
  beta: number;  // Apparent angle of TV with XY (0..90)
  // Distance between end projectors A and B
  projectorDistance: number;
  // Trace inputs
  dHT: number; // Distance of HT from VP (+ in front, - behind)
  hVT: number; // Height of VT from HP (+ above, - below)
  traceProjectorDistance: number; // x_VT - x_HT
  // Direction flags for B relative to A when angles/lengths don't carry sign
  bAboveA: boolean;    // true => hB >= hA, false => hB <= hA
  bInFrontOfA: boolean; // true => dB >= dA, false => dB <= dA
  bRightOfA: boolean;  // true => xB >= xA, false => xB <= xA
}

export interface Point2D {
  x: number; // along XY (mm)
  y: number; // signed height above XY on 2D sheet (+ above XY, - below XY)
}

export interface Point3D {
  x: number; // along XY (mm)
  y: number; // height from HP (+ above HP, - below HP)
  z: number; // depth from VP (+ in front of VP, - behind VP)
}

export interface TraceInfo {
  exists: boolean;
  reason?: string;
  point3D?: Point3D;
  xyProjectorPoint?: Point2D;
  tracePoint2D?: Point2D;
  distanceFromXY: number | null;
  positionLabel: string;
}

export interface ConstructionStep {
  stepNumber: number;
  title: string;
  actionSummary: string;
  draftingInstruction: string;
  formulaUsed?: string;
  highlightEntities: string[];
  checkpoint?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface SolvedLineProjection {
  valid: boolean;
  error?: string;
  warnings: string[];
  mode: InputModeId;
  A3D: Point3D;
  B3D: Point3D;
  M3D: Point3D;
  TL: number;
  theta: number;
  phi: number;
  FVL: number;
  TVL: number;
  alpha: number;
  beta: number;
  projectorDistance: number;
  dx: number;
  dy: number;
  dz: number;
  aPrime: Point2D;
  a: Point2D;
  bPrime: Point2D;
  b: Point2D;
  b1Prime: Point2D;
  b1: Point2D;
  b2: Point2D;
  b2Prime: Point2D;
  HT: TraceInfo;
  VT: TraceInfo;
  distanceBetweenTracesProjectors: number | null;
  trueDistanceBetweenTraces: number | null;
  quadrantA: string;
  quadrantB: string;
  tutorialSteps: ConstructionStep[];
}

export interface InputModeMeta {
  id: InputModeId;
  category: 'Standard' | 'True Length & Locus' | 'Apparent Views' | 'Traces' | 'Midpoint';
  label: string;
  shortDesc: string;
  fields: Array<keyof LineInputParams>;
}

export const INPUT_MODES: InputModeMeta[] = [
  {
    id: 'tl_theta_phi',
    category: 'Standard',
    label: 'TL, θ & φ (Standard)',
    shortDesc: 'End A position, True Length, true inclinations θ (HP) and φ (VP)',
    fields: ['hA', 'dA', 'TL', 'theta', 'phi'],
  },
  {
    id: 'tl_fvl_tvl',
    category: 'Standard',
    label: 'TL, FV Length & TV Length',
    shortDesc: 'End A position, True Length, Front View length (a′b′), and Top View length (ab)',
    fields: ['hA', 'dA', 'TL', 'FVL', 'TVL'],
  },
  {
    id: 'endpoints_p',
    category: 'Standard',
    label: 'End A, End B & Projector Gap (p)',
    shortDesc: 'Coordinates of both ends A and B wrt HP/VP plus distance between end projectors',
    fields: ['hA', 'dA', 'hB', 'dB', 'projectorDistance'],
  },
  {
    id: 'p_theta_phi',
    category: 'Standard',
    label: 'Projector Gap (p), θ & φ',
    shortDesc: 'End A position, projector distance p, and true inclinations θ (HP) and φ (VP)',
    fields: ['hA', 'dA', 'projectorDistance', 'theta', 'phi'],
  },
  {
    id: 'tl_theta_db',
    category: 'True Length & Locus',
    label: 'TL, θ & End B depth (dB)',
    shortDesc: 'End A position, True Length, inclination θ to HP, and B distance from VP',
    fields: ['hA', 'dA', 'TL', 'theta', 'dB'],
  },
  {
    id: 'tl_phi_hb',
    category: 'True Length & Locus',
    label: 'TL, φ & End B height (hB)',
    shortDesc: 'End A position, True Length, inclination φ to VP, and B distance from HP',
    fields: ['hA', 'dA', 'TL', 'phi', 'hB'],
  },
  {
    id: 'tl_hb_db',
    category: 'True Length & Locus',
    label: 'TL & Both End Loci (hB, dB)',
    shortDesc: 'End A position, True Length, and distances of end B from HP and VP',
    fields: ['hA', 'dA', 'TL', 'hB', 'dB'],
  },
  {
    id: 'tl_theta_beta',
    category: 'True Length & Locus',
    label: 'TL, θ & Top View Angle (β)',
    shortDesc: 'End A, True Length, inclination θ to HP, and top view inclination β',
    fields: ['hA', 'dA', 'TL', 'theta', 'beta'],
  },
  {
    id: 'tl_phi_alpha',
    category: 'True Length & Locus',
    label: 'TL, φ & Front View Angle (α)',
    shortDesc: 'End A, True Length, inclination φ to VP, and front view inclination α',
    fields: ['hA', 'dA', 'TL', 'phi', 'alpha'],
  },
  {
    id: 'tl_theta_alpha',
    category: 'True Length & Locus',
    label: 'TL, θ & Front View Angle (α)',
    shortDesc: 'End A, True Length, inclination θ to HP, and apparent angle α (α ≥ θ)',
    fields: ['hA', 'dA', 'TL', 'theta', 'alpha'],
  },
  {
    id: 'tl_phi_beta',
    category: 'True Length & Locus',
    label: 'TL, φ & Top View Angle (β)',
    shortDesc: 'End A, True Length, inclination φ to VP, and apparent angle β (β ≥ φ)',
    fields: ['hA', 'dA', 'TL', 'phi', 'beta'],
  },
  {
    id: 'hb_db_theta',
    category: 'True Length & Locus',
    label: 'End B (hB, dB) & θ',
    shortDesc: 'Both end distances from HP and VP plus true inclination θ to HP',
    fields: ['hA', 'dA', 'hB', 'dB', 'theta'],
  },
  {
    id: 'hb_db_phi',
    category: 'True Length & Locus',
    label: 'End B (hB, dB) & φ',
    shortDesc: 'Both end distances from HP and VP plus true inclination φ to VP',
    fields: ['hA', 'dA', 'hB', 'dB', 'phi'],
  },
  {
    id: 'fvl_tvl_p',
    category: 'Apparent Views',
    label: 'FV Length, TV Length & p',
    shortDesc: 'End A, Front View length, Top View length, and projector gap p',
    fields: ['hA', 'dA', 'FVL', 'TVL', 'projectorDistance'],
  },
  {
    id: 'fvl_tvl_hb',
    category: 'Apparent Views',
    label: 'FV Length, TV Length & hB',
    shortDesc: 'End A, Front View length, Top View length, and end B height hB',
    fields: ['hA', 'dA', 'FVL', 'TVL', 'hB'],
  },
  {
    id: 'fvl_tvl_db',
    category: 'Apparent Views',
    label: 'FV Length, TV Length & dB',
    shortDesc: 'End A, Front View length, Top View length, and end B depth dB',
    fields: ['hA', 'dA', 'FVL', 'TVL', 'dB'],
  },
  {
    id: 'fvl_hb_db',
    category: 'Apparent Views',
    label: 'FV Length & End B (hB, dB)',
    shortDesc: 'End A, Front View length, and distances of end B from HP and VP',
    fields: ['hA', 'dA', 'FVL', 'hB', 'dB'],
  },
  {
    id: 'tvl_hb_db',
    category: 'Apparent Views',
    label: 'TV Length & End B (hB, dB)',
    shortDesc: 'End A, Top View length, and distances of end B from HP and VP',
    fields: ['hA', 'dA', 'TVL', 'hB', 'dB'],
  },
  {
    id: 'fvl_alpha_beta',
    category: 'Apparent Views',
    label: 'FV Length, α & β',
    shortDesc: 'End A, Front View length, and both apparent angles α and β',
    fields: ['hA', 'dA', 'FVL', 'alpha', 'beta'],
  },
  {
    id: 'tvl_beta_alpha',
    category: 'Apparent Views',
    label: 'TV Length, β & α',
    shortDesc: 'End A, Top View length, and both apparent angles β and α',
    fields: ['hA', 'dA', 'TVL', 'beta', 'alpha'],
  },
  {
    id: 'alpha_beta_p',
    category: 'Apparent Views',
    label: 'Apparent Angles (α, β) & p',
    shortDesc: 'End A, apparent inclinations α and β, and projector distance p',
    fields: ['hA', 'dA', 'alpha', 'beta', 'projectorDistance'],
  },
  {
    id: 'fvl_tvl_alpha',
    category: 'Apparent Views',
    label: 'FV Length, TV Length & α',
    shortDesc: 'End A, both view lengths, and Front View inclination α',
    fields: ['hA', 'dA', 'FVL', 'TVL', 'alpha'],
  },
  {
    id: 'fvl_tvl_beta',
    category: 'Apparent Views',
    label: 'FV Length, TV Length & β',
    shortDesc: 'End A, both view lengths, and Top View inclination β',
    fields: ['hA', 'dA', 'FVL', 'TVL', 'beta'],
  },
  {
    id: 'fvl_alpha_tl',
    category: 'Apparent Views',
    label: 'FV Length, α & TL',
    shortDesc: 'End A, Front View length, apparent angle α, and True Length',
    fields: ['hA', 'dA', 'FVL', 'alpha', 'TL'],
  },
  {
    id: 'fvl_alpha_theta',
    category: 'Apparent Views',
    label: 'FV Length, α & θ',
    shortDesc: 'End A, Front View length, apparent angle α, and true angle θ to HP',
    fields: ['hA', 'dA', 'FVL', 'alpha', 'theta'],
  },
  {
    id: 'fvl_alpha_phi',
    category: 'Apparent Views',
    label: 'FV Length, α & φ',
    shortDesc: 'End A, Front View length, apparent angle α, and true angle φ to VP',
    fields: ['hA', 'dA', 'FVL', 'alpha', 'phi'],
  },
  {
    id: 'tvl_beta_tl',
    category: 'Apparent Views',
    label: 'TV Length, β & TL',
    shortDesc: 'End A, Top View length, apparent angle β, and True Length',
    fields: ['hA', 'dA', 'TVL', 'beta', 'TL'],
  },
  {
    id: 'tvl_beta_theta',
    category: 'Apparent Views',
    label: 'TV Length, β & θ',
    shortDesc: 'End A, Top View length, apparent angle β, and true angle θ to HP',
    fields: ['hA', 'dA', 'TVL', 'beta', 'theta'],
  },
  {
    id: 'tvl_beta_phi',
    category: 'Apparent Views',
    label: 'TV Length, β & φ',
    shortDesc: 'End A, Top View length, apparent angle β, and true angle φ to VP',
    fields: ['hA', 'dA', 'TVL', 'beta', 'phi'],
  },
  {
    id: 'traces_ht_vt_ab',
    category: 'Traces',
    label: 'HT, VT, Trace Gap & hA, hB',
    shortDesc: 'HT & VT distances, distance between trace projectors, and end heights hA, hB',
    fields: ['dHT', 'hVT', 'traceProjectorDistance', 'hA', 'hB'],
  },
  {
    id: 'traces_ht_vt_a_tl',
    category: 'Traces',
    label: 'HT, VT, Trace Gap, hA & TL',
    shortDesc: 'HT & VT positions, trace projector distance, end A height, and True Length',
    fields: ['dHT', 'hVT', 'traceProjectorDistance', 'hA', 'TL'],
  },
  {
    id: 'traces_a_vt_tl_theta',
    category: 'Traces',
    label: 'End A, VT Height, TL & θ',
    shortDesc: 'End A position, Vertical Trace height hVT, True Length, and angle θ',
    fields: ['hA', 'dA', 'hVT', 'TL', 'theta'],
  },
  {
    id: 'traces_a_vt_tl_phi',
    category: 'Traces',
    label: 'End A, VT Height, TL & φ',
    shortDesc: 'End A position, Vertical Trace height hVT, True Length, and angle φ',
    fields: ['hA', 'dA', 'hVT', 'TL', 'phi'],
  },
  {
    id: 'traces_a_ht_tl_theta',
    category: 'Traces',
    label: 'End A, HT Depth, TL & θ',
    shortDesc: 'End A position, Horizontal Trace depth dHT, True Length, and angle θ',
    fields: ['hA', 'dA', 'dHT', 'TL', 'theta'],
  },
  {
    id: 'midpoint_tl_theta_phi',
    category: 'Midpoint',
    label: 'Midpoint M, TL, θ & φ',
    shortDesc: 'Midpoint M position wrt HP/VP, True Length, and true angles θ and φ',
    fields: ['hM', 'dM', 'TL', 'theta', 'phi'],
  },
  {
    id: 'midpoint_fvl_tvl_p',
    category: 'Midpoint',
    label: 'Midpoint M, FV Length, TV Length & p',
    shortDesc: 'Midpoint M position wrt HP/VP, Front View length, Top View length, and projector gap p',
    fields: ['hM', 'dM', 'FVL', 'TVL', 'projectorDistance'],
  },
];

export const DEFAULT_INPUT_PARAMS: LineInputParams = {
  mode: 'tl_theta_phi',
  hA: 15,
  dA: 20,
  hB: 55,
  dB: 60,
  hM: 40,
  dM: 45,
  TL: 80,
  theta: 30,
  phi: 45,
  FVL: 56.57,
  TVL: 69.28,
  alpha: 45,
  beta: 54.74,
  projectorDistance: 40,
  dHT: 35,
  hVT: 55,
  traceProjectorDistance: 90,
  bAboveA: true,
  bInFrontOfA: true,
  bRightOfA: true,
};

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EPS = 1e-6;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function classifyQuadrant(h: number, d: number): string {
  const hZero = Math.abs(h) < 0.01;
  const dZero = Math.abs(d) < 0.01;
  if (hZero && dZero) return 'On XY (HP & VP)';
  if (hZero) return d > 0 ? 'In HP, in front of VP' : 'In HP, behind VP';
  if (dZero) return h > 0 ? 'In VP, above HP' : 'In VP, below HP';
  if (h > 0 && d > 0) return '1st Quadrant (Above HP, In front of VP)';
  if (h > 0 && d < 0) return '2nd Quadrant (Above HP, Behind VP)';
  if (h < 0 && d < 0) return '3rd Quadrant (Below HP, Behind VP)';
  return '4th Quadrant (Below HP, In front of VP)';
}

function formatSignedPosition(val: number, posWord: string, negWord: string, zeroWord: string): string {
  if (Math.abs(val) < 0.01) return zeroWord;
  const mag = Math.abs(val).toFixed(1);
  return val > 0 ? `${mag} mm ${posWord}` : `${mag} mm ${negWord}`;
}

function makeError(mode: InputModeId, error: string): SolvedLineProjection {
  return {
    valid: false,
    error,
    warnings: [],
    mode,
    A3D: { x: 0, y: 0, z: 0 },
    B3D: { x: 0, y: 0, z: 0 },
    M3D: { x: 0, y: 0, z: 0 },
    TL: 0,
    theta: 0,
    phi: 0,
    FVL: 0,
    TVL: 0,
    alpha: 0,
    beta: 0,
    projectorDistance: 0,
    dx: 0,
    dy: 0,
    dz: 0,
    aPrime: { x: 0, y: 0 },
    a: { x: 0, y: 0 },
    bPrime: { x: 0, y: 0 },
    b: { x: 0, y: 0 },
    b1Prime: { x: 0, y: 0 },
    b1: { x: 0, y: 0 },
    b2: { x: 0, y: 0 },
    b2Prime: { x: 0, y: 0 },
    HT: { exists: false, distanceFromXY: null, positionLabel: 'None' },
    VT: { exists: false, distanceFromXY: null, positionLabel: 'None' },
    distanceBetweenTracesProjectors: null,
    trueDistanceBetweenTraces: null,
    quadrantA: '',
    quadrantB: '',
    tutorialSteps: [],
  };
}

export function solveLineProjection(raw: LineInputParams): SolvedLineProjection {
  const mode = raw.mode;
  const warnings: string[] = [];

  const sY: DirSign = raw.bAboveA ? 1 : -1;
  const sZ: DirSign = raw.bInFrontOfA ? 1 : -1;
  const sX: DirSign = raw.bRightOfA ? 1 : -1;

  let hA = raw.hA;
  let dA = raw.dA;
  let dx = 0;
  let dy = 0;
  let dz = 0;

  if (
    [
      'tl_theta_phi',
      'tl_fvl_tvl',
      'tl_theta_db',
      'tl_phi_hb',
      'tl_hb_db',
      'tl_theta_beta',
      'tl_phi_alpha',
      'tl_theta_alpha',
      'tl_phi_beta',
      'fvl_alpha_tl',
      'tvl_beta_tl',
      'traces_a_vt_tl_theta',
      'traces_a_vt_tl_phi',
      'traces_a_ht_tl_theta',
      'traces_ht_vt_a_tl',
      'midpoint_tl_theta_phi',
    ].includes(mode) &&
    raw.TL <= 0
  ) {
    return makeError(mode, 'True Length (TL) must be strictly greater than 0 mm.');
  }

  switch (mode) {
    case 'tl_theta_phi': {
      const { TL, theta, phi } = raw;
      if (theta < 0 || theta > 90 || phi < 0 || phi > 90) {
        return makeError(mode, 'True inclinations θ and φ must be between 0° and 90°.');
      }
      if (theta + phi > 90 + 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: θ + φ = ${(theta + phi).toFixed(1)}° exceeds 90°. For a line in 3D space, sin²θ + sin²φ ≤ 1, which requires θ + φ ≤ 90°.`
        );
      }
      dy = sY * TL * Math.sin(theta * DEG2RAD);
      dz = sZ * TL * Math.sin(phi * DEG2RAD);
      const dxSq = Math.max(0, TL * TL - dy * dy - dz * dz);
      dx = sX * Math.sqrt(dxSq);
      if (Math.abs(theta + phi - 90) < 0.05) {
        warnings.push('Profile line (θ + φ = 90°): Both front and top views lie on a single vertical projector (p = 0 mm).');
      }
      break;
    }

    case 'tl_fvl_tvl': {
      const { TL, FVL, TVL } = raw;
      if (FVL <= 0 || TVL <= 0) {
        return makeError(mode, 'Front View and Top View lengths must be positive.');
      }
      if (FVL > TL + 1e-4 || TVL > TL + 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: Front View (${FVL} mm) and Top View (${TVL} mm) lengths cannot exceed True Length (${TL} mm).`
        );
      }
      if (FVL * FVL + TVL * TVL < TL * TL - 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: FVL² + TVL² (${(FVL * FVL + TVL * TVL).toFixed(1)}) cannot be less than TL² (${(TL * TL).toFixed(1)}), which would make θ + φ > 90°.`
        );
      }
      dy = sY * Math.sqrt(Math.max(0, TL * TL - TVL * TVL));
      dz = sZ * Math.sqrt(Math.max(0, TL * TL - FVL * FVL));
      dx = sX * Math.sqrt(Math.max(0, FVL * FVL + TVL * TVL - TL * TL));
      break;
    }

    case 'endpoints_p': {
      const { hB, dB, projectorDistance } = raw;
      if (projectorDistance < 0) {
        return makeError(mode, 'Distance between end projectors (p) cannot be negative.');
      }
      dy = hB - hA;
      dz = dB - dA;
      dx = sX * projectorDistance;
      if (Math.hypot(dx, dy, dz) < EPS) {
        return makeError(mode, 'End points A and B coincide (True Length = 0). Increase projector gap or height/depth difference.');
      }
      break;
    }

    case 'p_theta_phi': {
      const { projectorDistance, theta, phi } = raw;
      if (projectorDistance <= 0) {
        return makeError(mode, 'Projector distance p must be positive when solving from p, θ, and φ.');
      }
      if (theta < 0 || theta >= 90 || phi < 0 || phi >= 90 || theta + phi >= 90 - 1e-4) {
        return makeError(mode, 'For a non-zero projector gap p, θ + φ must be strictly less than 90°.');
      }
      const sinT = Math.sin(theta * DEG2RAD);
      const sinP = Math.sin(phi * DEG2RAD);
      const factor = Math.sqrt(Math.max(1e-9, 1 - sinT * sinT - sinP * sinP));
      const tl = projectorDistance / factor;
      dx = sX * projectorDistance;
      dy = sY * tl * sinT;
      dz = sZ * tl * sinP;
      break;
    }

    case 'tl_theta_db': {
      const { TL, theta, dB } = raw;
      if (theta < 0 || theta > 90) return makeError(mode, 'Angle θ must be between 0° and 90°.');
      dy = sY * TL * Math.sin(theta * DEG2RAD);
      dz = dB - dA;
      const tvl = TL * Math.cos(theta * DEG2RAD);
      if (Math.abs(dz) > tvl + 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: |dB − dA| = ${Math.abs(dz).toFixed(1)} mm exceeds the Top View Length TL·cos(θ) = ${tvl.toFixed(1)} mm.`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, tvl * tvl - dz * dz));
      break;
    }

    case 'tl_phi_hb': {
      const { TL, phi, hB } = raw;
      if (phi < 0 || phi > 90) return makeError(mode, 'Angle φ must be between 0° and 90°.');
      dz = sZ * TL * Math.sin(phi * DEG2RAD);
      dy = hB - hA;
      const fvl = TL * Math.cos(phi * DEG2RAD);
      if (Math.abs(dy) > fvl + 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: |hB − hA| = ${Math.abs(dy).toFixed(1)} mm exceeds the Front View Length TL·cos(φ) = ${fvl.toFixed(1)} mm.`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, fvl * fvl - dy * dy));
      break;
    }

    case 'tl_hb_db': {
      const { TL, hB, dB } = raw;
      dy = hB - hA;
      dz = dB - dA;
      if (dy * dy + dz * dz > TL * TL + 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: √(Δh² + Δd²) = ${Math.hypot(dy, dz).toFixed(1)} mm exceeds True Length (${TL} mm).`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, TL * TL - dy * dy - dz * dz));
      break;
    }

    case 'tl_theta_beta': {
      const { TL, theta, beta } = raw;
      if (theta < 0 || theta > 90 || beta < 0 || beta > 90) {
        return makeError(mode, 'Angles θ and β must be between 0° and 90°.');
      }
      const tvl = TL * Math.cos(theta * DEG2RAD);
      dy = sY * TL * Math.sin(theta * DEG2RAD);
      dx = sX * tvl * Math.cos(beta * DEG2RAD);
      dz = sZ * tvl * Math.sin(beta * DEG2RAD);
      break;
    }

    case 'tl_phi_alpha': {
      const { TL, phi, alpha } = raw;
      if (phi < 0 || phi > 90 || alpha < 0 || alpha > 90) {
        return makeError(mode, 'Angles φ and α must be between 0° and 90°.');
      }
      const fvl = TL * Math.cos(phi * DEG2RAD);
      dz = sZ * TL * Math.sin(phi * DEG2RAD);
      dx = sX * fvl * Math.cos(alpha * DEG2RAD);
      dy = sY * fvl * Math.sin(alpha * DEG2RAD);
      break;
    }

    case 'tl_theta_alpha': {
      const { TL, theta, alpha } = raw;
      if (theta < 0 || theta > 90 || alpha < 0 || alpha > 90) {
        return makeError(mode, 'Angles θ and α must be between 0° and 90°.');
      }
      if (alpha < theta - 1e-4) {
        return makeError(mode, `Apparent angle α (${alpha}°) cannot be smaller than true inclination θ (${theta}°).`);
      }
      if (alpha < 0.01 && theta < 0.01) {
        return makeError(mode, 'When both θ = 0° and α = 0°, φ cannot be uniquely determined from TL alone.');
      }
      dy = sY * TL * Math.sin(theta * DEG2RAD);
      const fvl = Math.abs(dy) / Math.sin(alpha * DEG2RAD);
      dx = sX * fvl * Math.cos(alpha * DEG2RAD);
      dz = sZ * Math.sqrt(Math.max(0, TL * TL - dx * dx - dy * dy));
      break;
    }

    case 'tl_phi_beta': {
      const { TL, phi, beta } = raw;
      if (phi < 0 || phi > 90 || beta < 0 || beta > 90) {
        return makeError(mode, 'Angles φ and β must be between 0° and 90°.');
      }
      if (beta < phi - 1e-4) {
        return makeError(mode, `Apparent angle β (${beta}°) cannot be smaller than true inclination φ (${phi}°).`);
      }
      if (beta < 0.01 && phi < 0.01) {
        return makeError(mode, 'When both φ = 0° and β = 0°, θ cannot be uniquely determined from TL alone.');
      }
      dz = sZ * TL * Math.sin(phi * DEG2RAD);
      const tvl = Math.abs(dz) / Math.sin(beta * DEG2RAD);
      dx = sX * tvl * Math.cos(beta * DEG2RAD);
      dy = sY * Math.sqrt(Math.max(0, TL * TL - dx * dx - dz * dz));
      break;
    }

    case 'hb_db_theta': {
      const { hB, dB, theta } = raw;
      dy = hB - hA;
      dz = dB - dA;
      if (theta <= 0 || theta > 90) {
        return makeError(mode, 'True inclination θ must be in (0°, 90°] when solving from hB, dB, and θ.');
      }
      if (Math.abs(dy) < EPS) {
        return makeError(mode, 'hB equals hA so Δh = 0; θ cannot be positive.');
      }
      const tl = Math.abs(dy) / Math.sin(theta * DEG2RAD);
      if (dy * dy + dz * dz > tl * tl + 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: |dB − dA| = ${Math.abs(dz).toFixed(1)} mm exceeds TVL = ${(tl * Math.cos(theta * DEG2RAD)).toFixed(1)} mm.`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, tl * tl - dy * dy - dz * dz));
      break;
    }

    case 'hb_db_phi': {
      const { hB, dB, phi } = raw;
      dy = hB - hA;
      dz = dB - dA;
      if (phi <= 0 || phi > 90) {
        return makeError(mode, 'True inclination φ must be in (0°, 90°] when solving from hB, dB, and φ.');
      }
      if (Math.abs(dz) < EPS) {
        return makeError(mode, 'dB equals dA so Δd = 0; φ cannot be positive.');
      }
      const tl = Math.abs(dz) / Math.sin(phi * DEG2RAD);
      if (dy * dy + dz * dz > tl * tl + 1e-4) {
        return makeError(
          mode,
          `Impossible geometry: |hB − hA| = ${Math.abs(dy).toFixed(1)} mm exceeds FVL = ${(tl * Math.cos(phi * DEG2RAD)).toFixed(1)} mm.`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, tl * tl - dy * dy - dz * dz));
      break;
    }

    case 'fvl_tvl_p': {
      const { FVL, TVL, projectorDistance } = raw;
      if (FVL <= 0 || TVL <= 0) return makeError(mode, 'Front View and Top View lengths must be positive.');
      if (projectorDistance < 0) return makeError(mode, 'Projector distance p cannot be negative.');
      if (projectorDistance > FVL + 1e-4 || projectorDistance > TVL + 1e-4) {
        return makeError(mode, `Projector distance p (${projectorDistance} mm) cannot exceed Front View (${FVL} mm) or Top View (${TVL} mm) lengths.`);
      }
      dx = sX * projectorDistance;
      dy = sY * Math.sqrt(Math.max(0, FVL * FVL - projectorDistance * projectorDistance));
      dz = sZ * Math.sqrt(Math.max(0, TVL * TVL - projectorDistance * projectorDistance));
      break;
    }

    case 'fvl_tvl_hb': {
      const { FVL, TVL, hB } = raw;
      if (FVL <= 0 || TVL <= 0) return makeError(mode, 'View lengths must be positive.');
      dy = hB - hA;
      if (Math.abs(dy) > FVL + 1e-4) {
        return makeError(mode, `|hB − hA| (${Math.abs(dy).toFixed(1)} mm) cannot exceed Front View length (${FVL} mm).`);
      }
      const p = Math.sqrt(Math.max(0, FVL * FVL - dy * dy));
      if (p > TVL + 1e-4) {
        return makeError(mode, `Derived projector gap p (${p.toFixed(1)} mm) exceeds Top View length (${TVL} mm).`);
      }
      dx = sX * p;
      dz = sZ * Math.sqrt(Math.max(0, TVL * TVL - p * p));
      break;
    }

    case 'fvl_tvl_db': {
      const { FVL, TVL, dB } = raw;
      if (FVL <= 0 || TVL <= 0) return makeError(mode, 'View lengths must be positive.');
      dz = dB - dA;
      if (Math.abs(dz) > TVL + 1e-4) {
        return makeError(mode, `|dB − dA| (${Math.abs(dz).toFixed(1)} mm) cannot exceed Top View length (${TVL} mm).`);
      }
      const p = Math.sqrt(Math.max(0, TVL * TVL - dz * dz));
      if (p > FVL + 1e-4) {
        return makeError(mode, `Derived projector gap p (${p.toFixed(1)} mm) exceeds Front View length (${FVL} mm).`);
      }
      dx = sX * p;
      dy = sY * Math.sqrt(Math.max(0, FVL * FVL - p * p));
      break;
    }

    case 'fvl_hb_db': {
      const { FVL, hB, dB } = raw;
      if (FVL <= 0) return makeError(mode, 'Front View length must be positive.');
      dy = hB - hA;
      dz = dB - dA;
      if (Math.abs(dy) > FVL + 1e-4) {
        return makeError(mode, `|hB − hA| (${Math.abs(dy).toFixed(1)} mm) cannot exceed Front View length (${FVL} mm).`);
      }
      dx = sX * Math.sqrt(Math.max(0, FVL * FVL - dy * dy));
      break;
    }

    case 'tvl_hb_db': {
      const { TVL, hB, dB } = raw;
      if (TVL <= 0) return makeError(mode, 'Top View length must be positive.');
      dy = hB - hA;
      dz = dB - dA;
      if (Math.abs(dz) > TVL + 1e-4) {
        return makeError(mode, `|dB − dA| (${Math.abs(dz).toFixed(1)} mm) cannot exceed Top View length (${TVL} mm).`);
      }
      dx = sX * Math.sqrt(Math.max(0, TVL * TVL - dz * dz));
      break;
    }

    case 'fvl_alpha_beta': {
      const { FVL, alpha, beta } = raw;
      if (FVL <= 0) return makeError(mode, 'Front View length must be positive.');
      if (alpha < 0 || alpha >= 90 || beta < 0 || beta >= 90) {
        return makeError(mode, 'Apparent angles α and β must be in [0°, 90°) for this mode.');
      }
      dx = sX * FVL * Math.cos(alpha * DEG2RAD);
      dy = sY * FVL * Math.sin(alpha * DEG2RAD);
      dz = sZ * Math.abs(dx) * Math.tan(beta * DEG2RAD);
      break;
    }

    case 'tvl_beta_alpha': {
      const { TVL, alpha, beta } = raw;
      if (TVL <= 0) return makeError(mode, 'Top View length must be positive.');
      if (alpha < 0 || alpha >= 90 || beta < 0 || beta >= 90) {
        return makeError(mode, 'Apparent angles α and β must be in [0°, 90°) for this mode.');
      }
      dx = sX * TVL * Math.cos(beta * DEG2RAD);
      dz = sZ * TVL * Math.sin(beta * DEG2RAD);
      dy = sY * Math.abs(dx) * Math.tan(alpha * DEG2RAD);
      break;
    }

    case 'alpha_beta_p': {
      const { alpha, beta, projectorDistance } = raw;
      if (projectorDistance <= 0) return makeError(mode, 'Projector distance p must be greater than 0 mm.');
      if (alpha < 0 || alpha >= 90 || beta < 0 || beta >= 90) {
        return makeError(mode, 'Apparent angles α and β must be less than 90° when p > 0.');
      }
      dx = sX * projectorDistance;
      dy = sY * projectorDistance * Math.tan(alpha * DEG2RAD);
      dz = sZ * projectorDistance * Math.tan(beta * DEG2RAD);
      break;
    }

    case 'fvl_tvl_alpha': {
      const { FVL, TVL, alpha } = raw;
      if (FVL <= 0 || TVL <= 0) return makeError(mode, 'View lengths must be positive.');
      if (alpha < 0 || alpha > 90) return makeError(mode, 'Angle α must be between 0° and 90°.');
      const p = FVL * Math.cos(alpha * DEG2RAD);
      if (p > TVL + 1e-4) {
        return makeError(mode, `Horizontal projector span FVL·cos(α) = ${p.toFixed(1)} mm cannot exceed TVL (${TVL} mm).`);
      }
      dx = sX * p;
      dy = sY * FVL * Math.sin(alpha * DEG2RAD);
      dz = sZ * Math.sqrt(Math.max(0, TVL * TVL - p * p));
      break;
    }

    case 'fvl_tvl_beta': {
      const { FVL, TVL, beta } = raw;
      if (FVL <= 0 || TVL <= 0) return makeError(mode, 'View lengths must be positive.');
      if (beta < 0 || beta > 90) return makeError(mode, 'Angle β must be between 0° and 90°.');
      const p = TVL * Math.cos(beta * DEG2RAD);
      if (p > FVL + 1e-4) {
        return makeError(mode, `Horizontal projector span TVL·cos(β) = ${p.toFixed(1)} mm cannot exceed FVL (${FVL} mm).`);
      }
      dx = sX * p;
      dz = sZ * TVL * Math.sin(beta * DEG2RAD);
      dy = sY * Math.sqrt(Math.max(0, FVL * FVL - p * p));
      break;
    }

    case 'fvl_alpha_tl': {
      const { FVL, alpha, TL } = raw;
      if (FVL <= 0) return makeError(mode, 'Front View length must be positive.');
      if (FVL > TL + 1e-4) {
        return makeError(mode, `Front View length (${FVL} mm) cannot exceed True Length (${TL} mm).`);
      }
      if (alpha < 0 || alpha > 90) return makeError(mode, 'Angle α must be between 0° and 90°.');
      dx = sX * FVL * Math.cos(alpha * DEG2RAD);
      dy = sY * FVL * Math.sin(alpha * DEG2RAD);
      dz = sZ * Math.sqrt(Math.max(0, TL * TL - FVL * FVL));
      break;
    }

    case 'fvl_alpha_theta': {
      const { FVL, alpha, theta } = raw;
      if (FVL <= 0) return makeError(mode, 'Front View length must be positive.');
      if (alpha < 0 || alpha > 90 || theta <= 0 || theta > 90) {
        return makeError(mode, 'Angle θ must be in (0°, 90°] and α in [0°, 90°].');
      }
      if (theta > alpha + 1e-4) {
        return makeError(mode, `True angle θ (${theta}°) cannot exceed Front View angle α (${alpha}°).`);
      }
      dx = sX * FVL * Math.cos(alpha * DEG2RAD);
      dy = sY * FVL * Math.sin(alpha * DEG2RAD);
      const tl = Math.abs(dy) / Math.sin(theta * DEG2RAD);
      dz = sZ * Math.sqrt(Math.max(0, tl * tl - FVL * FVL));
      break;
    }

    case 'fvl_alpha_phi': {
      const { FVL, alpha, phi } = raw;
      if (FVL <= 0) return makeError(mode, 'Front View length must be positive.');
      if (alpha < 0 || alpha > 90 || phi < 0 || phi >= 90) {
        return makeError(mode, 'Angle α must be in [0°, 90°] and φ in [0°, 90°).');
      }
      dx = sX * FVL * Math.cos(alpha * DEG2RAD);
      dy = sY * FVL * Math.sin(alpha * DEG2RAD);
      dz = sZ * FVL * Math.tan(phi * DEG2RAD);
      break;
    }

    case 'tvl_beta_tl': {
      const { TVL, beta, TL } = raw;
      if (TVL <= 0) return makeError(mode, 'Top View length must be positive.');
      if (TVL > TL + 1e-4) {
        return makeError(mode, `Top View length (${TVL} mm) cannot exceed True Length (${TL} mm).`);
      }
      if (beta < 0 || beta > 90) return makeError(mode, 'Angle β must be between 0° and 90°.');
      dx = sX * TVL * Math.cos(beta * DEG2RAD);
      dz = sZ * TVL * Math.sin(beta * DEG2RAD);
      dy = sY * Math.sqrt(Math.max(0, TL * TL - TVL * TVL));
      break;
    }

    case 'tvl_beta_theta': {
      const { TVL, beta, theta } = raw;
      if (TVL <= 0) return makeError(mode, 'Top View length must be positive.');
      if (beta < 0 || beta > 90 || theta < 0 || theta >= 90) {
        return makeError(mode, 'Angle β must be in [0°, 90°] and θ in [0°, 90°).');
      }
      dx = sX * TVL * Math.cos(beta * DEG2RAD);
      dz = sZ * TVL * Math.sin(beta * DEG2RAD);
      dy = sY * TVL * Math.tan(theta * DEG2RAD);
      break;
    }

    case 'tvl_beta_phi': {
      const { TVL, beta, phi } = raw;
      if (TVL <= 0) return makeError(mode, 'Top View length must be positive.');
      if (beta < 0 || beta > 90 || phi <= 0 || phi > 90) {
        return makeError(mode, 'Angle φ must be in (0°, 90°] and β in [0°, 90°].');
      }
      if (phi > beta + 1e-4) {
        return makeError(mode, `True angle φ (${phi}°) cannot exceed Top View angle β (${beta}°).`);
      }
      dx = sX * TVL * Math.cos(beta * DEG2RAD);
      dz = sZ * TVL * Math.sin(beta * DEG2RAD);
      const tl = Math.abs(dz) / Math.sin(phi * DEG2RAD);
      dy = sY * Math.sqrt(Math.max(0, tl * tl - TVL * TVL));
      break;
    }

    case 'traces_ht_vt_ab': {
      const { dHT, hVT, traceProjectorDistance, hB } = raw;
      if (Math.abs(hVT) < 0.1) {
        return makeError(mode, 'VT height (hVT) cannot be 0 when solving from HT & VT heights (otherwise line lies in HP).');
      }
      if (Math.abs(traceProjectorDistance) < 0.01 && Math.abs(dHT) < 0.01) {
        return makeError(mode, 'HT and VT cannot coincide at the XY line.');
      }
      const deltaX = (raw.bRightOfA ? 1 : -1) * Math.abs(traceProjectorDistance);
      const sA = hA / hVT;
      const sB = hB / hVT;
      dA = dHT * (1 - sA);
      const dB_calc = dHT * (1 - sB);
      dx = (sB - sA) * deltaX;
      dy = hB - hA;
      dz = dB_calc - dA;
      if (Math.hypot(dx, dy, dz) < EPS) {
        return makeError(mode, 'hA and hB are equal, resulting in a zero-length segment.');
      }
      break;
    }

    case 'traces_ht_vt_a_tl': {
      const { dHT, hVT, traceProjectorDistance, TL } = raw;
      if (Math.abs(hVT) < 0.1) {
        return makeError(mode, 'VT height (hVT) cannot be 0 when locating end A by height hA.');
      }
      const deltaX = (raw.bRightOfA ? 1 : -1) * Math.abs(traceProjectorDistance);
      const dirVecLen = Math.hypot(deltaX, hVT, -dHT);
      if (dirVecLen < EPS) return makeError(mode, 'HT and VT coincide.');
      const sA = hA / hVT;
      dA = dHT * (1 - sA);
      const signU = sY * hVT >= 0 ? 1 : -1;
      dx = signU * TL * (deltaX / dirVecLen);
      dy = signU * TL * (hVT / dirVecLen);
      dz = signU * TL * (-dHT / dirVecLen);
      break;
    }

    case 'traces_a_vt_tl_theta': {
      const { hVT, TL, theta } = raw;
      if (theta <= 0 || theta > 90) {
        return makeError(mode, 'θ must be greater than 0° so the line intersects VP/HP consistently.');
      }
      dy = sY * TL * Math.sin(theta * DEG2RAD);
      if (Math.abs(hVT - hA) < 0.01) {
        if (Math.abs(dA) > 0.01) {
          return makeError(mode, 'If VT height equals hA, then end A itself must lie in VP (dA = 0).');
        }
        dz = 0;
      } else {
        const tVT = (hVT - hA) / dy;
        if (Math.abs(tVT) < 1e-4) {
          return makeError(mode, 'Invalid VT height relative to A and θ.');
        }
        dz = -dA / tVT;
      }
      const maxDz = TL * Math.cos(theta * DEG2RAD);
      if (Math.abs(dz) > maxDz + 1e-4) {
        return makeError(
          mode,
          `Impossible VT height (${hVT} mm): required depth change |Δd| = ${Math.abs(dz).toFixed(1)} mm exceeds TVL = ${maxDz.toFixed(1)} mm.`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, maxDz * maxDz - dz * dz));
      break;
    }

    case 'traces_a_vt_tl_phi': {
      const { hVT, TL, phi } = raw;
      if (phi <= 0 || phi > 90) {
        return makeError(mode, 'φ must be greater than 0° so the line intersects VP (VT exists).');
      }
      dz = sZ * TL * Math.sin(phi * DEG2RAD);
      if (Math.abs(dA) < 0.01) {
        if (Math.abs(hVT - hA) > 0.01) {
          return makeError(mode, 'Since end A lies in VP (dA = 0), VT height must equal hA.');
        }
        dy = 0;
      } else {
        const tVT = -dA / dz;
        dy = (hVT - hA) / tVT;
      }
      const maxDy = TL * Math.cos(phi * DEG2RAD);
      if (Math.abs(dy) > maxDy + 1e-4) {
        return makeError(
          mode,
          `Impossible VT height (${hVT} mm): required height change |Δh| = ${Math.abs(dy).toFixed(1)} mm exceeds FVL = ${maxDy.toFixed(1)} mm.`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, maxDy * maxDy - dy * dy));
      break;
    }

    case 'traces_a_ht_tl_theta': {
      const { dHT, TL, theta } = raw;
      if (theta <= 0 || theta > 90) {
        return makeError(mode, 'θ must be greater than 0° so the line intersects HP (HT exists).');
      }
      dy = sY * TL * Math.sin(theta * DEG2RAD);
      if (Math.abs(hA) < 0.01) {
        if (Math.abs(dHT - dA) > 0.01) {
          return makeError(mode, 'Since end A lies in HP (hA = 0), HT depth must equal dA.');
        }
        dz = 0;
      } else {
        const tHT = -hA / dy;
        dz = (dHT - dA) / tHT;
      }
      const maxDz = TL * Math.cos(theta * DEG2RAD);
      if (Math.abs(dz) > maxDz + 1e-4) {
        return makeError(
          mode,
          `Impossible HT depth (${dHT} mm): required depth change |Δd| = ${Math.abs(dz).toFixed(1)} mm exceeds TVL = ${maxDz.toFixed(1)} mm.`
        );
      }
      dx = sX * Math.sqrt(Math.max(0, maxDz * maxDz - dz * dz));
      break;
    }

    case 'midpoint_tl_theta_phi': {
      const { hM, dM, TL, theta, phi } = raw;
      if (theta < 0 || theta > 90 || phi < 0 || phi > 90) {
        return makeError(mode, 'True inclinations θ and φ must be between 0° and 90°.');
      }
      if (theta + phi > 90 + 1e-4) {
        return makeError(mode, `Impossible geometry: θ + φ = ${(theta + phi).toFixed(1)}° exceeds 90°.`);
      }
      dy = sY * TL * Math.sin(theta * DEG2RAD);
      dz = sZ * TL * Math.sin(phi * DEG2RAD);
      dx = sX * Math.sqrt(Math.max(0, TL * TL - dy * dy - dz * dz));
      hA = hM - dy / 2;
      dA = dM - dz / 2;
      break;
    }

    case 'midpoint_fvl_tvl_p': {
      const { hM, dM, FVL, TVL, projectorDistance } = raw;
      if (FVL <= 0 || TVL <= 0) return makeError(mode, 'Front View and Top View lengths must be positive.');
      if (projectorDistance < 0 || projectorDistance > FVL + 1e-4 || projectorDistance > TVL + 1e-4) {
        return makeError(mode, 'Projector distance p must be in [0, min(FVL, TVL)].');
      }
      dx = sX * projectorDistance;
      dy = sY * Math.sqrt(Math.max(0, FVL * FVL - projectorDistance * projectorDistance));
      dz = sZ * Math.sqrt(Math.max(0, TVL * TVL - projectorDistance * projectorDistance));
      hA = hM - dy / 2;
      dA = dM - dz / 2;
      break;
    }
  }

  const hB = hA + dy;
  const dB = dA + dz;
  const TL = Math.hypot(dx, dy, dz);
  if (TL < EPS) {
    return makeError(mode, 'Degenerate line with zero True Length.');
  }

  const FVL = Math.hypot(dx, dy);
  const TVL = Math.hypot(dx, dz);
  const theta = Math.asin(Math.min(1, Math.abs(dy) / TL)) * RAD2DEG;
  const phi = Math.asin(Math.min(1, Math.abs(dz) / TL)) * RAD2DEG;
  const alpha = FVL < EPS ? 0 : Math.atan2(Math.abs(dy), Math.abs(dx)) * RAD2DEG;
  const beta = TVL < EPS ? 0 : Math.atan2(Math.abs(dz), Math.abs(dx)) * RAD2DEG;
  const projectorDistance = Math.abs(dx);

  const A3D: Point3D = { x: 0, y: hA, z: dA };
  const B3D: Point3D = { x: dx, y: hB, z: dB };
  const M3D: Point3D = { x: dx / 2, y: (hA + hB) / 2, z: (dA + dB) / 2 };

  const aPrime: Point2D = { x: 0, y: hA };
  const a: Point2D = { x: 0, y: -dA };
  const bPrime: Point2D = { x: dx, y: hB };
  const b: Point2D = { x: dx, y: -dB };

  const rotSign = dx >= 0 ? 1 : -1;
  const b1Prime: Point2D = { x: rotSign * TVL, y: hB };
  const b1: Point2D = { x: rotSign * TVL, y: -dA };
  const b2: Point2D = { x: rotSign * FVL, y: -dB };
  const b2Prime: Point2D = { x: rotSign * FVL, y: hA };

  let HT: TraceInfo;
  if (Math.abs(dy) < 1e-4) {
    HT = {
      exists: false,
      reason: 'Line is parallel to HP (θ = 0°), so it has no Horizontal Trace (HT).',
      distanceFromXY: null,
      positionLabel: 'No HT (Parallel to HP)',
    };
  } else {
    const tHT = -hA / dy;
    const xHT = tHT * dx;
    const zHT = dA + tHT * dz;
    HT = {
      exists: true,
      point3D: { x: xHT, y: 0, z: zHT },
      xyProjectorPoint: { x: xHT, y: 0 },
      tracePoint2D: { x: xHT, y: -zHT },
      distanceFromXY: zHT,
      positionLabel: formatSignedPosition(zHT, 'in front of VP', 'behind VP', 'on XY (in VP)'),
    };
  }

  let VT: TraceInfo;
  if (Math.abs(dz) < 1e-4) {
    VT = {
      exists: false,
      reason: 'Line is parallel to VP (φ = 0°), so it has no Vertical Trace (VT).',
      distanceFromXY: null,
      positionLabel: 'No VT (Parallel to VP)',
    };
  } else {
    const tVT = -dA / dz;
    const xVT = tVT * dx;
    const yVT = hA + tVT * dy;
    VT = {
      exists: true,
      point3D: { x: xVT, y: yVT, z: 0 },
      xyProjectorPoint: { x: xVT, y: 0 },
      tracePoint2D: { x: xVT, y: yVT },
      distanceFromXY: yVT,
      positionLabel: formatSignedPosition(yVT, 'above HP', 'below HP', 'on XY (in HP)'),
    };
  }

  const distanceBetweenTracesProjectors =
    HT.exists && VT.exists && HT.point3D && VT.point3D
      ? Math.abs(VT.point3D.x - HT.point3D.x)
      : null;

  const trueDistanceBetweenTraces =
    HT.exists && VT.exists && HT.point3D && VT.point3D
      ? Math.hypot(
          VT.point3D.x - HT.point3D.x,
          VT.point3D.y - HT.point3D.y,
          VT.point3D.z - HT.point3D.z
        )
      : null;

  const solution: SolvedLineProjection = {
    valid: true,
    warnings,
    mode,
    A3D,
    B3D,
    M3D,
    TL,
    theta,
    phi,
    FVL,
    TVL,
    alpha,
    beta,
    projectorDistance,
    dx,
    dy,
    dz,
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
    distanceBetweenTracesProjectors,
    trueDistanceBetweenTraces,
    quadrantA: classifyQuadrant(hA, dA),
    quadrantB: classifyQuadrant(hB, dB),
    tutorialSteps: [],
  };

  solution.tutorialSteps = buildConstructionSteps(solution);
  return solution;
}

function buildConstructionSteps(sol: SolvedLineProjection): ConstructionStep[] {
  const { A3D, B3D, M3D, TL, theta, phi, FVL, TVL, alpha, beta, HT, VT, mode } = sol;

  const isTraceStart = mode === 'traces_ht_vt_ab' || mode === 'traces_ht_vt_a_tl';
  const isTlFvlTvl = mode === 'tl_fvl_tvl';
  const isMidpoint = mode.startsWith('midpoint_');
  const isViewsStart = [
    'endpoints_p',
    'fvl_tvl_p',
    'fvl_tvl_hb',
    'fvl_tvl_db',
    'fvl_hb_db',
    'tvl_hb_db',
    'fvl_alpha_beta',
    'tvl_beta_alpha',
    'alpha_beta_p',
    'fvl_tvl_alpha',
    'fvl_tvl_beta',
    'fvl_alpha_tl',
    'fvl_alpha_theta',
    'fvl_alpha_phi',
    'tvl_beta_tl',
    'tvl_beta_theta',
    'tvl_beta_phi',
  ].includes(mode);

  const step1: ConstructionStep = {
    stepNumber: 1,
    title: isTraceStart
      ? 'Plot HT, VT & Locate End A'
      : isMidpoint
        ? 'Draw XY & Locate Midpoint M (and End A)'
        : 'Draw Reference Line XY & Locate End A',
    actionSummary: isTraceStart
      ? `Plot the Horizontal Trace (HT) and Vertical Trace (VT) separated by ${sol.distanceBetweenTracesProjectors?.toFixed(1) ?? '0'} mm, then locate End A.`
      : isMidpoint
        ? `Establish XY, plot midpoint M at (${M3D.y.toFixed(1)} mm wrt HP, ${M3D.z.toFixed(1)} mm wrt VP), and determine End A at (${A3D.y.toFixed(1)} mm, ${A3D.z.toFixed(1)} mm).`
        : `Establish the XY ground line separating VP (above) and HP (below) in First Angle Projection, then plot a' and a.`,
    draftingInstruction: isTraceStart
      ? `Draw XY. Mark h' and v separated by ${sol.distanceBetweenTracesProjectors?.toFixed(1) ?? '0'} mm. Mark HT (h) at ${HT.positionLabel} and VT (v') at ${VT.positionLabel}. Join h'v' (line of Front View) and hv (line of Top View), then locate a' at height ${A3D.y.toFixed(1)} mm and project vertically to a.`
      : `Draw a thin horizontal reference line XY. Draw a vertical projector at A. Mark front view a' at ${formatSignedPosition(A3D.y, 'above XY', 'below XY', 'on XY')} and top view a at ${formatSignedPosition(A3D.z, 'below XY', 'above XY', 'on XY')}.`,
    formulaUsed: `a' = (0, ${A3D.y.toFixed(1)}), a = (0, ${(-A3D.z).toFixed(1)})`,
    highlightEntities: ['xy', 'endA'],
  };

  if (isTlFvlTvl) {
    return [
      step1,
      {
        stepNumber: 2,
        title: 'Mark Horizontal Auxiliary Lengths ab₁ = TVL & a′b₂′ = FVL',
        actionSummary: `Place the given Top View length (${TVL.toFixed(1)} mm) and Front View length (${FVL.toFixed(1)} mm) parallel to XY from a and a'.`,
        draftingInstruction: `Along the horizontal line through a, mark ab₁ = ${TVL.toFixed(1)} mm and draw a vertical projector upward through b₁. Along the horizontal line through a', mark a'b₂' = ${FVL.toFixed(1)} mm and draw a vertical projector downward through b₂'.`,
        formulaUsed: `ab₁ = TVL = ${TVL.toFixed(1)} mm, a'b₂' = FVL = ${FVL.toFixed(1)} mm`,
        highlightEntities: ['xy', 'endA'],
      },
      {
        stepNumber: 3,
        title: 'Cut Projectors with True Length Arcs to Find Loci & θ, φ',
        actionSummary: `Use True Length (${TL.toFixed(1)} mm) as compass radius to intersect the vertical projectors from b₁ and b₂', revealing θ and φ.`,
        draftingInstruction: `With center a' and radius TL = ${TL.toFixed(1)} mm, cut the projector from b₁ at b₁'. Join a'b₁' (θ = ${theta.toFixed(1)}°) and draw Locus of b'. With center a and radius TL = ${TL.toFixed(1)} mm, cut the projector from b₂' at b₂. Join ab₂ (φ = ${phi.toFixed(1)}°) and draw Locus of b.`,
        formulaUsed: `θ = arccos(TVL/TL) = ${theta.toFixed(2)}°, φ = arccos(FVL/TL) = ${phi.toFixed(2)}°`,
        highlightEntities: ['xy', 'endA', 'auxTheta', 'auxPhi', 'loci'],
        checkpoint: {
          question: `Why does cutting the vertical projector from b₁ with radius TL locate b₁' and give true angle θ?`,
          options: [
            `Because ab₁ is parallel to VP, so the elevation a'b₁' shows True Length and θ`,
            `Because b₁' always lies on XY`,
            `Because FVL equals TL when rotated`,
          ],
          correctIndex: 0,
          explanation: `When the top view length TVL lies horizontal (ab₁ ∥ XY), the line is parallel to VP, so its front view equals TL at true inclination θ to HP.`,
        },
      },
      {
        stepNumber: 4,
        title: 'Swing FVL & TVL Arcs onto Loci to Get a′b′ & ab',
        actionSummary: `Rotate a'b₂' onto the Locus of b' and ab₁ onto the Locus of b to obtain the final orthographic projections.`,
        draftingInstruction: `With center a' and radius a'b₂' (${FVL.toFixed(1)} mm), swing an arc onto the Locus of b' to locate b'. Join a'b' (α = ${alpha.toFixed(1)}°). With center a and radius ab₁ (${TVL.toFixed(1)} mm), swing an arc onto the Locus of b to locate b. Join ab (β = ${beta.toFixed(1)}°). Verify b'b is vertical (p = ${sol.projectorDistance.toFixed(1)} mm).`,
        formulaUsed: `α = ${alpha.toFixed(2)}°, β = ${beta.toFixed(2)}°, p = ${sol.projectorDistance.toFixed(2)} mm`,
        highlightEntities: ['xy', 'endA', 'auxTheta', 'auxPhi', 'loci', 'arcFV', 'arcTV', 'finalViews', 'projectorB'],
      },
      {
        stepNumber: 5,
        title: 'Determine Horizontal Trace (HT) & Vertical Trace (VT)',
        actionSummary: `Extend a'b' and ab to XY and project perpendicularly to mark HT and VT.`,
        draftingInstruction: HT.exists || VT.exists
          ? `${HT.exists ? `Extend a'b' to meet XY at h', then drop a vertical projector to meet extended ab at HT (${HT.positionLabel}). ` : ''}${VT.exists ? `Extend ab to meet XY at v, then project vertically to meet extended a'b' at VT (${VT.positionLabel}).` : ''}`
          : `Line is parallel to both planes; no HT or VT exists.`,
        formulaUsed: `HT: ${HT.positionLabel} · VT: ${VT.positionLabel}`,
        highlightEntities: ['xy', 'endA', 'auxTheta', 'auxPhi', 'loci', 'arcFV', 'arcTV', 'finalViews', 'projectorB', 'traces'],
      },
    ];
  }

  if (isViewsStart || isTraceStart) {
    return [
      step1,
      {
        stepNumber: 2,
        title: 'Construct Final Front View (a′b′) & Top View (ab)',
        actionSummary: isTraceStart
          ? `Locate b' and b along the trace lines h'v' and hv at projector gap p = ${sol.projectorDistance.toFixed(1)} mm.`
          : `Plot b' and b from the given apparent views/coordinates on a single vertical end projector at p = ${sol.projectorDistance.toFixed(1)} mm.`,
        draftingInstruction: `Plot b' at projector distance p = ${sol.projectorDistance.toFixed(1)} mm and height ${B3D.y.toFixed(1)} mm; join a'b' (FVL = ${FVL.toFixed(1)} mm, α = ${alpha.toFixed(1)}°). Plot b on the same vertical projector at depth ${B3D.z.toFixed(1)} mm; join ab (TVL = ${TVL.toFixed(1)} mm, β = ${beta.toFixed(1)}°). Draw horizontal loci through b' and b.`,
        formulaUsed: `FVL = ${FVL.toFixed(2)} mm (α = ${alpha.toFixed(1)}°), TVL = ${TVL.toFixed(2)} mm (β = ${beta.toFixed(1)}°)`,
        highlightEntities: ['xy', 'endA', 'finalViews', 'loci', 'projectorB'],
      },
      {
        stepNumber: 3,
        title: 'Rotate Top View (ab → ab₁) to Find True Length & θ',
        actionSummary: `Swing top view ab parallel to XY to make the line parallel to VP in space, revealing True Length and θ in elevation.`,
        draftingInstruction: `With center a and radius ab (${TVL.toFixed(1)} mm), swing an arc onto the horizontal line through a to locate b₁. Project b₁ vertically upward to intersect the Locus of b' at b₁'. Join a'b₁' — its length is True Length (${TL.toFixed(1)} mm) and its angle with XY is θ = ${theta.toFixed(1)}°.`,
        formulaUsed: `TL = √(TVL² + Δh²) = ${TL.toFixed(2)} mm, θ = ${theta.toFixed(2)}°`,
        highlightEntities: ['xy', 'endA', 'finalViews', 'loci', 'projectorB', 'auxTheta', 'arcTV'],
        checkpoint: {
          question: `When rotating top view ab onto the horizontal line through a (getting b₁), which true quantity does a'b₁' show?`,
          options: [
            `True Length (TL) and true inclination θ with HP`,
            `True Length (TL) and true inclination φ with VP`,
            `Only the apparent angle α`,
          ],
          correctIndex: 0,
          explanation: `Making ab₁ horizontal makes the line parallel to VP in 3D space, so its front view a'b₁' shows both True Length and true inclination θ with HP.`,
        },
      },
      {
        stepNumber: 4,
        title: 'Rotate Front View (a′b′ → a′b₂′) to Find True Length & φ',
        actionSummary: `Swing front view a'b' parallel to XY to make the line parallel to HP, revealing True Length and φ in plan.`,
        draftingInstruction: `With center a' and radius a'b' (${FVL.toFixed(1)} mm), swing an arc onto the horizontal line through a' to locate b₂'. Project b₂' vertically downward to intersect the Locus of b at b₂. Join ab₂ — its length equals True Length (${TL.toFixed(1)} mm) and its angle with XY is φ = ${phi.toFixed(1)}°.`,
        formulaUsed: `φ = arcsin(|Δd|/TL) = ${phi.toFixed(2)}°`,
        highlightEntities: ['xy', 'endA', 'finalViews', 'loci', 'projectorB', 'auxTheta', 'arcTV', 'auxPhi', 'arcFV'],
      },
      {
        stepNumber: 5,
        title: 'Verify Horizontal Trace (HT) & Vertical Trace (VT)',
        actionSummary: `Extend the orthographic views to XY and drop perpendicular projectors to locate where the line pierces HP and VP.`,
        draftingInstruction: HT.exists || VT.exists
          ? `${HT.exists ? `Extend a'b' to meet XY at h', then drop a vertical projector to meet extended ab at HT (${HT.positionLabel}). ` : ''}${VT.exists ? `Extend ab to meet XY at v, then draw a vertical projector to meet extended a'b' at VT (${VT.positionLabel}).` : ''}`
          : `The line is parallel to both planes, so neither HT nor VT exists.`,
        formulaUsed: `HT: ${HT.positionLabel} · VT: ${VT.positionLabel}`,
        highlightEntities: ['xy', 'endA', 'finalViews', 'loci', 'projectorB', 'auxTheta', 'auxPhi', 'arcTV', 'arcFV', 'traces'],
        checkpoint: {
          question: `To locate the Horizontal Trace (HT), which view do we extend first to meet the XY reference line?`,
          options: [
            `Extend the Top View (ab) to XY to get h'`,
            `Extend the Front View (a'b') to XY to get h', then project to ab`,
            `Draw a 45° line from a' to XY`,
          ],
          correctIndex: 1,
          explanation: `A point on HP has zero height (y = 0), so its front view lies on XY. Extending a'b' to XY gives h', and projecting vertically to extended ab locates HT (h).`,
        },
      },
    ];
  }

  return [
    step1,
    {
      stepNumber: 2,
      title: 'Assume Parallel to VP: Draw a′b₁′ at θ & Locus of b′',
      actionSummary: `Temporarily rotate the line parallel to VP so its true length (${TL.toFixed(1)} mm) and inclination θ (${theta.toFixed(1)}°) appear directly in Front View.`,
      draftingInstruction: `From a', draw a'b₁' = ${TL.toFixed(1)} mm inclined at θ = ${theta.toFixed(1)}° (${B3D.y >= A3D.y ? 'upward' : 'downward'}). Draw a horizontal chain line through b₁' — this is the Locus of b' (at height ${B3D.y.toFixed(1)} mm). Project b₁' vertically down to meet the horizontal line through a at b₁ (so ab₁ = TVL = ${TVL.toFixed(1)} mm).`,
      formulaUsed: `TVL = TL · cos(θ) = ${TL.toFixed(1)} · cos(${theta.toFixed(1)}°) = ${TVL.toFixed(2)} mm`,
      highlightEntities: ['xy', 'endA', 'auxTheta'],
    },
    {
      stepNumber: 3,
      title: 'Assume Parallel to HP: Draw ab₂ at φ & Locus of b',
      actionSummary: `Temporarily rotate the line parallel to HP so its true length (${TL.toFixed(1)} mm) and inclination φ (${phi.toFixed(1)}°) appear directly in Top View.`,
      draftingInstruction: `From a, draw ab₂ = ${TL.toFixed(1)} mm inclined at φ = ${phi.toFixed(1)}° (${B3D.z >= A3D.z ? 'downward in front' : 'upward behind'}). Draw a horizontal chain line through b₂ — this is the Locus of b (at depth ${B3D.z.toFixed(1)} mm). Project b₂ vertically up to meet the horizontal line through a' at b₂' (so a'b₂' = FVL = ${FVL.toFixed(1)} mm).`,
      formulaUsed: `FVL = TL · cos(φ) = ${TL.toFixed(1)} · cos(${phi.toFixed(1)}°) = ${FVL.toFixed(2)} mm`,
      highlightEntities: ['xy', 'endA', 'auxTheta', 'auxPhi', 'loci'],
      checkpoint: {
        question: `What is the length a'b₂' obtained by projecting b₂ vertically upward to the horizontal line through a'?`,
        options: [
          `The True Length (TL) = ${TL.toFixed(1)} mm`,
          `The Front View Length (FVL = TL·cos φ) = ${FVL.toFixed(1)} mm`,
          `The Top View Length (TVL = TL·cos θ) = ${TVL.toFixed(1)} mm`,
        ],
        correctIndex: 1,
        explanation: `ab₂ represents the line parallel to HP with true inclination φ to VP, so its projection onto VP (a'b₂') equals the exact Front View Length TL·cos(φ).`,
      },
    },
    {
      stepNumber: 4,
      title: 'Swing Compass Arcs to Locate b′ and b',
      actionSummary: `Swing the foreshortened lengths a'b₂' and ab₁ onto their respective loci to obtain the true orthographic projections.`,
      draftingInstruction: `Set compass center at a' with radius a'b₂' (${FVL.toFixed(1)} mm) and swing an arc to cut the Locus of b' at b'. Join a'b' (apparent angle α = ${alpha.toFixed(1)}°). Set center at a with radius ab₁ (${TVL.toFixed(1)} mm) and swing an arc to cut the Locus of b at b. Join ab (apparent angle β = ${beta.toFixed(1)}°).`,
      formulaUsed: `α = ${alpha.toFixed(2)}°, β = ${beta.toFixed(2)}°`,
      highlightEntities: ['xy', 'endA', 'auxTheta', 'auxPhi', 'loci', 'arcFV', 'arcTV', 'finalViews'],
    },
    {
      stepNumber: 5,
      title: 'Verify Projector Alignment Between b′ and b',
      actionSummary: `Confirm both endpoints b' and b lie on the exact same vertical end projector at distance p = ${sol.projectorDistance.toFixed(1)} mm.`,
      draftingInstruction: `Draw a thin vertical projector connecting b' and b. In accurate manual drafting, b'b must be strictly perpendicular to XY (Δx = ${sol.projectorDistance.toFixed(1)} mm).`,
      formulaUsed: `p = FVL·cos(α) = TVL·cos(β) = ${sol.projectorDistance.toFixed(2)} mm`,
      highlightEntities: ['xy', 'endA', 'auxTheta', 'auxPhi', 'loci', 'arcFV', 'arcTV', 'finalViews', 'projectorB'],
    },
    {
      stepNumber: 6,
      title: 'Locate Horizontal Trace (HT) & Vertical Trace (VT)',
      actionSummary: `Extend the final views to intersect XY and project perpendicularly to mark the piercing points on HP and VP.`,
      draftingInstruction: HT.exists || VT.exists
        ? `${HT.exists ? `Extend Front View a'b' to cut XY at h'. Project vertically from h' to meet extended Top View ab at HT (${HT.positionLabel}). ` : ''}${VT.exists ? `Extend Top View ab to cut XY at v. Project vertically from v to meet extended Front View a'b' at VT (${VT.positionLabel}).` : ''}`
        : `Line is parallel to both planes; no HT or VT exists.`,
      formulaUsed:
        HT.exists && VT.exists
          ? `d_HT = ${HT.distanceFromXY?.toFixed(1)} mm · h_VT = ${VT.distanceFromXY?.toFixed(1)} mm · Trace gap = ${sol.distanceBetweenTracesProjectors?.toFixed(1)} mm`
          : `Trace check complete`,
      highlightEntities: ['xy', 'endA', 'auxTheta', 'auxPhi', 'loci', 'arcFV', 'arcTV', 'finalViews', 'projectorB', 'traces'],
      checkpoint: {
        question: `Why must the Horizontal Trace (HT) lie on the extended Top View (ab)?`,
        options: [
          `Because HT is a point on the line that lies in HP, so its top view coincides with HT itself`,
          `Because HT always lies on the XY reference line`,
          `Because top views are always longer than true length`,
        ],
        correctIndex: 0,
        explanation: `HT is the physical intersection of the line with HP; its top view (plan) IS HT itself, while its front view h' has zero height and lies on XY.`,
      },
    },
  ];
}

export interface PresetProblem {
  id: string;
  title: string;
  difficulty: 'Foundation' | 'Intermediate' | 'Exam Challenge';
  statement: string;
  params: LineInputParams;
}

export const PRESET_PROBLEMS: PresetProblem[] = [
  {
    id: 'classic_1st_quad',
    title: 'Standard Line Inclined to Both Planes',
    difficulty: 'Foundation',
    statement:
      'A line AB 80 mm long has its end A 15 mm above HP and 20 mm in front of VP. It is inclined at 30° to HP and 45° to VP. Draw its projections and locate its traces.',
    params: { ...DEFAULT_INPUT_PARAMS },
  },
  {
    id: 'tl_fvl_tvl_bhatt',
    title: 'True Length with Both Apparent View Lengths',
    difficulty: 'Foundation',
    statement:
      'The top view of a 75 mm long line AB measures 65 mm, while the length of its front view is 50 mm. Its one end A is in HP and 12 mm in front of VP. Draw projections and find θ, φ, HT, and VT.',
    params: {
      ...DEFAULT_INPUT_PARAMS,
      mode: 'tl_fvl_tvl',
      hA: 0,
      dA: 12,
      TL: 75,
      FVL: 50,
      TVL: 65,
    },
  },
  {
    id: 'loci_end_b',
    title: 'End B Distances Given (Double Loci)',
    difficulty: 'Intermediate',
    statement:
      'A line AB 90 mm long is in the first quadrant with end A 15 mm above HP and 25 mm in front of VP. End B is 60 mm above HP and 70 mm in front of VP. Find true inclinations θ, φ and traces.',
    params: {
      ...DEFAULT_INPUT_PARAMS,
      mode: 'tl_hb_db',
      hA: 15,
      dA: 25,
      TL: 90,
      hB: 60,
      dB: 70,
    },
  },
  {
    id: 'trace_reverse',
    title: 'Trace-to-Line Reverse Construction',
    difficulty: 'Exam Challenge',
    statement:
      'The projectors through HT and VT of a line AB are 95 mm apart. HT is 35 mm in front of VP and VT is 55 mm above HP. End A is 15 mm above HP and end B is 45 mm above HP. Determine TL, θ, and φ.',
    params: {
      ...DEFAULT_INPUT_PARAMS,
      mode: 'traces_ht_vt_ab',
      dHT: 35,
      hVT: 55,
      traceProjectorDistance: 95,
      hA: 15,
      hB: 45,
      bAboveA: true,
      bInFrontOfA: false,
      bRightOfA: true,
    },
  },
  {
    id: 'multi_quadrant',
    title: 'Line Crossing HP & VP (Q4 to Q2)',
    difficulty: 'Exam Challenge',
    statement:
      'End A of a line AB is 25 mm below HP and 30 mm in front of VP (4th Quadrant). End B is 45 mm above HP and 35 mm behind VP (2nd Quadrant). Distance between end projectors is 60 mm. Find TL, θ, φ, and both traces.',
    params: {
      ...DEFAULT_INPUT_PARAMS,
      mode: 'endpoints_p',
      hA: -25,
      dA: 30,
      hB: 45,
      dB: -35,
      projectorDistance: 60,
    },
  },
  {
    id: 'midpoint_problem',
    title: 'Midpoint Fixed in First Quadrant',
    difficulty: 'Intermediate',
    statement:
      'The midpoint M of an 84 mm straight line AB is 45 mm above HP and 40 mm in front of VP. The line is inclined at 35° to HP and 40° to VP. Draw its projections and traces.',
    params: {
      ...DEFAULT_INPUT_PARAMS,
      mode: 'midpoint_tl_theta_phi',
      hM: 45,
      dM: 40,
      TL: 84,
      theta: 35,
      phi: 40,
    },
  },
  {
    id: 'apparent_angles_p',
    title: 'Apparent Angles (α, β) & Projector Gap',
    difficulty: 'Intermediate',
    statement:
      'A line AB has its end A 20 mm above HP and 15 mm in front of VP. The front view is inclined at 45° and top view at 35° to XY, with end projectors 50 mm apart. Find True Length and true angles θ, φ.',
    params: {
      ...DEFAULT_INPUT_PARAMS,
      mode: 'alpha_beta_p',
      hA: 20,
      dA: 15,
      alpha: 45,
      beta: 35,
      projectorDistance: 50,
    },
  },
];
