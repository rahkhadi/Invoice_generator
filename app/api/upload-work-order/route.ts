import { NextResponse } from "next/server";
import { extractPdfOcrText, extractPdfText } from "@/lib/pdfExtraction";
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
    return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF uploads are supported." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "_")}`;
  const stored = await putObject(`uploads/${user.id}/${storedName}`, buffer, "application/pdf", `uploads/${storedName}`);

  const extraction = await extractPdfText(buffer);
  let draft = parseWorkOrder(extraction.text);
  let headerOcrUsed = false;
  if (!draft.company) {
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
