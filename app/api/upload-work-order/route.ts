import { NextResponse } from "next/server";
import { extractImageOcrText, extractPdfOcrText, extractPdfText } from "@/lib/pdfExtraction";
import { parseWorkOrder } from "@/lib/parser";
import { getCurrentUser } from "@/lib/auth";
import { putObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before uploading work orders." }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF or image file is required." }, { status: 400 });
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = /^image\/(png|jpe?g|webp)$/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!isPdf && !isImage) {
    return NextResponse.json({ error: "Only PDF, PNG, JPG, JPEG, or WEBP uploads are supported." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
  const contentType = isPdf ? "application/pdf" : file.type || "image/jpeg";
  const stored = await putObject(`uploads/${user.id}/${storedName}`, buffer, contentType, `uploads/${storedName}`);

  const extraction = isPdf
    ? await extractPdfText(buffer)
    : { text: await extractImageOcrText(buffer), method: "image-ocr" as const, usedOcr: true };
  let draft = parseWorkOrder(extraction.text);
  let headerOcrUsed = false;
  if (isPdf && !draft.company) {
    try {
      const ocrText = await extractPdfOcrText(buffer, 1);
      if (ocrText.trim()) {
        const ocrDraft = parseWorkOrder(`${ocrText}\n${extraction.text}`);
        draft = { ...draft, company: ocrDraft.company ?? draft.company };
        headerOcrUsed = Boolean(ocrDraft.company);
      }
    } catch {
      draft.warnings.push("Could not OCR the PDF header for work-order company name.");
    }
  }
  const profile = user?.profile;
  return NextResponse.json({
    ...draft,
    myCompanyName: profile?.companyName ?? draft.myCompanyName,
    myCompanyGstNumber: profile?.gstNumber ?? draft.myCompanyGstNumber,
    myCompanyAddress: profile?.address ?? draft.myCompanyAddress,
    uploadedPdfUrl: stored.url,
    extractionMethod: extraction.method,
    usedOcr: extraction.usedOcr || headerOcrUsed
  });
}
