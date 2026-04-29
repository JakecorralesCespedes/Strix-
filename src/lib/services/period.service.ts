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
