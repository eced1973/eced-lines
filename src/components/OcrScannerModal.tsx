import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Loader2, Upload, X } from 'lucide-react';
import {
  DEFAULT_INPUT_PARAMS,
  INPUT_MODES,
  solveLineProjection,
  type InputModeId,
  type LineInputParams,
} from '../geometry/lineSolver';

interface OcrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtracted: (
    params: LineInputParams,
    meta: {
      transcribedText: string;
      notes: string;
      extractedParameters: Record<string, number>;
      detectedMode: InputModeId;
      openTutorial?: boolean;
    }
  ) => void;
}

interface OcrApiResponse {
  transcribedText: string;
  detectedMode: string;
  parameters: Record<string, number>;
  bAboveA?: boolean;
  bInFrontOfA?: boolean;
  bRightOfA?: boolean;
  notes: string;
  error?: string;
}

const PARAM_LABELS: Record<string, string> = {
  hA: 'hA (mm)',
  dA: 'dA (mm)',
  hB: 'hB (mm)',
  dB: 'dB (mm)',
  hM: 'hM (mm)',
  dM: 'dM (mm)',
  TL: 'TL (mm)',
  theta: 'θ (°)',
  phi: 'φ (°)',
  FVL: 'FVL (mm)',
  TVL: 'TVL (mm)',
  alpha: 'α (°)',
  beta: 'β (°)',
  projectorDistance: 'p (mm)',
  dHT: 'dHT (mm)',
  hVT: 'hVT (mm)',
  traceProjectorDistance: 'HT–VT gap (mm)',
};

const SAMPLE_TEXT_PROBLEMS = [
  {
    label: 'Standard Inclined Line (TL, θ, φ)',
    text: 'A straight line AB 85 mm long has its end A 15 mm above HP and 25 mm in front of VP. It is inclined at 35° to HP and 40° to VP. Draw its projections and find HT and VT.',
  },
  {
    label: 'TL with FV & TV Lengths (N.D. Bhatt)',
    text: 'The top view of a 75 mm long line AB measures 65 mm, while the length of its front view is 50 mm. Its one end A is in HP and 12 mm in front of VP. Draw projections and determine θ, φ, and traces.',
  },
  {
    label: 'Trace-Based Problem (HT & VT)',
    text: 'The distance between projectors of HT and VT of a line AB is 90 mm. HT is 40 mm in front of VP and VT is 60 mm above HP. End A is 20 mm above HP and end B is 50 mm above HP. Find TL, θ, and φ.',
  },
  {
    label: 'Apparent Views (FVL, TVL, p)',
    text: 'A line AB has its end A 20 mm above HP and 15 mm in front of VP. The front view measures 60 mm and top view measures 70 mm. Distance between end projectors is 45 mm. Find True Length, θ, φ, and traces.',
  },
];

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyExtracted,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [rawText, setRawText] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<OcrApiResponse | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            readBlobAsDataUrl(blob);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isOpen]);

  const readBlobAsDataUrl = (file: Blob) => {
    setError(null);
    setExtractedPreview(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
        setImageMime(file.type || 'image/png');
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setError('Camera access unavailable or denied. You can upload an image or paste problem text instead.');
    }
  };

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setImagePreview(dataUrl);
    setImageMime('image/jpeg');
    stopCamera();
  };

  const runExtraction = async (options?: { overrideText?: string; openTutorial?: boolean }) => {
    const textToSend = options?.overrideText !== undefined ? options.overrideText : rawText;
    if (!imagePreview && !textToSend.trim()) {
      setError('Upload or capture an image of the problem, or paste problem text first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imageMime,
          rawText: textToSend,
        }),
      });
      const data = (await resp.json()) as OcrApiResponse;
      if (!resp.ok || data.error) {
        throw new Error(data.error || 'Failed to extract parameters.');
      }

      const validModeIds = new Set(INPUT_MODES.map((m) => m.id));
      const mode: InputModeId = validModeIds.has(data.detectedMode as InputModeId)
        ? (data.detectedMode as InputModeId)
        : 'tl_theta_phi';

      const p = data.parameters ?? {};

      const merged: LineInputParams = {
        ...DEFAULT_INPUT_PARAMS,
        mode,
        hA: p.hA ?? DEFAULT_INPUT_PARAMS.hA,
        dA: p.dA ?? DEFAULT_INPUT_PARAMS.dA,
        hB: p.hB ?? DEFAULT_INPUT_PARAMS.hB,
        dB: p.dB ?? DEFAULT_INPUT_PARAMS.dB,
        hM: p.hM ?? DEFAULT_INPUT_PARAMS.hM,
        dM: p.dM ?? DEFAULT_INPUT_PARAMS.dM,
        TL: p.TL ?? DEFAULT_INPUT_PARAMS.TL,
        theta: p.theta ?? DEFAULT_INPUT_PARAMS.theta,
        phi: p.phi ?? DEFAULT_INPUT_PARAMS.phi,
        FVL: p.FVL ?? DEFAULT_INPUT_PARAMS.FVL,
        TVL: p.TVL ?? DEFAULT_INPUT_PARAMS.TVL,
        alpha: p.alpha ?? DEFAULT_INPUT_PARAMS.alpha,
        beta: p.beta ?? DEFAULT_INPUT_PARAMS.beta,
        projectorDistance: p.projectorDistance ?? DEFAULT_INPUT_PARAMS.projectorDistance,
        dHT: p.dHT ?? DEFAULT_INPUT_PARAMS.dHT,
        hVT: p.hVT ?? DEFAULT_INPUT_PARAMS.hVT,
        traceProjectorDistance:
          p.traceProjectorDistance ?? DEFAULT_INPUT_PARAMS.traceProjectorDistance,
        bAboveA:
          typeof p.hB === 'number' && typeof p.hA === 'number'
            ? p.hB >= p.hA
            : (data.bAboveA ?? true),
        bInFrontOfA:
          typeof p.dB === 'number' && typeof p.dA === 'number'
            ? p.dB >= p.dA
            : (data.bInFrontOfA ?? true),
        bRightOfA: data.bRightOfA ?? true,
      };

      const check = solveLineProjection(merged);
      setExtractedPreview(data);

      onApplyExtracted(merged, {
        transcribedText: data.transcribedText || textToSend,
        notes: data.notes,
        extractedParameters: p,
        detectedMode: mode,
        openTutorial: options?.openTutorial,
      });

      if (check.valid) {
        onClose();
      } else {
        setError(
          `Extracted parameters for mode "${mode}", but the geometry solver reported: ${check.error} Adjust your problem text or close to tweak parameters manually.`
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OCR extraction failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-modal-title"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="ocr-modal-title" className="text-base font-semibold text-slate-900">
              Scan Problem &amp; Extract Parameters (OCR)
            </h2>
            <p className="text-xs text-slate-500">
              Upload a textbook photo, paste a screenshot (Ctrl+V), capture via camera, or enter problem text
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close OCR scanner"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Image Capture / Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) {
                readBlobAsDataUrl(file);
              }
            }}
            className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/60"
          >
            {cameraActive ? (
              <div className="space-y-3">
                <video ref={videoRef} className="w-full max-h-60 rounded-lg bg-slate-900 object-contain" playsInline muted />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Cancel Camera
                  </button>
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg"
                  >
                    Capture Photo
                  </button>
                </div>
              </div>
            ) : imagePreview ? (
              <div className="space-y-3">
                <img
                  src={imagePreview}
                  alt="Uploaded engineering graphics problem"
                  className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-white"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Image ready for OCR extraction</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setExtractedPreview(null);
                    }}
                    className="text-xs font-medium text-rose-700 hover:underline"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
                <p className="text-xs text-slate-600">
                  Drag &amp; drop a textbook/assignment photo, paste a screenshot (Ctrl+V), or select an action:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Use Camera</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) readBlobAsDataUrl(f);
                  }}
                />
              </div>
            )}
          </div>

          {/* Text Problem Input */}
          <div className="space-y-1.5">
            <label htmlFor="ocr-raw-text" className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Or Paste / Type Problem Statement</span>
            </label>
            <textarea
              id="ocr-raw-text"
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g., A line AB 80 mm long has its end A 15 mm above HP and 20 mm in front of VP..."
              className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>

          {/* Quick Sample Problems */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-500">
              Quick Test Problems (Click to Extract &amp; Solve Immediately):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TEXT_PROBLEMS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setRawText(sample.text);
                    runExtraction({ overrideText: sample.text });
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 leading-relaxed">
              {error}
            </div>
          )}

          {extractedPreview && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Extracted Input Parameters</span>
                <span className="font-mono text-slate-600">{extractedPreview.detectedMode}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-800">
                {Object.entries(extractedPreview.parameters).map(([k, v]) => (
                  <span key={k}>
                    {PARAM_LABELS[k] ?? k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => runExtraction({ openTutorial: true })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg disabled:opacity-60 transition-colors"
          >
            <span>Extract &amp; Open Tutorial</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => runExtraction({ openTutorial: false })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg disabled:opacity-60 transition-colors"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Extracting & Solving...' : 'Extract & Solve'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
