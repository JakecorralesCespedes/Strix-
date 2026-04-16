import type { ApiPagination, Student } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/students";

export type PaginationQuery = {
  page?: number;
  size?: number;
  search?: string;
};

export type StudentPayload = {
  name: string;
  email: string;
  phone: string;
  code: string;
};

export async function getStudents(query?: PaginationQuery) {
  try {
    const result = await api.get<ApiPagination<Student>>(DEFAULT_ENDPOINT, {
      params: query,
    });

    return result.data;
  } catch (error) {
    return null;
  }
}

export async function createStudent(payload: StudentPayload) {
  try {
    const result = await api.post<Student>(DEFAULT_ENDPOINT, payload);
    return result.data;
  } catch (error) {
    return null;
  }
}

export async function updateStudent(id: number, payload: StudentPayload) {
  try {
    const result = await api.put<Student>(`${DEFAULT_ENDPOINT}/${id}`, payload);
    return result.data;
  } catch (error) {
    return null;
  }
}
