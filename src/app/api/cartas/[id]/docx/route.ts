import { downloadLetter } from "../download";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return downloadLetter(id, "docx");
}
