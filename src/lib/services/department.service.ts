import type { ApiPagination, Department } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/departments";

export type paginationQuery = {
  page?: number;
  size?: number;
};

export type GetDepartmentQuery = paginationQuery & {};

export type DepartmentPayload = {
  name: string;
  code: string;
  pricingId?: number;
  headId?: number | null;
};

export async function getDepartment(query?: GetDepartmentQuery) {
  try {
    const result = await api.get<ApiPagination<Department>>(DEFAULT_ENDPOINT, {
      params: query,
    });

    return result.data;
  } catch (error) {
    return null;
  }
}

export async function createDepartment(body: DepartmentPayload) {
  try {
    const result = await api.post<Department>(DEFAULT_ENDPOINT, body);

    return result.data;
  } catch (error) {
    return null;
  }
}

export async function updateDepartment(id: number, body: DepartmentPayload) {
  try {
    const result = await api.put<Department>(`${DEFAULT_ENDPOINT}/${id}`, body);

    return result.data;
  } catch (error) {
    return null;
  }
}
