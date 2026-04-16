import type { ApiPagination, Role } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/roles";

export type PaginationQuery = {
  page?: number;
  size?: number;
};

export type RolePayload = {
  name: string;
  allowedPermissions: string[];
};

export async function getRoles(query?: PaginationQuery) {
  try {
    const result = await api.get<ApiPagination<Role>>(DEFAULT_ENDPOINT, {
      params: query,
    });

    return result.data;
  } catch (error) {
    return null;
  }
}

export async function createRole(payload: RolePayload) {
  try {
    const result = await api.post<Role>(DEFAULT_ENDPOINT, payload);
    return result.data;
  } catch (error) {
    return null;
  }
}

export async function updateRole(id: number, payload: RolePayload) {
  try {
    const result = await api.put<Role>(`${DEFAULT_ENDPOINT}/${id}`, payload);
    return result.data;
  } catch (error) {
    return null;
  }
}
