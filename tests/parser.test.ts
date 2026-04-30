import { describe, expect, it } from "vitest";
import { calculateTotals } from "@/lib/calculations";
import { parseWorkOrder } from "@/lib/parser";

const sampleText = `
Work Order #: WO-77821
Date: 04/28/2026
Contractor: Northline Renovations
Company: Lakeside Property Management
Location: 123 King Street West Toronto ON
Suite: 1904
Classification: Plumbing repair
Deadline: 05/02/2026

GENERAL
Site protection and cleanup 1 EA 75.00 75.00
BATHROOM
Replace vanity shutoff valve 2 EA 48.50 97.00
Order Total: 172.00
`;

describe("work order parser", () => {
  const draft = parseWorkOrder(sampleText);

  it("extracts work order number", () => {
    expect(draft.workOrderNumber).toBe("WO-77821");
  });

  it("extracts date", () => {
    expect(draft.date).toBe("2026-04-28");
  });

  it("extracts address and suite", () => {
    expect(draft.address).toContain("123 King Street West");
    expect(draft.suite).toBe("1904");
  });

  it("extracts line items", () => {
    expect(draft.items).toHaveLength(2);
    expect(draft.items[1]).toMatchObject({ area: "BATHROOM", qty: 2, unitPrice: 48.5, lineTotal: 97 });
  });

  it("calculates subtotal and HST correctly", () => {
    expect(calculateTotals(draft.items)).toEqual({ subtotal: 172, hst: 22.36, total: 194.36 });
  });

  it("parses compact construction work order line-item blocks", () => {
    const compact = parseWorkOrder(`
MALOMAR CONSTRUCTION
DateApril 22, 2026
Order #    26-000906Order total
Id #1074Contractor
Location    190 Woolner Ave| Suite # 1713
Classification  MOVE-OUT
Deadline
DocumentDescriptionLocationQtyUOMPriceExt Price
26-000906
Paint complete all previously painted surfaces and trims.
GENERAL   1EA#721.70$
26-000906
Supply & Install new vanity cabinet and related plumbing.
BATHROOM   1EA#100.00$
26-000906
Supply & Install new wood baseboard.
GENERAL   59    LM6331.04$
May 1, 2026
1152.74$
Zarif
GUR MINOR
`);

    expect(compact.workOrderNumber).toBe("26-000906");
    expect(compact.workOrderId).toBe("1074");
    expect(compact.date).toBe("2026-04-22");
    expect(compact.deadline).toBe("2026-05-01");
    expect(compact.contractor).toBe("Zarif");
    expect(compact.workOrderType).toBe("GUR MINOR");
    expect(compact.company).toBe("MALOMAR CONSTRUCTION");
    expect(compact.address).toBe("190 Woolner Ave");
    expect(compact.suite).toBe("1713");
    expect(compact.classification).toBe("MOVE-OUT");
    expect(compact.items).toHaveLength(3);
    expect(compact.items[0]).toMatchObject({ area: "GENERAL", qty: 1, uom: "EA", unitPrice: 721.7, lineTotal: 721.7 });
    expect(compact.items[1].description).toContain("vanity cabinet");
    expect(compact.items[2]).toMatchObject({ area: "GENERAL", qty: 59, uom: "LM", lineTotal: 331.04 });
    expect(compact.total).toBe(1152.74);
  });
});
