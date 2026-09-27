"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Crosshair, Download, ImageIcon, Info, RotateCcw, RotateCw, Save, ShoppingCart, Sparkles, Wand2 } from "lucide-react";
import { requestAutoBackgroundRemovalAction, savePhotoResultAction, applyPhotoToCvAction } from "@/app/meu-espaco/fotos/actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { autoCenter, estimatedFace } from "./geometry";
import { outfitDataUrl } from "./outfit";
import { autoEnhance, imageStats } from "./pixels";
import { adjustedCopy, computeMask, detectFace, loadImage, loadSource, renderPhoto, smallPixels, type Mask, type Source } from "./render";
import {
  BACKGROUND_CATEGORY_LABELS,
  CLOTHING_NOTICE,
  CUSTOM_RATIOS,
  FORMAT_LABELS,
  FORMAT_PRESETS,
  LOOK_RECOMMENDATIONS,
  NO_ADJUSTMENTS,
  OUTFIT_FILTERS,
  outputSize,
  PASSPORT_NOTICE,
  PHOTO_FORMATS,
  TIE_COLORS,
  type BackgroundDef,
  type EditorSettings,
  type OutfitDef,
} from "./types";

const STEPS = [
  { id: "foto", label: "Foto" },
  { id: "ajustar", label: "Ajustar" },
  { id: "formato", label: "Formato" },
  { id: "fundo", label: "Fundo" },
  { id: "roupa", label: "Roupa" },
  { id: "posicao", label: "Posição" },
  { id: "ver", label: "Pré-visualizar" },
  { id: "usar", label: "Usar no CV" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

export type EditorCv = { id: string; title: string; templateName: string; supportsPhoto: boolean };

type Props = {
  photoId: string;
  initialSettings: EditorSettings;
  backgrounds: BackgroundDef[];
  outfits: OutfitDef[];
  cvs: EditorCv[];
  hasResult: boolean;
  unlocked: boolean;
  pricing: { paid: boolean; priceLabel: string; bundleLabel: string | null };
  initialStep?: string;
};

function Slider({ id, label, min, max, step, value, onChange, format }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id} className="font-medium text-slate-800">
          {label}
        </label>
        <span className="text-slate-500 tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 h-8 w-full accent-brand-700" />
    </div>
  );
}

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn("shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap", active ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}
    >
      {children}
    </button>
  );
}

function Swatch({ bg }: { bg: BackgroundDef }) {
  const style: React.CSSProperties =
    bg.kind === "GRADIENT" || bg.kind === "PATTERN"
      ? { background: `linear-gradient(${bg.color1}, ${bg.color2 ?? bg.color1})` }
      : bg.kind === "IMAGE" && bg.imageUrl
        ? { backgroundImage: `url("${bg.imageUrl}")`, backgroundSize: "cover" }
        : { background: bg.color1 };
  return <span className="block h-14 w-full rounded-lg ring-1 ring-slate-300" style={style} aria-hidden />;
}

export function PhotoEditor({ photoId, initialSettings, backgrounds, outfits, cvs, hasResult, unlocked, pricing, initialStep }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>((STEPS.find((s) => s.id === initialStep)?.id ?? "ajustar") as StepId);
  const [st, setSt] = useState<EditorSettings>(initialSettings);
  const [source, setSource] = useState<Source | null>(null);
  const [adjusted, setAdjusted] = useState<HTMLCanvasElement | null>(null);
  const [mask, setMask] = useState<Mask | null>(null);
  const [outfitImage, setOutfitImage] = useState<HTMLImageElement | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(hasResult);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info" | "warning"; text: string } | null>(null);
  const [compare, setCompare] = useState<"depois" | "antes">("depois");
  const [outfitFilter, setOutfitFilter] = useState<string | null>(null);
  const [look, setLook] = useState<string | null>(null);
  const [variant, setVariant] = useState<"result" | "original">("result");
  const [cvResult, setCvResult] = useState<{ cvId: string; ok: boolean; text: string; payment?: boolean } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; st: EditorSettings } | null>(null);
  const originalUrl = `/api/fotos/${photoId}?v=original`;

  const update = useCallback((patch: Partial<EditorSettings>) => {
    setSt((s) => ({ ...s, ...patch }));
    setDirty(true);
  }, []);

  // 1) Carregar a fotografia e localizar o rosto (só a posição).
  useEffect(() => {
    let alive = true;
    loadSource(originalUrl)
      .then(async (src) => {
        if (!alive) return;
        setSource(src);
        if (!initialSettings.face) {
          const detected = await detectFace(src);
          const face = detected ?? estimatedFace(src.width, src.height);
          const size = outputSize(initialSettings.format, initialSettings.ratio);
          setSt((s) => ({ ...s, face, faceDetected: !!detected, ...autoCenter(face, src.width, src.height, size.width, size.height, s) }));
        }
      })
      .catch(() => setLoadError("Não foi possível abrir a fotografia. Tente recarregar a página."));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Ajustes de imagem (com pequena pausa para não bloquear enquanto arrasta).
  useEffect(() => {
    if (!source) return;
    const t = setTimeout(() => setAdjusted(adjustedCopy(source, st.adjust)), 80);
    return () => clearTimeout(t);
  }, [source, st.adjust]);

  // 3) Fundo liso (só quando há um fundo escolhido).
  useEffect(() => {
    if (!source || !st.backgroundId) return;
    const t = setTimeout(() => setMask(computeMask(source, st.tolerance)), 60);
    return () => clearTimeout(t);
  }, [source, st.backgroundId, st.tolerance]);

  const background = backgrounds.find((b) => b.id === st.backgroundId) ?? null;
  const outfit = outfits.find((o) => o.id === st.outfitId) ?? null;

  useEffect(() => {
    let alive = true;
    if (background?.kind === "IMAGE" && background.imageUrl) loadImage(background.imageUrl).then((img) => alive && setBgImage(img)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [background]);

  useEffect(() => {
    let alive = true;
    if (outfit) loadImage(outfitDataUrl(outfit, { tie: st.tie, tieColor: st.tieColor })).then((img) => alive && setOutfitImage(img)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [outfit, st.tie, st.tieColor]);

  // 4) Pré-visualização (60% da resolução final).
  useEffect(() => {
    if (!source || !adjusted || !canvasRef.current) return;
    const frame = requestAnimationFrame(() => {
      renderPhoto(canvasRef.current!, { source, adjusted, mask: st.backgroundId ? mask : null, background, backgroundImage: bgImage, outfitImage: st.outfitId ? outfitImage : null }, st, 0.6);
    });
    return () => cancelAnimationFrame(frame);
  }, [source, adjusted, mask, background, bgImage, outfitImage, st, compare, step]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const center = () => {
    if (!source) return;
    const face = st.face ?? estimatedFace(source.width, source.height);
    const size = outputSize(st.format, st.ratio);
    update(autoCenter(face, source.width, source.height, size.width, size.height, st));
    setMessage({ tone: "info", text: st.faceDetected ? "Rosto centrado." : "Centrado com uma estimativa da posição do rosto — ajuste se necessário." });
  };

  const setFormat = (format: EditorSettings["format"], extra: Partial<EditorSettings> = {}) => {
    if (!source) return update({ format, ...extra });
    const face = st.face ?? estimatedFace(source.width, source.height);
    const next = { ...st, format, ...extra };
    const size = outputSize(next.format, next.ratio);
    update({ format, ...extra, ...autoCenter(face, source.width, source.height, size.width, size.height, next) });
  };

  const preparePassport = () => {
    const light = backgrounds.find((b) => b.passport && b.color1.toLowerCase() === "#ffffff") ?? backgrounds.find((b) => b.passport) ?? null;
    setFormat("PASSE", { backgroundId: st.backgroundId ?? light?.id ?? null, outfitScale: 1 });
    setMessage({ tone: "info", text: PASSPORT_NOTICE });
  };

  const enhance = () => {
    if (!source) return;
    update({ adjust: autoEnhance(imageStats(smallPixels(source, 400))) });
    setMessage({ tone: "success", text: "Melhoria automática aplicada (correções moderadas). Pode ajustar à mão." });
  };

  const rotate = (deg: number) => update({ rotation: Math.max(-360, Math.min(360, Math.round(st.rotation / 90) * 90 + deg)) });
  const fine = st.rotation - Math.round(st.rotation / 90) * 90;

  const save = async (): Promise<boolean> => {
    if (!source || !adjusted) return false;
    setSaving(true);
    setMessage(null);
    try {
      const canvas = document.createElement("canvas");
      const faceOut = renderPhoto(canvas, { source, adjusted, mask: st.backgroundId ? mask : null, background, backgroundImage: bgImage, outfitImage: st.outfitId ? outfitImage : null }, st, 1);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("png");
      const fd = new FormData();
      fd.append("result", blob, "foto.png");
      fd.append("settings", JSON.stringify(st));
      fd.append("faceOut", JSON.stringify(faceOut));
      const res = await savePhotoResultAction(photoId, fd);
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return false;
      }
      setDirty(false);
      setSaved(true);
      setMessage({ tone: "success", text: "Fotografia guardada nas suas fotos profissionais." });
      router.refresh();
      return true;
    } catch {
      setMessage({ tone: "error", text: "Não foi possível guardar. Verifique a ligação e tente novamente." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addToCv = async (cvId: string) => {
    if (variant === "result" && (dirty || !saved) && !(await save())) return;
    const res = await applyPhotoToCvAction(photoId, cvId, variant);
    if (res.ok) setCvResult({ cvId, ok: true, text: "Fotografia adicionada ao CV." });
    else setCvResult({ cvId, ok: false, text: res.error, payment: res.code === "PAYMENT_REQUIRED" });
  };

  const autoRemove = async () => {
    const res = await requestAutoBackgroundRemovalAction(photoId);
    setMessage({ tone: res.ok ? "success" : "warning", text: res.ok ? "Fundo removido." : res.error });
  };

  const visibleOutfits = useMemo(() => {
    const f = OUTFIT_FILTERS.find((x) => x.id === outfitFilter);
    return outfits.filter((o) => (!f || f.test(o)) && (!look || o.tags.includes(look)));
  }, [outfits, outfitFilter, look]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const go = (id: StepId) => {
    setStep(id);
    setMessage(null);
    setCvResult(null);
  };

  // Arrastar na pré-visualização: move a foto (ou a roupa, no passo «Roupa»).
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, st };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - d.x) / rect.width;
    const dy = (e.clientY - d.y) / rect.height;
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
    if (step === "roupa" && st.outfitId) update({ outfitX: clamp(d.st.outfitX + dx, 0.5), outfitY: clamp(d.st.outfitY + dy, 0.5) });
    else update({ offsetX: clamp(d.st.offsetX + dx * 2, 1), offsetY: clamp(d.st.offsetY + dy * 2, 1) });
  };
  const onPointerUp = () => (drag.current = null);

  const size = outputSize(st.format, st.ratio);

  if (loadError) return <Alert tone="error">{loadError}</Alert>;

  return (
    <div className="pb-32 lg:pb-8">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm">
        <Link href="/meu-espaco/fotos" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand-700">
          <ArrowLeft className="size-4" aria-hidden /> Minhas fotos
        </Link>
        <p className="text-slate-500" role="status" aria-live="polite">
          {saving ? "A guardar…" : dirty ? "Alterações por guardar" : saved ? "Guardada" : ""}
        </p>
      </div>

      <nav aria-label="Etapas da foto profissional" className="-mx-1 mb-4 overflow-x-auto pb-1">
        <ol className="flex gap-1.5 px-1">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === step ? "step" : undefined}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap", s.id === step ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}
              >
                <span aria-hidden>{i + 1}</span> {s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Pré-visualização grande (fixa no topo no telemóvel) */}
        <section aria-labelledby="photo-preview-title" className="sticky top-16 z-10 -mx-4 bg-slate-50/95 px-4 pb-2 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="photo-preview-title" className="text-sm font-semibold text-slate-700">
              {FORMAT_LABELS[st.format]} · {size.width}×{size.height}
            </h2>
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-sm" role="group" aria-label="Comparar">
              {(["antes", "depois"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={compare === v} onClick={() => setCompare(v)} className={cn("rounded-md px-3 py-1 font-semibold", compare === v ? "bg-white shadow-sm" : "text-slate-600")}>
                  {v === "antes" ? "Antes" : "Depois"}
                </button>
              ))}
            </div>
          </div>
          {/* Telemóvel: altura fixa (≈30% do ecrã) para os controlos ficarem visíveis; computador: grande. */}
          <div className="relative mx-auto flex h-[30vh] max-w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-200/70 p-1.5 lg:h-auto lg:max-h-[70vh] lg:w-full lg:p-2" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
            {!source && (
              <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
                <Spinner /> A abrir a fotografia…
              </p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- fotografia privada do próprio utilizador */}
            {compare === "antes" && source && <img src={originalUrl} alt="Fotografia original (antes)" className="max-h-full max-w-full object-contain" />}
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Pré-visualização da fotografia editada (arraste para mover)"
              className={cn("max-h-full max-w-full touch-none rounded-md shadow-sm", compare === "antes" || !source ? "hidden" : "cursor-grab active:cursor-grabbing")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {st.format === "PASSE" && compare === "depois" && source && (
              // Guia da cabeça (rosto + cabelo) alinhada com o alvo de «Centralizar automaticamente» (geometry.ts).
              <div aria-hidden className="pointer-events-none absolute inset-1.5 flex justify-center lg:inset-2">
                <div className="mt-[15%] h-[58%] w-[52%] rounded-[50%] border-2 border-dashed border-white/80" />
              </div>
            )}
          </div>
          {outfit && compare === "depois" && <p className="mt-1 text-center text-xs text-slate-500">Roupa digital (edição digital)</p>}
        </section>

        <div className="min-w-0 space-y-5">
          {message && <Alert tone={message.tone}>{message.text}</Alert>}

          {step === "foto" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">1. Fotografia</h2>
              <p className="text-sm text-slate-600">Está a editar a fotografia carregada. Para usar outra, carregue uma nova — esta fica nas suas fotos até a eliminar.</p>
              <Link href="/meu-espaco/fotos/nova" className={buttonClass("outline", "lg", "w-full sm:w-auto")}>
                <ImageIcon className="size-5" aria-hidden /> Carregar outra fotografia
              </Link>
            </section>
          )}

          {step === "ajustar" && (
            <section className="space-y-5">
              <h2 className="text-lg font-semibold">2. Ajustar foto</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="outline" size="lg" onClick={() => rotate(-90)} icon={<RotateCcw className="size-5" aria-hidden />}>
                  Girar
                </Button>
                <Button variant="outline" size="lg" onClick={() => rotate(90)} icon={<RotateCw className="size-5" aria-hidden />}>
                  Girar
                </Button>
                <Button variant="secondary" size="lg" className="col-span-2" onClick={enhance} icon={<Sparkles className="size-5" aria-hidden />}>
                  Melhoria automática
                </Button>
              </div>
              <Slider id="rot-fine" label="Endireitar" min={-15} max={15} step={0.5} value={fine} onChange={(v) => update({ rotation: Math.round(st.rotation / 90) * 90 + v })} format={(v) => `${v}°`} />
              <Slider id="adj-brightness" label="Brilho" min={-50} max={50} step={1} value={st.adjust.brightness} onChange={(v) => update({ adjust: { ...st.adjust, brightness: v } })} />
              <Slider id="adj-contrast" label="Contraste" min={-50} max={50} step={1} value={st.adjust.contrast} onChange={(v) => update({ adjust: { ...st.adjust, contrast: v } })} />
              <Slider id="adj-exposure" label="Exposição" min={-1} max={1} step={0.05} value={st.adjust.exposure} onChange={(v) => update({ adjust: { ...st.adjust, exposure: v } })} format={(v) => v.toFixed(2)} />
              <Slider id="adj-saturation" label="Saturação" min={-100} max={100} step={1} value={st.adjust.saturation} onChange={(v) => update({ adjust: { ...st.adjust, saturation: v } })} />
              <Slider id="adj-sharpness" label="Nitidez" min={0} max={100} step={1} value={st.adjust.sharpness} onChange={(v) => update({ adjust: { ...st.adjust, sharpness: v } })} />
              <Button variant="ghost" onClick={() => update({ adjust: NO_ADJUSTMENTS, rotation: 0 })} icon={<RotateCcw className="size-4" aria-hidden />}>
                Repor ajustes
              </Button>
              <p className="text-xs text-slate-500">Sem filtros de beleza: os ajustes corrigem a luz e a cor, não alteram a aparência.</p>
            </section>
          )}

          {step === "formato" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">3. Escolher formato</h2>
              <Button variant="secondary" size="lg" className="w-full" onClick={preparePassport} icon={<Wand2 className="size-5" aria-hidden />}>
                Preparar foto tipo passe
              </Button>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Formato">
                {PHOTO_FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={st.format === f}
                    onClick={() => setFormat(f)}
                    className={cn("rounded-xl border-2 p-3 text-left", st.format === f ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300")}
                  >
                    <span className="block font-semibold">{FORMAT_LABELS[f]}</span>
                    <span className="block text-sm text-slate-600">{f === "PERSONALIZADA" ? "Escolha a proporção." : FORMAT_PRESETS[f].description}</span>
                  </button>
                ))}
              </div>
              {st.format === "PERSONALIZADA" && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Proporção">
                  {CUSTOM_RATIOS.map((r) => (
                    <Chip key={r} active={st.ratio === r} onClick={() => setFormat("PERSONALIZADA", { ratio: r })}>
                      {r}
                    </Chip>
                  ))}
                </div>
              )}
              {st.format === "PASSE" && (
                <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="note">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {PASSPORT_NOTICE}
                </p>
              )}
            </section>
          )}

          {step === "fundo" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">4. Escolher fundo</h2>
              <p className="text-sm text-slate-600">
                A substituição local funciona bem com fotografias tiradas contra uma parede lisa. Para fundos complexos é necessária a remoção automática.
              </p>
              <Button variant="outline" onClick={autoRemove}>
                Remover fundo (automático)
              </Button>
              <button
                type="button"
                aria-pressed={!st.backgroundId}
                onClick={() => update({ backgroundId: null })}
                className={cn("flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left", !st.backgroundId ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white")}
              >
                <ImageIcon className="size-6 text-slate-500" aria-hidden /> <span className="font-semibold">Original</span> <span className="text-sm text-slate-500">— manter o fundo da fotografia</span>
              </button>
              {st.format === "PASSE" && <p className="text-sm font-medium text-slate-700">Recomendados para tipo passe: fundos lisos e claros (assinalados com ✓).</p>}
              {(["NEUTRO", "CORPORATIVO", "GRADIENTE"] as const).map((cat) => {
                const items = backgrounds.filter((b) => b.category === cat);
                if (items.length === 0) return null;
                return (
                  <fieldset key={cat}>
                    <legend className="mb-2 text-sm font-semibold text-slate-800">{BACKGROUND_CATEGORY_LABELS[cat]}</legend>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {items.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          aria-pressed={st.backgroundId === b.id}
                          onClick={() => update({ backgroundId: b.id })}
                          className={cn("rounded-xl border-2 p-1.5 text-left", st.backgroundId === b.id ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white")}
                        >
                          <Swatch bg={b} />
                          <span className="mt-1 block text-xs font-medium leading-tight">
                            {b.name}
                            {st.format === "PASSE" && b.passport ? " ✓" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
              {st.backgroundId && (
                <>
                  <Slider id="bg-tolerance" label="Sensibilidade do fundo" min={10} max={90} step={1} value={st.tolerance} onChange={(v) => update({ tolerance: v })} />
                  {mask && !mask.result.reliable && (
                    <Alert tone="warning">O fundo desta fotografia não parece liso: o recorte pode não ficar bom. Ajuste a sensibilidade, use «Original» ou tire a foto contra uma parede lisa.</Alert>
                  )}
                </>
              )}
            </section>
          )}

          {step === "roupa" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">5. Roupa profissional</h2>
              <p className="flex gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700" role="note">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {CLOTHING_NOTICE} O rosto, o cabelo e o corpo não são alterados.
              </p>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Escolha uma aparência profissional</p>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {LOOK_RECOMMENDATIONS.map((l) => (
                    <Chip key={l.tag} active={look === l.tag} onClick={() => setLook(look === l.tag ? null : l.tag)} label={`${l.label}: ${l.description}`}>
                      {l.label}
                    </Chip>
                  ))}
                </div>
                {look && <p className="mt-1 text-xs text-slate-500">{LOOK_RECOMMENDATIONS.find((l) => l.tag === look)?.description} São sugestões — nenhuma é obrigatória.</p>}
              </div>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar roupa">
                <Chip active={!outfitFilter} onClick={() => setOutfitFilter(null)}>
                  Todas
                </Chip>
                {OUTFIT_FILTERS.map((f) => (
                  <Chip key={f.id} active={outfitFilter === f.id} onClick={() => setOutfitFilter(f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button type="button" aria-pressed={!st.outfitId} onClick={() => update({ outfitId: null })} className={cn("rounded-xl border-2 p-2 text-left", !st.outfitId ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white")}>
                  <span className="grid h-16 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <ImageIcon className="size-6" aria-hidden />
                  </span>
                  <span className="mt-1 block text-xs font-medium">Foto original (sem roupa digital)</span>
                </button>
                {visibleOutfits.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={st.outfitId === o.id}
                    onClick={() => update({ outfitId: o.id, tie: !!o.tieColor && o.gender === "MASCULINO" && o.garment !== "CAMISA", tieColor: o.tieColor })}
                    className={cn("rounded-xl border-2 p-2 text-left", st.outfitId === o.id ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- ilustração SVG gerada localmente */}
                    <img src={outfitDataUrl(o, { tie: !!o.tieColor && o.garment !== "CAMISA", tieColor: o.tieColor })} alt="" className="h-16 w-full rounded-lg bg-[#d8c7b4] object-contain" />
                    <span className="mt-1 block text-xs font-medium leading-tight">{o.name}</span>
                  </button>
                ))}
              </div>
              {outfit?.gender === "MASCULINO" && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold text-slate-800">Gravata</legend>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={!st.tie} onClick={() => update({ tie: false })}>
                      Sem gravata
                    </Chip>
                    {TIE_COLORS.map((t) => (
                      <Chip key={t.color} active={st.tie && st.tieColor === t.color} onClick={() => update({ tie: true, tieColor: t.color })}>
                        <span className="mr-1.5 inline-block size-3 rounded-full align-middle ring-1 ring-white/60" style={{ background: t.color }} aria-hidden />
                        {t.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
              )}
              {outfit && <p className="text-xs text-slate-500">Arraste a roupa na pré-visualização ou ajuste o tamanho e a posição no passo «Posição».</p>}
            </section>
          )}

          {step === "posicao" && (
            <section className="space-y-5">
              <h2 className="text-lg font-semibold">6. Ajustar posição</h2>
              <Button size="lg" className="w-full" onClick={center} icon={<Crosshair className="size-5" aria-hidden />}>
                Centralizar automaticamente
              </Button>
              <Slider id="pos-zoom" label="Aumentar / diminuir" min={1} max={4} step={0.02} value={st.zoom} onChange={(v) => update({ zoom: v })} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider id="pos-x" label="Mover na horizontal" min={-1} max={1} step={0.01} value={st.offsetX} onChange={(v) => update({ offsetX: v })} format={(v) => v.toFixed(2)} />
              <Slider id="pos-y" label="Mover na vertical" min={-1} max={1} step={0.01} value={st.offsetY} onChange={(v) => update({ offsetY: v })} format={(v) => v.toFixed(2)} />
              {st.outfitId && (
                <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-3">
                  <legend className="px-1 text-sm font-semibold">Roupa</legend>
                  <Slider id="outfit-scale" label="Tamanho da roupa" min={0.5} max={2} step={0.01} value={st.outfitScale} onChange={(v) => update({ outfitScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
                  <Slider id="outfit-x" label="Roupa: horizontal" min={-0.5} max={0.5} step={0.005} value={st.outfitX} onChange={(v) => update({ outfitX: v })} format={(v) => v.toFixed(2)} />
                  <Slider id="outfit-y" label="Roupa: vertical" min={-0.5} max={0.5} step={0.005} value={st.outfitY} onChange={(v) => update({ outfitY: v })} format={(v) => v.toFixed(2)} />
                </fieldset>
              )}
              <p className="text-xs text-slate-500">Também pode arrastar a fotografia na pré-visualização.</p>
            </section>
          )}

          {step === "ver" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">7. Pré-visualizar</h2>
              <p className="text-sm text-slate-600">Use «Antes / Depois» para comparar. Quando estiver satisfeito, guarde a fotografia.</p>
              {st.format === "PASSE" && (
                <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="note">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {PASSPORT_NOTICE}
                </p>
              )}
              <Button size="lg" className="w-full" onClick={save} disabled={saving || !source} icon={saving ? <Spinner /> : <Save className="size-5" aria-hidden />}>
                {saving ? "A guardar…" : "Guardar fotografia"}
              </Button>
              <p className="text-xs text-slate-500">A fotografia fica privada na sua conta. Não é publicada nem usada para treinar modelos de IA.</p>
            </section>
          )}

          {step === "usar" && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">8. Usar no meu CV</h2>
              {!unlocked && pricing.paid && (
                <Alert tone="info" title={`Foto profissional — ${pricing.priceLabel}`}>
                  Editar e pré-visualizar é gratuito. Para descarregar e usar a foto nos CVs, conclua a compra.
                  <div className="mt-2">
                    <Link href={`/checkout?foto=${photoId}`} className={buttonClass("success", "sm")}>
                      <ShoppingCart className="size-4" aria-hidden /> Comprar foto — {pricing.priceLabel}
                    </Link>
                  </div>
                </Alert>
              )}
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-slate-800">Que versão usar?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["result", "Foto profissional (editada)"],
                      ["original", "Foto original"],
                    ] as const
                  ).map(([v, label]) => (
                    <label key={v} className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-200">
                      <input type="radio" name="variant" value={v} checked={variant === v} onChange={() => setVariant(v)} className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {cvs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                  Ainda não tem CVs. <Link href="/cv-modelos" className="font-semibold text-brand-700 underline">Criar um CV</Link>
                </p>
              ) : (
                <ul className="space-y-2" aria-label="Os seus CVs">
                  {cvs.map((cv) => (
                    <li key={cv.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{cv.title}</p>
                          <p className="text-xs text-slate-500">
                            Modelo {cv.templateName}
                            {!cv.supportsPhoto && " · este modelo não mostra fotografia"}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => addToCv(cv.id)} disabled={saving}>
                          Adicionar fotografia
                        </Button>
                      </div>
                      {cvResult?.cvId === cv.id && (
                        <div className="mt-2">
                          <Alert tone={cvResult.ok ? "success" : "error"}>
                            {cvResult.text}{" "}
                            {cvResult.ok && (
                              <Link href={`/meu-espaco/cvs/${cv.id}/editar?passo=2`} className="font-semibold underline">
                                Ver no CV
                              </Link>
                            )}
                            {cvResult.payment && (
                              <span className="mt-2 flex flex-wrap gap-2">
                                <Link href={`/checkout?foto=${photoId}`} className={buttonClass("success", "sm")}>
                                  Comprar foto — {pricing.priceLabel}
                                </Link>
                                {pricing.bundleLabel && (
                                  <Link href={`/checkout?pacote=${cv.id}.${photoId}`} className={buttonClass("outline", "sm")}>
                                    Pacote CV + Foto — {pricing.bundleLabel}
                                  </Link>
                                )}
                              </span>
                            )}
                          </Alert>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-sm font-semibold">Baixar</p>
                {saved && !dirty && (unlocked || !pricing.paid) ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["jpg", "final", "JPG"],
                        ["png", "final", "PNG"],
                        ["jpg", "passe", "Tipo passe"],
                        ["jpg", "cv", "Para CV"],
                      ] as const
                    ).map(([fmt, tipo, label]) => (
                      <a key={label} href={`/api/fotos/${photoId}/download?formato=${fmt}&tipo=${tipo}`} download className={buttonClass("outline", "md")}>
                        <Download className="size-4" aria-hidden /> {label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">{dirty || !saved ? "Guarde a fotografia para a poder baixar." : "Disponível depois da compra."}</p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Navegação entre etapas (fixa no telemóvel) */}
      <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:bottom-0 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-5xl gap-2">
          <Button variant="outline" size="lg" className="px-4" disabled={stepIndex === 0} onClick={() => go(STEPS[stepIndex - 1]!.id)} aria-label="Etapa anterior">
            <ArrowLeft className="size-5" aria-hidden />
          </Button>
          {step === "ver" || step === "usar" ? (
            <Button size="lg" variant={dirty ? "primary" : "success"} className="flex-1" onClick={() => (dirty || !saved ? save() : go("usar"))} disabled={saving || !source} icon={dirty || !saved ? <Save className="size-5" aria-hidden /> : <Check className="size-5" aria-hidden />}>
              {dirty || !saved ? "Guardar" : "Usar no CV"}
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => go(STEPS[stepIndex + 1]!.id)}>
              Seguinte <ArrowRight className="size-5" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
