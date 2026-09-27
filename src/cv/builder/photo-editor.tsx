"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Images, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { removePhotoAction, uploadPhotoAction } from "@/app/meu-espaco/cvs/actions";
import { applyPhotoToCvAction, listMyPhotosAction } from "@/app/meu-espaco/fotos/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cropBox, framingToCss } from "@/lib/photo-framing";
import { cn } from "@/lib/utils";
import type { TemplateDesign } from "../design";
import { DEFAULT_PHOTO_SETTINGS, type CvPhotoSettings } from "../types";
import { Tip, Toggle } from "./fields";

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const CLIENT_MAX_SIDE = 1400;

/**
 * Reduz e comprime a fotografia no próprio telemóvel antes do envio (poupa dados móveis).
 * O servidor volta a validar, remove os metadados (EXIF/GPS) e comprime de novo.
 * Se o navegador não conseguir ler a imagem, envia o ficheiro original (o servidor decide).
 */
export async function compressPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, CLIENT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export type PhotoState = { rawUrl: string; naturalWidth: number; naturalHeight: number } | null;

/** Carrega as dimensões da fotografia original (para o enquadramento ao vivo). */
export function usePhoto(cvId: string, initialVersion: number | null) {
  const [version, setVersion] = useState<number | null>(initialVersion);
  const [loaded, setLoaded] = useState<(NonNullable<PhotoState> & { version: number }) | null>(null);
  useEffect(() => {
    if (version === null) return;
    const url = `/api/cv/${cvId}/photo?raw=1&v=${version}`;
    const img = new Image();
    img.onload = () => setLoaded({ rawUrl: url, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, version });
    img.src = url;
  }, [cvId, version]);
  // Só usa a imagem carregada se corresponder à versão atual (foto trocada/removida).
  const photo: PhotoState = loaded && loaded.version === version ? loaded : null;
  return { photo, hasPhoto: version !== null, setVersion };
}

const POSITIONS: { value: CvPhotoSettings["position"]; label: string }[] = [
  { value: "auto", label: "Do modelo" },
  { value: "left", label: "Esquerda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Direita" },
];

type Props = {
  cvId: string;
  photo: PhotoState;
  hasPhoto: boolean;
  onUploaded: (version: number) => void;
  onRemoved: () => void;
  settings: CvPhotoSettings;
  onSettings: (s: CvPhotoSettings) => void;
  showPhoto: boolean;
  setShowPhoto: (v: boolean) => void;
  design: TemplateDesign;
  /** Foto do módulo Foto Profissional atualmente usada neste CV */
  professionalPhotoId?: string | null;
};

type MyPhoto = { id: string; label: string; hasResult: boolean; createdAt: string };

export function PhotoEditor({ cvId, photo, hasPhoto, onUploaded, onRemoved, settings, onSettings, showPhoto, setShowPhoto, design, professionalPhotoId = null }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [professional, setProfessional] = useState<string | null>(professionalPhotoId);
  const [myPhotos, setMyPhotos] = useState<MyPhoto[] | null>(null);
  const [paymentFor, setPaymentFor] = useState<string | null>(null);

  const openMyPhotos = () =>
    start(async () => {
      setError(null);
      const res = await listMyPhotosAction();
      if (res.ok) setMyPhotos(res.photos);
      else setError(res.error);
    });

  const chooseProfessional = (photoId: string, variant: "result" | "original") =>
    start(async () => {
      setError(null);
      setPaymentFor(null);
      const res = await applyPhotoToCvAction(photoId, cvId, variant);
      if (res.ok) {
        onSettings({ ...settings, ...res.framing });
        setShowPhoto(true);
        setProfessional(photoId);
        setMyPhotos(null);
        onUploaded(Date.now());
      } else {
        setError(res.error);
        if (res.code === "PAYMENT_REQUIRED") setPaymentFor(photoId);
      }
    });

  const upload = (file: File) => {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formato não suportado. Use JPG, PNG ou WEBP.");
      return;
    }
    start(async () => {
      const blob = await compressPhoto(file);
      if (blob.size > MAX_UPLOAD_BYTES) {
        setError("A fotografia deve ter no máximo 5 MB.");
        return;
      }
      const fd = new FormData();
      fd.append("photo", blob, blob === file ? file.name : "foto.jpg");
      const res = await uploadPhotoAction(cvId, fd);
      if (res.ok) {
        // O servidor repõe o enquadramento de uma foto nova.
        onSettings({ ...DEFAULT_PHOTO_SETTINGS, position: settings.position });
        setShowPhoto(true);
        setProfessional(null);
        onUploaded(Date.now());
      } else setError(res.error);
    });
  };

  const remove = () =>
    start(async () => {
      const res = await removePhotoAction(cvId);
      if (res.ok) {
        setShowPhoto(false);
        setProfessional(null);
        onRemoved();
      } else setError(res.error);
    });

  return (
    <div className="space-y-5">
      <Tip>
        A fotografia é opcional. Use uma foto recente, de frente, com fundo neutro e boa luz. A foto fica privada: só aparece no seu CV e nunca é
        publicada no site.
      </Tip>

      {!design.photo && <Alert tone="info">Este modelo não mostra fotografia. Pode guardar uma foto na mesma — aparece se trocar para um modelo com fotografia.</Alert>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={openMyPhotos} disabled={pending} icon={<Images className="size-4" aria-hidden />}>
            Escolher das minhas fotos profissionais
          </Button>
          <Link href="/meu-espaco/fotos/nova" className="text-sm font-semibold text-brand-700 underline">
            Criar foto profissional
          </Link>
          {professional && (
            <Link href={`/meu-espaco/fotos/${professional}/editar`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline">
              <Pencil className="size-3.5" aria-hidden /> Editar foto profissional
            </Link>
          )}
        </div>
        {myPhotos && (
          <div className="mt-4">
            {myPhotos.length === 0 ? (
              <p className="text-sm text-slate-600">Ainda não tem fotos profissionais.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="As suas fotos profissionais">
                {myPhotos.map((p) => (
                  <li key={p.id} className="rounded-xl border border-slate-200 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura privada do próprio utilizador */}
                    <img src={`/api/fotos/${p.id}?v=miniatura`} alt="" className="aspect-[4/5] w-full rounded-lg bg-slate-100 object-contain" loading="lazy" />
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{p.label}</p>
                    <div className="mt-2 grid gap-1.5">
                      {p.hasResult && (
                        <Button size="sm" onClick={() => chooseProfessional(p.id, "result")} disabled={pending}>
                          Usar editada
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => chooseProfessional(p.id, "original")} disabled={pending}>
                        Usar original
                      </Button>
                    </div>
                    {paymentFor === p.id && (
                      <Link href={`/meu-espaco/fotos/${p.id}`} className="mt-2 block text-xs font-semibold text-brand-700 underline">
                        Ver opções de compra
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        id="photo-input"
        aria-label="Escolher fotografia"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {!hasPhoto ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-60"
        >
          {pending ? <Spinner /> : <Camera className="size-9 text-brand-700" aria-hidden />}
          <span className="font-semibold text-ink">{pending ? "A enviar…" : "Adicionar fotografia"}</span>
          <span className="text-sm text-slate-500">JPG, PNG ou WEBP · até 5 MB · reduzida automaticamente</span>
        </button>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
            <FramingViewport photo={photo} settings={settings} onSettings={onSettings} shape={design.photoShape} />
            <div className="space-y-4">
              <Slider id="photo-zoom" label="Zoom" min={1} max={3} step={0.05} value={settings.zoom} onChange={(zoom) => onSettings({ ...settings, zoom })} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider id="photo-x" label="Horizontal" min={-1} max={1} step={0.02} value={settings.offsetX} onChange={(offsetX) => onSettings({ ...settings, offsetX })} />
              <Slider id="photo-y" label="Vertical" min={-1} max={1} step={0.02} value={settings.offsetY} onChange={(offsetY) => onSettings({ ...settings, offsetY })} />
              <Button variant="ghost" size="sm" onClick={() => onSettings({ ...DEFAULT_PHOTO_SETTINGS, position: settings.position })} icon={<RotateCcw className="size-4" aria-hidden />}>
                Repor enquadramento
              </Button>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-slate-800">Posição da fotografia</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POSITIONS.map((p) => (
                <label
                  key={p.value}
                  className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-200"
                >
                  <input type="radio" name="photo-position" value={p.value} checked={settings.position === p.value} onChange={() => onSettings({ ...settings, position: p.value })} className="sr-only" />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <Toggle id="showPhoto" label="Mostrar a fotografia no CV" description="Desligue para usar este modelo sem foto." checked={showPhoto} onChange={setShowPhoto} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={pending} icon={pending ? <Spinner /> : <Camera className="size-4" aria-hidden />}>
                Trocar fotografia
              </Button>
              <Button variant="ghost" size="sm" className="text-red-700" disabled={pending} onClick={remove} icon={<Trash2 className="size-4" aria-hidden />}>
                Remover fotografia
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <Alert tone="error">
          {error}
        </Alert>
      )}
    </div>
  );
}

function Slider({ id, label, min, max, step, value, onChange, format }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id} className="font-medium text-slate-800">
          {label}
        </label>
        <span className="text-slate-500 tabular-nums">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-brand-700" />
    </div>
  );
}

const VIEWPORT = 200;

/** Área de enquadramento: arrastar move a foto; mostra exatamente o recorte usado no PDF/DOCX. */
function FramingViewport({ photo, settings, onSettings, shape }: { photo: PhotoState; settings: CvPhotoSettings; onSettings: (s: CvPhotoSettings) => void; shape: TemplateDesign["photoShape"] }) {
  const drag = useRef<{ x: number; y: number; start: CvPhotoSettings } | null>(null);
  if (!photo) {
    return (
      <div className="grid size-[200px] place-items-center rounded-xl bg-slate-100">
        <Spinner />
      </div>
    );
  }
  const css = framingToCss(photo.naturalWidth, photo.naturalHeight, settings, VIEWPORT);
  const box = cropBox(photo.naturalWidth, photo.naturalHeight, settings);
  const perPx = box.width / VIEWPORT; // px naturais por px do ecrã
  const spanX = (photo.naturalWidth - box.width) / 2;
  const spanY = (photo.naturalHeight - box.height) / 2;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));

  return (
    <div className="mx-auto">
      <div
        className={cn("relative size-[200px] cursor-grab touch-none overflow-hidden bg-slate-100 ring-1 ring-slate-300 active:cursor-grabbing", shape === "circle" ? "rounded-full" : shape === "rounded" ? "rounded-2xl" : "rounded-none")}
        style={{ backgroundImage: `url("${photo.rawUrl}")`, backgroundRepeat: "no-repeat", ...css }}
        role="img"
        aria-label="Enquadramento da fotografia (arraste para ajustar)"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, start: settings };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          onSettings({
            ...d.start,
            offsetX: spanX > 0 ? clamp(d.start.offsetX - (dx * perPx) / spanX) : d.start.offsetX,
            offsetY: spanY > 0 ? clamp(d.start.offsetY - (dy * perPx) / spanY) : d.start.offsetY,
          });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />
      <p className="mt-2 text-center text-xs text-slate-500">Arraste a foto ou use os controlos</p>
    </div>
  );
}
