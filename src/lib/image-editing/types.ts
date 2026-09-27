import type { Box } from "@/photo/types";

/**
 * Fornecedores de edição de imagem.
 *
 * - BackgroundRemovalProvider: remoção automática de fundo.
 * - ClothingProvider: aplicação de roupa.
 * - ImageEditingProvider: agrega as operações (removeBackground, applyClothing, improveLighting, cropPortrait).
 *
 * Hoje só existe a implementação LOCAL (processamento no próprio servidor/navegador, sem IA e sem
 * enviar imagens para fora). Integrações externas ficam por implementar quando houver um fornecedor
 * escolhido com documentação oficial, contrato e credenciais — ver PHOTO_MODULE.md.
 */

export type ImageData = { data: Buffer; mime: "image/png" | "image/jpeg" };

export type ClothingSpec = {
  gender: "MASCULINO" | "FEMININO";
  garment: "BLAZER" | "FATO" | "CAMISA" | "BLUSA";
  jacketColor: string | null;
  shirtColor: string;
  tieColor: string | null;
  tie: boolean;
};

export interface BackgroundRemovalProvider {
  readonly id: string;
  readonly label: string;
  /** true = a imagem sai do servidor (exige consentimento explícito) */
  readonly external: boolean;
  /** Devolve PNG com transparência onde estava o fundo. */
  removeBackground(image: ImageData, options?: { tolerance?: number }): Promise<ImageData & { reliable: boolean }>;
}

export interface ClothingProvider {
  readonly id: string;
  readonly label: string;
  readonly external: boolean;
  /** `face`: caixa do rosto na imagem (0–1), para colocar a roupa por baixo do queixo. */
  applyClothing(image: ImageData, clothing: ClothingSpec, face: Box | null): Promise<ImageData>;
}

export interface ImageEditingProvider extends BackgroundRemovalProvider, ClothingProvider {
  improveLighting(image: ImageData): Promise<ImageData>;
  /** Recorta um retrato com a proporção pedida, centrado no rosto (se conhecido). */
  cropPortrait(image: ImageData, options: { width: number; height: number; face: Box | null; headroom?: number }): Promise<ImageData>;
}

export type ProviderState = "CONFIGURADO" | "NAO_CONFIGURADO" | "ERRO";

export type ProviderStatus = {
  name: "BackgroundRemovalProvider" | "ClothingProvider" | "ImageEditingProvider";
  local: { state: ProviderState; description: string };
  external: { state: ProviderState; description: string; value: string };
};
