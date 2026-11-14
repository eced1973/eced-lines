import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const ALLOWED_PARAM_NAMES = [
  'hA',
  'dA',
  'hB',
  'dB',
  'hM',
  'dM',
  'TL',
  'theta',
  'phi',
  'FVL',
  'TVL',
  'alpha',
  'beta',
  'projectorDistance',
  'dHT',
  'hVT',
  'traceProjectorDistance',
] as const;

type ParamName = (typeof ALLOWED_PARAM_NAMES)[number];

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcribedText: {
      type: Type.STRING,
      description: 'The exact problem statement transcribed from the image or text.',
    },
    extractedParameters: {
      type: Type.ARRAY,
      description:
        'List EVERY numerical parameter explicitly given in the problem (in mm or degrees with proper sign). Do NOT include parameters that are not stated or asked to be found.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description:
              'Exact parameter name from: hA, dA, hB, dB, hM, dM, TL, theta, phi, FVL, TVL, alpha, beta, projectorDistance, dHT, hVT, traceProjectorDistance',
          },
          value: {
            type: Type.NUMBER,
            description:
              'Signed numerical value in mm (lengths/distances) or degrees (angles). + for above HP / in front of VP; - for below HP / behind VP; 0 for in/on HP or VP.',
          },
        },
        required: ['name', 'value'],
      },
    },
    bAboveA: {
      type: Type.BOOLEAN,
      description:
        'True if end B is above end A (or default 1st quadrant upward); false if B is below A or in 3rd/4th quadrant relative to A.',
    },
    bInFrontOfA: {
      type: Type.BOOLEAN,
      description:
        'True if end B is in front of end A (or default 1st quadrant forward); false if B is behind A or in 2nd/3rd quadrant relative to A.',
    },
    bRightOfA: {
      type: Type.BOOLEAN,
      description: 'True if end B is to the right of end A (default true).',
    },
    notes: {
      type: Type.STRING,
      description:
        'Brief summary of extracted values, unit conversions (e.g. cm to mm), and any directional assumptions.',
    },
  },
  required: ['transcribedText', 'extractedParameters', 'bAboveA', 'bInFrontOfA', 'bRightOfA', 'notes'],
};

const SYSTEM_INSTRUCTION = `You are an expert Engineering Graphics (Descriptive Geometry) Optical Character Recognition & Problem Parser.
Your job is to read textbook screenshots, handwritten assignment photos, or pasted text problems about "Projections and Traces of Straight Lines Inclined to Both Planes" and extract EVERY given numerical parameter accurately.

Parameter mapping rules (convert cm -> mm by *10, m -> mm by *1000):
- hA: Distance of end A (or P) from HP in mm. (+ = "above HP", - = "below HP", 0 = "in HP" / "on HP")
- dA: Distance of end A (or P) from VP in mm. (+ = "in front of VP", - = "behind VP", 0 = "in VP" / "on VP")
- hB: Distance of end B (or Q) from HP in mm. (+ above, - below, 0 in HP)
- dB: Distance of end B (or Q) from VP in mm. (+ in front, - behind, 0 in VP)
- hM, dM: Distances of Midpoint M from HP and VP in mm (only if midpoint is given)
- TL: True length of line AB (e.g. "85 mm long", "true length 80 mm")
- theta: True inclination with HP in degrees ("inclined at X° to HP")
- phi: True inclination with VP in degrees ("inclined at X° to VP")
- FVL: Front view / elevation length in mm ("front view measures", "elevation is X mm")
- TVL: Top view / plan length in mm ("top view measures", "plan is X mm")
- alpha: Apparent inclination of Front View with XY in degrees ("front view makes X° with XY")
- beta: Apparent inclination of Top View with XY in degrees ("top view makes X° with XY")
- projectorDistance: Distance between end projectors of A and B in mm
- dHT: Distance of Horizontal Trace (HT) from VP in mm (+ in front, - behind, 0 on XY)
- hVT: Height of Vertical Trace (VT) from HP in mm (+ above, - below, 0 on XY)
- traceProjectorDistance: Distance between projectors of HT and VT in mm

CRITICAL:
- Extract EVERY numerical value given in the problem into extractedParameters. Never omit a given number like dA or phi!
- Never emit parameters that are NOT given in the problem statement (especially do NOT emit 0 for unmentioned fields like hVT or traceProjectorDistance unless the text explicitly says HT/VT is on XY/HP/VP).
- Note: if the text says "end A is in HP and 12 mm in front of VP", emit BOTH {name: "hA", value: 0} and {name: "dA", value: 12}.`;

function reconcileMode(params: Partial<Record<ParamName, number>>): string {
  const has = (k: ParamName) => typeof params[k] === 'number' && Number.isFinite(params[k]);

  // Midpoint modes
  if (has('hM') || has('dM')) {
    if (has('FVL') && has('TVL') && has('projectorDistance')) return 'midpoint_fvl_tvl_p';
    return 'midpoint_tl_theta_phi';
  }

  // Trace modes
  if (has('dHT') && has('hVT') && has('traceProjectorDistance')) {
    if (has('hB')) return 'traces_ht_vt_ab';
    if (has('TL')) return 'traces_ht_vt_a_tl';
    return 'traces_ht_vt_ab';
  }
  if (has('hVT') && has('TL') && has('theta') && !has('phi') && !has('dHT')) {
    return 'traces_a_vt_tl_theta';
  }
  if (has('hVT') && has('TL') && has('phi') && !has('theta') && !has('dHT')) {
    return 'traces_a_vt_tl_phi';
  }
  if (has('dHT') && has('TL') && has('theta') && !has('phi') && !has('hVT')) {
    return 'traces_a_ht_tl_theta';
  }

  // TL-based modes
  if (has('TL')) {
    if (has('theta') && has('phi')) return 'tl_theta_phi';
    if (has('FVL') && has('TVL')) return 'tl_fvl_tvl';
    if (has('hB') && has('dB')) return 'tl_hb_db';
    if (has('theta') && has('dB')) return 'tl_theta_db';
    if (has('phi') && has('hB')) return 'tl_phi_hb';
    if (has('theta') && has('beta')) return 'tl_theta_beta';
    if (has('phi') && has('alpha')) return 'tl_phi_alpha';
    if (has('theta') && has('alpha')) return 'tl_theta_alpha';
    if (has('phi') && has('beta')) return 'tl_phi_beta';
    if (has('FVL') && has('alpha')) return 'fvl_alpha_tl';
    if (has('TVL') && has('beta')) return 'tvl_beta_tl';
  }

  // Both endpoints + one constraint
  if (has('hB') && has('dB')) {
    if (has('projectorDistance')) return 'endpoints_p';
    if (has('theta')) return 'hb_db_theta';
    if (has('phi')) return 'hb_db_phi';
    if (has('FVL')) return 'fvl_hb_db';
    if (has('TVL')) return 'tvl_hb_db';
    return 'endpoints_p';
  }

  // Projector distance + angles
  if (has('projectorDistance')) {
    if (has('FVL') && has('TVL')) return 'fvl_tvl_p';
    if (has('theta') && has('phi')) return 'p_theta_phi';
    if (has('alpha') && has('beta')) return 'alpha_beta_p';
  }

  // FVL + TVL + one constraint
  if (has('FVL') && has('TVL')) {
    if (has('alpha')) return 'fvl_tvl_alpha';
    if (has('beta')) return 'fvl_tvl_beta';
    if (has('hB')) return 'fvl_tvl_hb';
    if (has('dB')) return 'fvl_tvl_db';
  }

  // FVL + alpha + one constraint
  if (has('FVL') && has('alpha')) {
    if (has('beta')) return 'fvl_alpha_beta';
    if (has('theta')) return 'fvl_alpha_theta';
    if (has('phi')) return 'fvl_alpha_phi';
  }

  // TVL + beta + one constraint
  if (has('TVL') && has('beta')) {
    if (has('alpha')) return 'tvl_beta_alpha';
    if (has('theta')) return 'tvl_beta_theta';
    if (has('phi')) return 'tvl_beta_phi';
  }

  return 'tl_theta_phi';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.post('/api/ocr/extract', async (req, res) => {
    try {
      const { imageBase64, mimeType, rawText } = req.body ?? {};

      if (!imageBase64 && (!rawText || typeof rawText !== 'string' || !rawText.trim())) {
        return res.status(400).json({ error: 'Please provide an image or problem text to extract.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured. Please check your Settings > Secrets panel.',
        });
      }

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanedBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({
          inlineData: {
            mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'image/png',
            data: cleanedBase64,
          },
        });
      }

      parts.push({
        text: rawText?.trim()
          ? `Extract ALL engineering graphics straight-line projection parameters from the following problem${imageBase64 ? ' and attached image' : ''}:\n\n${rawText.trim()}`
          : 'Perform OCR on the attached image of an engineering graphics straight-line projection problem, transcribe the text verbatim, and extract ALL given geometric input parameters.',
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: EXTRACTION_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const jsonStr = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonStr) as {
        transcribedText?: string;
        extractedParameters?: Array<{ name?: string; value?: number }>;
        bAboveA?: boolean;
        bInFrontOfA?: boolean;
        bRightOfA?: boolean;
        notes?: string;
      };

      const parameters: Partial<Record<ParamName, number>> = {};
      const allowedSet = new Set<string>(ALLOWED_PARAM_NAMES);

      if (Array.isArray(parsed.extractedParameters)) {
        for (const item of parsed.extractedParameters) {
          if (
            item &&
            typeof item.name === 'string' &&
            allowedSet.has(item.name) &&
            typeof item.value === 'number' &&
            Number.isFinite(item.value)
          ) {
            parameters[item.name as ParamName] = item.value;
          }
        }
      }

      const detectedMode = reconcileMode(parameters);
      const bAboveA =
        typeof parameters.hB === 'number' && typeof parameters.hA === 'number'
          ? parameters.hB >= parameters.hA
          : parsed.bAboveA ?? true;
      const bInFrontOfA =
        typeof parameters.dB === 'number' && typeof parameters.dA === 'number'
          ? parameters.dB >= parameters.dA
          : parsed.bInFrontOfA ?? true;

      return res.json({
        transcribedText: parsed.transcribedText ?? rawText?.trim() ?? '',
        detectedMode,
        parameters,
        bAboveA,
        bInFrontOfA,
        bRightOfA: parsed.bRightOfA ?? true,
        notes: parsed.notes ?? 'Extracted from problem input.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to extract parameters via OCR.';
      console.error('OCR extraction error:', err);
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OrthoLine Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
