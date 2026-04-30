import type { ApiPagination, WorkHours } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/work-hours";

export type PaginationQuery = {
  page?: number;
  size?: number;
  departmentId?: number;
  studentId?: number;
  periodId?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  startDate?: string;
  endDate?: string;
};

export type CreateWorkHoursBody = {
  name: string;
  start: string;
  end: string;
  amount?: number;
  price?: number;
  priceId?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  studentId: number;
  departmentId: number;
  periodId: number;
  isAdditional?: boolean;
};

export type UpdateWorkHoursBody = Partial<CreateWorkHoursBody>;

async function extractErrorMessage(error: any): Promise<string | null> {
  const data = error?.response?.data;
  if (!data) return null;

  if (data instanceof Blob) {
    const text = await data.text();
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.message === "string") {
        return parsed.message;
      }
    } catch {
      // Ignore JSON parse errors and fallback to plain text.
    }
    return text || null;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  return null;
}

export async function getWorkHours(query?: PaginationQuery) {
  try {
    const result = await api.get<ApiPagination<WorkHours>>(DEFAULT_ENDPOINT, {
      params: query,
    });

    return result.data;
  } catch (error) {
    console.error("Error fetching work hours:", error);
    return null;
  }
}

export async function getPendingWorkHoursCount(): Promise<number> {
  try {
    const result = await api.get<{ count: number }>(
      `${DEFAULT_ENDPOINT}/pending-count`,
    );
    return result.data.count;
  } catch {
    return 0;
  }
}

export async function createWorkHours(data: CreateWorkHoursBody) {
  try {
    const result = await api.post<WorkHours>(DEFAULT_ENDPOINT, data);
    return result.data;
  } catch (error) {
    return null;
  }
}

export async function updateWorkHours(id: number, data: UpdateWorkHoursBody) {
  try {
    const result = await api.put<WorkHours>(`${DEFAULT_ENDPOINT}/${id}`, data);
    return result.data;
  } catch (error) {
    return null;
  }
}

export async function downloadWorkHoursReport(
  query?: PaginationQuery,
): Promise<Blob> {
  try {
    const result = await api.get(`${DEFAULT_ENDPOINT}/report`, {
      params: query,
      responseType: "blob",
    });
    return result.data as Blob;
  } catch (error) {
    console.error("Error downloading work hours report:", error);
    const message = await extractErrorMessage(error);
    throw new Error(message || "No se pudo descargar el reporte de horas.");
  }
}
