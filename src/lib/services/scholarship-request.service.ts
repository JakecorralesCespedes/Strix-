import type { ApiPagination, StudentOnDepartment } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/scholarship-request";

export type PaginationQuery = {
  page?: number;
  size?: number;
  departmentId?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
};

export type UpdateScholarshipRequestBody = {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  departmentId?: number;
};

export type CreateScholarshipRequestBody = {
  departmentId: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  // Opcion A: referenciar estudiante existente
  studentId?: number;
  // Opcion B: proporcionar datos inline del estudiante (upsert por code/email)
  name?: string;
  email?: string;
  phone?: string;
  code?: string;
};

export async function getScholarshipRequests(query?: PaginationQuery) {
  try {
    const result = await api.get<ApiPagination<StudentOnDepartment>>(
      DEFAULT_ENDPOINT,
      {
        params: query,
      },
    );

    return result.data;
  } catch (error) {
    return null;
  }
}

export async function updateScholarshipRequest(
  id: number,
  data: UpdateScholarshipRequestBody,
) {
  try {
    const result = await api.put<StudentOnDepartment>(
      `${DEFAULT_ENDPOINT}/${id}`,
      data,
    );

    return result.data;
  } catch (error) {
    return null;
  }
}

export async function createScholarshipRequest(
  data: CreateScholarshipRequestBody,
) {
  try {
    const result = await api.post<StudentOnDepartment>(DEFAULT_ENDPOINT, data);
    return result.data;
  } catch (error) {
    return null;
  }
}
