import api from "./api-config";

export type PayrollPreviewItem = {
  studentId: number;
  departmentId: number;
  periodId: number;
  hours: number;
  pricePerHour: number;
  amount: number;
  subtotal: number;
  tithe: number;
  total: number;
  payable: number;
  receivable: number;
  recivable?: number;
  workHoursIds: number[];
  student: any;
  department: any;
  period: any;
};

export type PayrollPreviewTotals = {
  hours: number;
  amount: number;
  subtotal: number;
  tithe: number;
  total: number;
  payable: number;
  receivable: number;
};

export type PayrollPreviewResponse = {
  items: PayrollPreviewItem[];
  totals: PayrollPreviewTotals;
};

export type PayrollApplyResponse = {
  appliedCount: number;
  items: any[];
  totals: PayrollPreviewTotals;
};

export async function previewPayroll(params: {
  periodId: number;
  departmentId?: number;
}) {
  const query = new URLSearchParams();
  query.append("periodId", String(params.periodId));
  if (params.departmentId) {
    query.append("departmentId", String(params.departmentId));
  }

  const response = await api.get<PayrollPreviewResponse>(
    `/scholarship-payroll/preview?${query.toString()}`,
  );
  return response.data;
}

export async function applyPayroll(body: {
  periodId: number;
  departmentId?: number;
  closePeriod?: boolean;
}) {
  const response = await api.post<PayrollApplyResponse>(
    "/scholarship-payroll/apply",
    body,
  );
  return response.data;
}
