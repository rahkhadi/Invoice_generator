import { calculateTotals, roundCurrency } from "./calculations";
import type { InvoiceDraft, InvoiceItemDraft } from "./types";

const AREA_WORDS = [
  "GENERAL",
  "BATHROOM",
  "KITCHEN",
  "BEDROOM",
  "LIVING",
  "HALLWAY",
  "DINING",
  "LAUNDRY",
  "BALCONY",
  "EXTERIOR",
  "BASEMENT",
  "GARAGE",
  "BEDROOM1",
  "BEDROOM2",
  "BEDROOM3"
];

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return undefined;
}

function clean(value: string) {
  return value
    .replace(/©/g, "G")
    .replace(/§/g, "#")
    .replace(/\s+/g, " ")
    .replace(/[#: -]+$/g, "")
    .trim();
}

function money(value?: string) {
  if (!value) return 0;
  return Number(value.replace(/[$,\s]/g, "")) || 0;
}

function normalizeDate(value?: string) {
  if (!value) return undefined;
  const iso = value.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const parts = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!parts) return undefined;
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
  const month = parts[1].padStart(2, "0");
  const day = parts[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findDates(text: string) {
  return Array.from(text.matchAll(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi))
    .map((match) => normalizeDate(match[0]))
    .filter((value): value is string => Boolean(value));
}

function parseAddressAndSuite(lines: string[]) {
  const suitePattern = /(?:\b(?:suite|unit|apt|apartment)\s*[:#-]?|[#¥]\s*)\s*([A-Za-z0-9-]+)/i;
  const joinedLines = lines.join("\n");
  const siteBlock = joinedLines.match(/site\s*[:#-]?\s*([\s\S]+?)(?=\n\s*(?:customer|quantity|={3,}|[-_]{3,}|rosa|document)\b)/i)?.[1];
  const siteAddressLine = siteBlock
    ?.split("\n")
    .map(clean)
    .find((line) => /\d{1,6}\s+[\w\s.'-]+(?:street|st|road|rd|avenue|ave|drive|dr|blvd|boulevard|lane|ln|court|ct|way|crescent|cres)\.?\b/i.test(line));
  const explicitAddress = firstMatch(lines.join("\n"), [
    /(?:location|address|site)\s*[:#-]?\s*([^\n]+)/i,
    /(?:service address|job address)\s*[:#-]\s*([^\n]+)/i
  ]);
  const addressLine =
    siteAddressLine ??
    explicitAddress ??
    lines.find((line) => /\d{1,6}\s+[\w\s.'-]+(?:street|st|road|rd|avenue|ave|drive|dr|blvd|boulevard|lane|ln|court|ct|way|crescent|cres)\b/i.test(line));
  const suite = addressLine?.match(suitePattern)?.[1] ?? siteBlock?.match(suitePattern)?.[1] ?? firstMatch(lines.join("\n"), [suitePattern]);
  const address = addressLine
    ? clean(
        addressLine
          .replace(/^location\s*[:#-]?\s*/i, "")
          .replace(/\|\s*/g, " ")
          .replace(suitePattern, "")
      )
    : undefined;
  return { address, suite };
}

function normalizeOrderNumber(value?: string) {
  if (!value) return undefined;
  const cleaned = clean(value).replace(/\s/g, "").replace(/[.,]+$/g, "");
  return cleaned.replace(/([A-Z]*\d{1,4}-)([A-Z0-9]+)/i, (_, prefix: string, suffix: string) => {
    const normalizedSuffix = suffix
      .replace(/[oO]/g, "0")
      .replace(/[iIlL]/g, "1")
      .replace(/[eEzZ]/g, "2");
    return `${prefix.toUpperCase()}${normalizedSuffix}`;
  });
}

function inferArea(description: string, fallback: string) {
  const upper = description.toUpperCase();
  if (upper.includes("KITCHEN")) return "KITCHEN";
  if (upper.includes("BATH")) return "BATHROOM";
  if (upper.includes("BASEMENT")) return "BASEMENT";
  if (upper.includes("BEDROOM")) return "BEDROOM";
  if (upper.includes("STAIR")) return "HALLWAY";
  if (upper.includes("EXTERIOR")) return "EXTERIOR";
  return fallback;
}

function findStandaloneTotalLineIndex(lines: string[]) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (/^[\d,]+(?:\.\d{2})?\$?$/.test(lines[index])) return index;
  }
  return -1;
}

function footerValueAfterTotal(lines: string[], offset: number) {
  const totalIndex = findStandaloneTotalLineIndex(lines);
  if (totalIndex < 0) return undefined;
  const value = lines[totalIndex + offset];
  return value && !findDates(value).length ? clean(value) : undefined;
}

function inferCompanyFromHeader(lines: string[]) {
  const ignored = /^(date|order|id|contractor|location|w\/o|classification|deadline|document|description|qty|uom|price|ext|invoice|construction invoice)\b/i;
  const companyLine = lines.slice(0, 12).find((line) => {
    if (ignored.test(line) || findDates(line).length) return false;
    return /\b(CONSTRUCTION|PROPERTY|MANAGEMENT|RENOVATION|RENOVATIONS|RESTORATION|MAINTENANCE|SERVICES|HOMES|BUILDERS|CONTRACTING|CONTRACTORS)\b/i.test(line);
  });
  return companyLine ? clean(companyLine) : undefined;
}

function isWorkOrderMarker(line: string, workOrderNumber?: string) {
  if (!workOrderNumber) return false;
  return clean(line) === workOrderNumber;
}

function compactAmount(rawAmount: string, hasSeparator: boolean) {
  const normalized = rawAmount.replace(/,/g, "");
  if (hasSeparator) return money(normalized);
  const [whole, cents = "00"] = normalized.split(".");
  // Some PDFs glue unit price and extended price after the UOM:
  // "59 LM6331.04" means unit price 6, extended price 331.04.
  if (whole.length >= 4) {
    return money(`${whole.slice(1)}.${cents}`);
  }
  return money(normalized);
}

function parseItemDetail(line: string) {
  const areaPattern = AREA_WORDS.map((area) => area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = line.match(
    new RegExp(
      `^(?<area>${areaPattern}|[A-Z]+\\d*)\\s+(?<qty>\\d+(?:\\.\\d+)?)\\s*(?<uom>[A-Z.]+)?\\s*(?<sep>#?)\\$?(?<price>\\d[\\d,]*(?:\\.\\d{2})?)\\$?\\s*$`,
      "i"
    )
  );
  if (!match?.groups) return undefined;
  const qty = Number(match.groups.qty) || 1;
  const lineTotal = compactAmount(match.groups.price, Boolean(match.groups.sep));
  return {
    area: match.groups.area.toUpperCase(),
    qty,
    uom: match.groups.uom?.replace(/\./g, "").toUpperCase() || "EA",
    unitPrice: qty > 0 ? roundCurrency(lineTotal / qty) : lineTotal,
    lineTotal
  };
}

function parseItems(lines: string[], workOrderNumber?: string) {
  const items: InvoiceItemDraft[] = [];
  let currentArea = "GENERAL";
  let descriptionBuffer: string[] = [];
  const unpricedItems: InvoiceItemDraft[] = [];
  let inUnpricedTable = false;
  let pendingUnpriced:
    | {
        area: string;
        descriptionParts: string[];
        qty: number;
        uom?: string;
      }
    | undefined;
  const itemPattern =
    /^(?:(?<area>[A-Z][A-Z\s]{2,})\s+)?(?<description>.*?[A-Za-z][A-Za-z0-9\s,./'()&-]+?)\s+(?<qty>\d+(?:\.\d+)?)\s*(?<uom>EA|EACH|HR|HRS|HOUR|HOURS|SQFT|SF|LF|FT|M|DAY|DAYS|UNIT|UNITS|LOT)?\s+\$?(?<unit>\d[\d,]*(?:\.\d{2})?)\s+\$?(?<total>\d[\d,]*(?:\.\d{2})?)$/i;

  const flushUnpriced = () => {
    if (!pendingUnpriced) return;
    const description = clean(pendingUnpriced.descriptionParts.join(" "));
    if (description.length >= 3) {
      unpricedItems.push({
        area: pendingUnpriced.area,
        description,
        qty: pendingUnpriced.qty,
        uom: pendingUnpriced.uom || "EA",
        unitPrice: 0,
        lineTotal: 0
      });
    }
    pendingUnpriced = undefined;
  };

  for (const rawLine of lines) {
    const line = clean(rawLine);
    if (!line || /subtotal|hst|tax|total|amount due|documentdescriptionlocationqty/i.test(line)) continue;
    if (/quantity\s+product|description\s+u[mo]\b|description\s+location\s+qty/i.test(line)) {
      inUnpricedTable = true;
      continue;
    }
    if (/^(vendor|unit\s*#|work completed|customer signature|printed on)\b/i.test(line)) {
      flushUnpriced();
      inUnpricedTable = false;
      continue;
    }
    if (inUnpricedTable) {
      const unpricedMatch = line.match(
        /^(?<qty>\d+(?:\.\d+)?)\.?\s+[*¥%xX]?\s*(?:CT|C1|GT|G1|¥CT|%T|Tec)\s+(?<description>.+?)(?:\s+(?<uom>EA|EACH|LM|LH|LF|FT|SF|UM))?\s*$/i
      );
      if (unpricedMatch?.groups) {
        flushUnpriced();
        const description = clean(unpricedMatch.groups.description);
        pendingUnpriced = {
          area: inferArea(description, currentArea),
          descriptionParts: [description],
          qty: Number(unpricedMatch.groups.qty) || 1,
          uom: unpricedMatch.groups.uom?.toUpperCase().replace("EACH", "EA").replace("LH", "LM").replace("UM", "EA")
        };
        continue;
      }
      if (pendingUnpriced && !/^[=_-]{3,}/.test(line)) {
        pendingUnpriced.descriptionParts.push(line);
        pendingUnpriced.area = inferArea(line, pendingUnpriced.area);
        continue;
      }
    }
    if (isWorkOrderMarker(line, workOrderNumber)) {
      descriptionBuffer = [];
      continue;
    }
    const area = AREA_WORDS.find((word) => new RegExp(`^${word}\\b:?$`, "i").test(line));
    if (area) {
      currentArea = area;
      continue;
    }

    const detail = parseItemDetail(line);
    if (detail && descriptionBuffer.length) {
      const description = clean(descriptionBuffer.join(" "));
      if (description.length >= 3) {
        currentArea = detail.area;
        items.push({ description, ...detail });
      }
      descriptionBuffer = [];
      continue;
    }

    const match = line.match(itemPattern);
    if (!match?.groups) {
      if (
        !/^(date|order|order #|id #?|contractor|location|w\/o type|classification|deadline)\b/i.test(line) &&
        !/^documentdescriptionlocationqty/i.test(line) &&
        !/^\d[\d,]*(?:\.\d{2})?\$?$/.test(line) &&
        !findDates(line).length
      ) {
        descriptionBuffer.push(line);
      }
      continue;
    }
    const qty = Number(match.groups.qty) || 1;
    const unitPrice = money(match.groups.unit);
    const lineTotal = money(match.groups.total) || roundCurrency(qty * unitPrice);
    const parsedArea = clean(match.groups.area || currentArea);
    const description = clean(match.groups.description);
    if (description.length < 3) continue;
    items.push({
      area: AREA_WORDS.some((word) => parsedArea.toUpperCase().includes(word)) ? parsedArea : currentArea,
      description,
      qty,
      uom: match.groups.uom?.toUpperCase(),
      unitPrice,
      lineTotal
    });
  }

  flushUnpriced();
  return items.length ? items : unpricedItems;
}

export function parseWorkOrder(rawText: string): InvoiceDraft {
  const text = rawText.replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map(clean)
    .filter(Boolean);
  const joined = lines.join("\n");
  const dates = findDates(joined);
  const workOrderNumber = normalizeOrderNumber(firstMatch(joined, [
    /(?:customer\s+order)\s*(?:number|no|#)?\s*[:#-]?\s*([A-Z0-9-]+)/i,
    /(?:order)\s*(?:number|no|#)\s*[:#-]?\s*([A-Z0-9-]+?)(?=Order\s+total|\s|$)/i,
    /(?:work\s*order|\bwo\b|\bw\/o\b)\s*(?:number|no|#)\s*[:#-]?\s*([A-Z0-9-]+)/i,
    /^\s*([A-Z]?\d{2,}-\d{3,})\s*$/m
  ]));
  const { address, suite } = parseAddressAndSuite(lines);
  const items = parseItems(lines, workOrderNumber);
  const totals = calculateTotals(items);
  const standaloneTotalIndex = findStandaloneTotalLineIndex(lines);
  const standaloneTotal = standaloneTotalIndex >= 0 ? lines[standaloneTotalIndex] : undefined;
  const explicitTotal = money(firstMatch(joined, [
    /(?:order total|grand total|total)\s*[:$ -]*([\d,]+(?:\.\d{2})?)/i,
    /\n([\d,]+(?:\.\d{2})?)\$\s*\n/
  ]) ?? standaloneTotal);
  const workOrderType = firstMatch(joined, [
    /(?:w\/o[ \t]*type|work[ \t]*order[ \t]*type|wo[ \t]*type)[ \t]*[:#-][ \t]*([^\n]+)/i
  ]) ?? footerValueAfterTotal(lines, 2);
  const warnings: string[] = [];
  const draft: InvoiceDraft = {
    invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(Math.random() * 9000 + 1000)}`,
    workOrderNumber,
    workOrderId: normalizeOrderNumber(firstMatch(joined, [
      /(?:sales\s+order)\s*#?\s*([A-Z0-9.-]+)/i,
      /(?:id)\s*#?\s*([A-Z0-9-]+?)(?=Contractor|\s|$)/i
    ])),
    workOrderType,
    contractor: firstMatch(joined, [/(?:contractor|vendor|technician)[ \t]*[:#-][ \t]*([^\n]+)/i]) ?? footerValueAfterTotal(lines, 1),
    company: firstMatch(joined, [/(?:company|management|client)\s*[:#-]\s*([^\n]+)/i]) ?? inferCompanyFromHeader(lines),
    myCompanyName: "",
    myCompanyGstNumber: "",
    myCompanyAddress: "",
    address,
    suite,
    classification: firstMatch(joined, [
      /(?:move\s+out\s+unit)/i,
      /(?:classification|work type|trade|category)\s*[:#-]?\s*([^\n]+)/i
    ]) ?? (/\bmove\s+out\s+unit\b/i.test(joined) ? "MOVE OUT UNIT" : undefined),
    date: normalizeDate(firstMatch(joined, [/(?:date|created|issued)\s*[:#-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i])) ?? dates[0],
    deadline: normalizeDate(firstMatch(joined, [/(?:deadline|required by|due date|complete by)\s*[:#-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i])) ?? dates[1],
    subtotal: totals.subtotal,
    hst: totals.hst,
    total: explicitTotal > 0 ? explicitTotal : totals.total,
    status: "DRAFT",
    paymentTerms: "Net 30",
    notes: "",
    rawExtractedText: rawText,
    parserConfidence: 0,
    warnings,
    items
  };

  let score = 0;
  if (draft.workOrderNumber) score += 20;
  else warnings.push("Work order number was not detected.");
  if (draft.date) score += 15;
  else warnings.push("Date was not detected.");
  if (draft.address) score += 15;
  else warnings.push("Address was not detected.");
  if (draft.items.length > 0) score += 30;
  else warnings.push("No priced line items were detected.");
  if (draft.total > 0) score += 20;
  else warnings.push("Order total was not detected.");
  draft.parserConfidence = score;
  if (score < 70) warnings.push("Parser confidence is low. Review every editable field before saving.");
  return draft;
}
