import * as XLSX from "xlsx";
import type { Period } from "$lib/types";

export type WorkHoursExportRow = {
  studentName: string;
  studentCode: string;
  departmentName: string;
  date: Date;
  description: string;
  status: string;
  hours: number;
  pricePerHour: number;
};

const TITHE_RATE = 0.1;

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
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
  };
  return labelMap[status] ?? status;
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

export function exportPeriodHoursToExcel(
  period: Period,
  rows: WorkHoursExportRow[],
): void {
  const workbook = XLSX.utils.book_new();
  const sheetData: (string | number)[][] = [];

  // Title block
  sheetData.push([`Reporte de horas beca — ${period.name}`]);
  sheetData.push([
    `Periodo: ${formatDate(period.start)} al ${formatDate(period.end)}`,
  ]);
  sheetData.push([`Generado: ${formatDate(new Date())}`]);
  sheetData.push([]);

  // Group rows by student (studentCode + departmentName as key)
  const studentMap = new Map<
    string,
    { label: string; rows: WorkHoursExportRow[] }
  >();
  for (const row of rows) {
    const key = `${row.studentCode}||${row.departmentName}`;
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        label: `${row.studentName} (${row.studentCode}) — ${row.departmentName}`,
        rows: [],
      });
    }
    studentMap.get(key)!.rows.push(row);
  }

  let grandHours = 0;
  let grandBruto = 0;

  for (const { label, rows: studentRows } of studentMap.values()) {
    // Student header
    sheetData.push([label]);
    sheetData.push([
      "Fecha",
      "Descripción",
      "Estado",
      "Horas",
      "Precio/hr (₡)",
      "Subtotal (₡)",
    ]);

    let subHours = 0;
    let subBruto = 0;

    for (const r of studentRows) {
      const approved = r.status === "APPROVED";
      const subtotal = approved ? r.hours * r.pricePerHour : 0;
      if (approved) {
        subHours += r.hours;
        subBruto += subtotal;
      }
      sheetData.push([
        formatDate(r.date),
        r.description,
        normalizeStatus(r.status),
        approved ? r.hours : 0,
        approved ? r.pricePerHour : 0,
        approved ? subtotal : 0,
      ]);
    }

    const subTithe = subBruto * TITHE_RATE;
    const subNet = subBruto - subTithe;

    sheetData.push([]);
    sheetData.push(["Total horas aprobadas", "", "", subHours, "", subBruto]);
    sheetData.push(["Diezmo (10%)", "", "", "", "", -subTithe]);
    sheetData.push(["Neto a pagar", "", "", "", "", subNet]);
    sheetData.push([]);

    grandHours += subHours;
    grandBruto += subBruto;
  }

  if (studentMap.size === 0) {
    sheetData.push(["Sin registros de horas aprobadas para este periodo."]);
  } else {
    const grandTithe = grandBruto * TITHE_RATE;
    const grandNet = grandBruto - grandTithe;

    sheetData.push(["=== TOTAL GENERAL ==="]);
    sheetData.push(["Total horas", "", "", grandHours, "", grandBruto]);
    sheetData.push(["Diezmo total (10%)", "", "", "", "", -grandTithe]);
    sheetData.push(["NETO TOTAL A PAGAR", "", "", "", "", grandNet]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Horas beca");
  XLSX.writeFile(
    workbook,
    `horas-beca-${period.name.replace(/\s+/g, "_")}-${Date.now()}.xlsx`,
  );
}
