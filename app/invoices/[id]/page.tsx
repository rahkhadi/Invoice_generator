import InvoiceEditor from "../invoice-editor";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceEditor mode="edit" invoiceId={id} />;
}
