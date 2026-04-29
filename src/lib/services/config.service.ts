import type { GlobalSetting } from "../types";
import api from "./api-config";

const DEFAULT_ENDPOINT = "/global-configs";

export type paginationQuery = {
  page?: number;
  size?: number;
};

export type GetUsersQuery = paginationQuery & {};

export async function getConfig(query?: GetUsersQuery) {
  try {
    const result = await api.get<GlobalSetting>(DEFAULT_ENDPOINT, {
      params: query,
    });

    return result.data;
  } catch (error) {
    return null;
  }
}

export async function updateConfig(data: GlobalSetting) {
  try {
    const result = await api.put<GlobalSetting>(`${DEFAULT_ENDPOINT}`, data);
    return result.data;
  } catch (error) {
    return null;
  }
}

export type SmtpStatus = {
  configured: boolean;
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  note: string;
};

export async function getSmtpStatus(): Promise<SmtpStatus | null> {
  try {
    const result = await api.get<SmtpStatus>(`${DEFAULT_ENDPOINT}/smtp-status`);
    return result.data;
  } catch {
    return null;
  }
}

export type PdfTemplate = {
  pdfInstitutionName: string;
  pdfHeaderTitle: string;
  pdfHeaderSubtitle: string;
  pdfFooterText: string;
  pdfPrimaryColor: string;
  pdfSignatureLabel: string;
  pdfLogoDataUrl: string;
};

export async function getPdfTemplate(): Promise<PdfTemplate | null> {
  try {
    const result = await api.get<PdfTemplate>(
      `${DEFAULT_ENDPOINT}/pdf-template`,
    );
    return result.data;
  } catch {
    return null;
  }
}

export async function updatePdfTemplate(
  data: Partial<PdfTemplate>,
): Promise<PdfTemplate | null> {
  try {
    const result = await api.put<PdfTemplate>(
      `${DEFAULT_ENDPOINT}/pdf-template`,
      data,
    );
    return result.data;
  } catch {
    return null;
  }
}

export type NotificationToggles = {
  "notify.user.welcome": boolean;
  "notify.user.passwordReset": boolean;
  "notify.scholarship.approved": boolean;
  "notify.scholarship.rejected": boolean;
  "notify.workHours.approved": boolean;
};

export async function getNotificationToggles(): Promise<NotificationToggles | null> {
  try {
    const result = await api.get<NotificationToggles>(
      `${DEFAULT_ENDPOINT}/notifications`,
    );
    return result.data;
  } catch {
    return null;
  }
}

export async function updateNotificationToggles(
  data: Partial<NotificationToggles>,
): Promise<NotificationToggles | null> {
  try {
    const result = await api.put<NotificationToggles>(
      `${DEFAULT_ENDPOINT}/notifications`,
      data,
    );
    return result.data;
  } catch {
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  try {
    await api.post(`/auth/forgot-password`, { email });
    return true;
  } catch {
    return false;
  }
}
