import { Font, Image, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { toBlocks } from "../format";
import type { CvPhoto } from "../types";

// Sem hifenização automática (as regras por omissão são inglesas e cortariam palavras portuguesas).
Font.registerHyphenationCallback((word) => [word]);

export const FONT = { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
export const SERIF = { regular: "Times-Roman", bold: "Times-Bold" };

export const TEXT = "#1e293b";
export const MUTED = "#475569";
export const SOFT = "#64748b";

export function PdfRichText({ text, style }: { text: string; style?: Style }) {
  const blocks = toBlocks(text);
  if (blocks.length === 0) return null;
  return (
    <View style={style}>
      {blocks.map((b, i) =>
        b.kind === "paragraph" ? (
          <Text key={i} style={{ marginTop: i === 0 ? 0 : 2 }}>
            {b.text}
          </Text>
        ) : (
          <View key={i} style={{ marginTop: i === 0 ? 0 : 2 }}>
            {b.items.map((item, j) => (
              <View key={j} style={{ flexDirection: "row", marginTop: j === 0 ? 0 : 1.5 }}>
                <Text style={{ width: 10 }}>•</Text>
                <Text style={{ flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
        ),
      )}
    </View>
  );
}

export function PdfPhoto({ photo, size, radius, border }: { photo: CvPhoto; size: number; radius?: number; border?: string }) {
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image não suporta alt
    <Image
      src={{ data: photo.data, format: photo.mime === "image/png" ? "png" : "jpg" }}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: radius ?? size / 2,
        ...(border ? { border } : {}),
      }}
    />
  );
}
