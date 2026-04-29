import api from "./api-config";

export type DepartmentPrice = {
  id: number;
  departmentId: number;
  label: string;
  price: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateDepartmentPriceBody = {
  departmentId: number;
  label: string;
  price: number;
  active?: boolean;
};

export type UpdateDepartmentPriceBody = Partial<CreateDepartmentPriceBody>;

const ENDPOINT = "/department-prices";

export async function getDepartmentPrices(
  departmentId?: number,
): Promise<DepartmentPrice[]> {
  try {
    const result = await api.get<DepartmentPrice[]>(ENDPOINT, {
      params: typeof departmentId === "number" ? { departmentId } : undefined,
    });
    return result.data ?? [];
  } catch {
    return [];
  }
}

export async function createDepartmentPrice(
  data: CreateDepartmentPriceBody,
): Promise<DepartmentPrice | null> {
  try {
    const result = await api.post<DepartmentPrice>(ENDPOINT, data);
    return result.data;
  } catch {
    return null;
  }
}

export async function updateDepartmentPrice(
  id: number,
  data: UpdateDepartmentPriceBody,
): Promise<DepartmentPrice | null> {
  try {
    const result = await api.put<DepartmentPrice>(`${ENDPOINT}/${id}`, data);
    return result.data;
  } catch {
    return null;
  }
}

export async function deleteDepartmentPrice(id: number): Promise<boolean> {
  try {
    await api.delete(`${ENDPOINT}/${id}`);
    return true;
  } catch {
    return false;
  }
}
