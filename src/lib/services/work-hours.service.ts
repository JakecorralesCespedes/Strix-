import type { ApiPagination, WorkHours } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/work-hours";

export type PaginationQuery = {
  page?: number;
  size?: number;
  departmentId?: number;
  studentId?: number;
  periodId?: number;
};

export type CreateWorkHoursBody = {
  name: string;
  start: string;
  end: string;
  amount: number;
  price: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  studentId: number;
  departmentId: number;
  periodId: number;
};

export type UpdateWorkHoursBody = Partial<CreateWorkHoursBody>;

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
