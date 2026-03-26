import apiClient from './api-config';
import type { CreateTimeEntryDto } from '../types';

const API_BASE = '/time-entries';

export const timeEntriesService = {
  // Record clock-in
  async recordEntry(userId: number, departmentId: number) {
    const response = await apiClient.post(`${API_BASE}/record-entry`, {
      userId,
      departmentId,
    });
    return response.data;
  },

  // Record clock-out
  async recordExit(timeEntryId: number) {
    const response = await apiClient.patch(
      `${API_BASE}/${timeEntryId}/record-exit`,
      {},
    );
    return response.data;
  },

  // Get current user's today entries
  async getMyTodayEntries() {
    const response = await apiClient.get(`${API_BASE}/my-today`);
    return response.data;
  },

  // Get department entries (for department heads/admins)
  async getDepartmentEntries(
    departmentId: number,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
    if (dateTo) params.append('dateTo', dateTo.toISOString());

    const response = await apiClient.get(
      `${API_BASE}/department/${departmentId}?${params.toString()}`,
    );
    return response.data;
  },
};
