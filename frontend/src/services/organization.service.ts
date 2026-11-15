import { apiRequest } from './api.client';
import { OrganizationInfo } from '../types/cmms.types';

export interface UpdateOrganizationSettingsInput {
  name?: string;
  legalName?: string;
  timezone?: string;
  baseCurrency?: string;
  logoUri?: string | null;
  logoFile?: File | null;
}

export const organizationApiService = {
  async getSettings(): Promise<OrganizationInfo> {
    const res = await apiRequest<OrganizationInfo>('/api/organization/settings', {
      method: 'GET',
    });
    return res.data;
  },

  async updateSettings(input: UpdateOrganizationSettingsInput): Promise<OrganizationInfo> {
    if (input.logoFile) {
      const formData = new FormData();
      formData.append('logo', input.logoFile);
      if (input.name !== undefined) formData.append('name', input.name);
      if (input.legalName !== undefined) formData.append('legalName', input.legalName);
      if (input.timezone !== undefined) formData.append('timezone', input.timezone);
      if (input.baseCurrency !== undefined) formData.append('baseCurrency', input.baseCurrency);

      const res = await apiRequest<OrganizationInfo>('/api/organization/settings', {
        method: 'PATCH',
        body: formData,
      });
      return res.data;
    }

    const res = await apiRequest<OrganizationInfo>('/api/organization/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        name: input.name,
        legalName: input.legalName,
        timezone: input.timezone,
        baseCurrency: input.baseCurrency,
        logoUri: input.logoUri,
      }),
    });
    return res.data;
  },
};

