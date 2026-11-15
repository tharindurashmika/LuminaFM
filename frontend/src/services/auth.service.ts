import { apiRequest } from './api.client';
import { LoginResponseData } from '../types/cmms.types';

export interface LoginCredentials {
  email: string;
  password: string;
  organizationCode?: string;
}

export interface RegisterTenantPayload {
  organizationCode: string;
  organizationName: string;
  email: string;
  password: string;
  fullName: string;
  jobTitle?: string;
  logoUri?: string;
}

export const authApiService = {
  async login(credentials: LoginCredentials): Promise<LoginResponseData> {
    const res = await apiRequest<LoginResponseData>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return res.data;
  },

  async registerTenant(payload: RegisterTenantPayload): Promise<LoginResponseData> {
    const res = await apiRequest<LoginResponseData>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};

