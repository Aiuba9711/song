"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Upload } from "lucide-react";
import { uploadProfessionalPhotoAction } from "@/app/meu-espaco/fotos/actions";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const CLIENT_MAX_SIDE = 2000;

/** Validação no navegador (o servidor volta a validar tudo, incluindo o conteúdo real). */
export function checkPhotoFile(file: { name: string; type: string; size: number }, maxBytes: number): string | null {
  const ext = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (!EXTENSIONS.includes(ext) || (file.type && !TYPES.includes(file.type))) return "Formato não suportado. Use JPG, JPEG, PNG ou WEBP.";
  if (file.size === 0) return "O ficheiro está vazio.";
  // Ficheiros grandes são comprimidos antes do envio; só recusamos os exageradamente grandes.
  if (file.size > maxBytes * 4) return `A fotografia é demasiado grande (máximo ${Math.round(maxBytes / 1024 / 1024)} MB).`;
  return null;
}

/** Reduz para ≤ 2000 px e comprime em JPEG no próprio telemóvel (poupa dados móveis). */
async function compress(file: File): Promise<{ blob: Blob; name: string }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, CLIENT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return { blob: file, name: file.name };
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, name: file.name };
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob && blob.size < file.size ? { blob, name: "foto.jpg" } : { blob: file, name: file.name };
  } catch {
    return { blob: file, name: file.name };
  }
}

export function PhotoUploader({ maxBytes }: { maxBytes: number }) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const maxMb = Math.round(maxBytes / 1024 / 1024);

  const upload = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const problem = checkPhotoFile(file, maxBytes);
    if (problem) return setError(problem);
    start(async () => {
      const { blob, name } = await compress(file);
      if (blob.size > maxBytes) return setError(`A fotografia é demasiado grande (máximo ${maxMb} MB).`);
      const fd = new FormData();
      fd.append("photo", blob, name);
      const res = await uploadProfessionalPhotoAction(fd);
      if (res.ok) router.push(`/meu-espaco/fotos/${res.id}/editar`);
      else setError(res.error);
    });
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    upload(e.target.files?.[0]);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* capture="user": abre a câmara frontal do telemóvel (a app nativa da câmara). */}
      <input ref={camera} type="file" accept={ACCEPT} capture="user" className="sr-only" tabIndex={-1} aria-hidden onChange={onInput} />
      <input ref={gallery} id="photo-file" type="file" accept={ACCEPT} className="sr-only" aria-label="Escolher fotografia da galeria" onChange={onInput} />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => camera.current?.click()}
          disabled={pending}
          className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-brand-700 px-5 text-lg font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-60"
        >
          <Camera className="size-7" aria-hidden /> Tirar fotografia
        </button>
        <button
          type="button"
          onClick={() => gallery.current?.click()}
          disabled={pending}
          className="flex min-h-20 items-center justify-center gap-3 rounded-2xl border-2 border-brand-200 bg-white px-5 text-lg font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60"
        >
          <ImagePlus className="size-7" aria-hidden /> Escolher da galeria
        </button>
      </div>

      {/* Arrastar e largar (computador) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "hidden flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors md:flex",
          over ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white",
        )}
      >
        <Upload className="size-8 text-brand-700" aria-hidden />
        <p className="font-semibold">Arraste a fotografia para aqui</p>
        <p className="text-sm text-slate-500">ou use os botões acima</p>
      </div>

      <p className="text-sm text-slate-600">JPG, JPEG, PNG ou WEBP · até {maxMb} MB · fotografias grandes são reduzidas automaticamente.</p>

      {pending && (
        <p className="flex items-center gap-2 font-medium text-slate-700" role="status">
          <Spinner /> A enviar a fotografia…
        </p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
