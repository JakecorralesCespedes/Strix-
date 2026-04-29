import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Period } from "$lib/types";

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("es-CR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function normalizeStatus(status: string): string {
  const labelMap: Record<string, string> = {
    PENDING: "Pendiente",
    ACTIVE: "Activo",
    FINISHED: "Finalizado",
    CLOSED: "Cerrado",
  };

  return labelMap[status] ?? status;
}

export function exportPeriodsToPdf(periods: Period[]): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const generatedAt = new Date();
  const rows = periods.map((period) => [
    period.name,
    formatDate(period.start),
    formatDate(period.end),
    normalizeStatus(period.status),
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Reporte formal de periodos", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fecha de emisión: ${generatedAt.toLocaleString("es-CR")}`, 14, 24);

  doc.text(`Total de periodos: ${periods.length}`, 14, 29);

  autoTable(doc, {
    startY: 36,
    head: [["Nombre", "Fecha de inicio", "Fecha de fin", "Estado"]],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [16, 75, 129],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.text("Strix - Documento generado automáticamente", 14, pageHeight - 10);

  doc.save(`reporte-periodos-${generatedAt.getTime()}.pdf`);
}

export function exportPeriodsToExcel(periods: Period[]): void {
  const generatedAt = new Date();

  const data = periods.map((period) => ({
    Nombre: period.name,
    "Fecha de inicio": formatDate(period.start),
    "Fecha de fin": formatDate(period.end),
    Estado: normalizeStatus(period.status),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Periodos");
  XLSX.writeFile(workbook, `reporte-periodos-${generatedAt.getTime()}.xlsx`);
}
