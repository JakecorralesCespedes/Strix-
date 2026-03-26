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
