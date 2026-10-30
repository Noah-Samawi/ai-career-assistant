export const ALLOWED_CV_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;
export const MAX_CV_BYTES = 5 * 1024 * 1024;

export class CvExtractError extends Error {}

/** Sniffs the real file type from magic bytes – never trust the client-sent MIME type. */
export function sniffType(buf: Buffer): "pdf" | "docx" | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return "docx"; // zip container
  return null;
}

export async function extractText(buf: Buffer): Promise<{ text: string; kind: "pdf" | "docx" }> {
  const kind = sniffType(buf);
  if (!kind) throw new CvExtractError("Unsupported file. Please upload a PDF or DOCX.");
  let text = "";
  if (kind === "pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const res = await pdfText(pdf, { mergePages: true });
    text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
  } else {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: buf });
    text = res.value;
  }
  text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 80) {
    throw new CvExtractError(
      "Almost no text found. The file is probably a scanned image – please upload a text-based PDF or DOCX.",
    );
  }
  return { text: text.slice(0, 60_000), kind };
}
