import type { ApiPagination, Period } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/periods";

export type PaginationQuery = {
  page?: number;
  size?: number;
};

export type PeriodPayload = {
  name: string;
  start: string;
  end: string;
};

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

export async function getPeriods(query?: PaginationQuery) {
  try {
    const result = await api.get<ApiPagination<Period>>(DEFAULT_ENDPOINT, {
      params: query,
    });

    return result.data;
  } catch (error) {
    console.error("Error fetching periods:", error);
    return null;
  }
}

export async function createPeriod(payload: PeriodPayload) {
  try {
    const result = await api.post<Period>(DEFAULT_ENDPOINT, payload);
    return result.data;
  } catch (error) {
    console.error("Error creating period:", error);
    return null;
  }
}

export async function updatePeriod(id: number, payload: PeriodPayload) {
  try {
    const result = await api.put<Period>(`${DEFAULT_ENDPOINT}/${id}`, payload);
    return result.data;
  } catch (error) {
    console.error("Error updating period:", error);
    return null;
  }
}

export type ClosePeriodResponse = {
  period: Period;
  emailsSent: number;
  emailsSkipped: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  smtpConfigured: boolean;
  notificationsEnabled: boolean;
  reason?: string;
};

export async function closePeriod(id: number) {
  try {
    const result = await api.post<ClosePeriodResponse>(
      `${DEFAULT_ENDPOINT}/${id}/close`,
    );
    return result.data;
  } catch (error) {
    console.error("Error closing period:", error);
    return null;
  }
}

export async function reopenPeriod(
  id: number,
  status?: "ACTIVE" | "FINISHED" | "PENDING",
) {
  try {
    const result = await api.post<Period>(
      `${DEFAULT_ENDPOINT}/${id}/reopen`,
      status ? { status } : {},
    );
    return result.data;
  } catch (error) {
    console.error("Error reopening period:", error);
    return null;
  }
}

export async function downloadPeriodReport(id: number): Promise<Blob> {
  try {
    const result = await api.get(`${DEFAULT_ENDPOINT}/${id}/report`, {
      responseType: "blob",
    });
    return result.data as Blob;
  } catch (error) {
    console.error("Error downloading period report:", error);
    const message = await extractErrorMessage(error);
    throw new Error(message || "No se pudo descargar el reporte del periodo.");
  }
}
