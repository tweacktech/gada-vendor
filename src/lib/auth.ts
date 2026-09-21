const TOKEN_KEY = "access_token";
const USER_KEY = "current_user";

export interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  account_type: string;
  /** The vendor storefront this admin manages (marketplace catalog scope). */
  vendor_id?: number;
  tenant_vendor_id?: number;
  is_superadmin?: boolean;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
}

export const auth = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getCurrentUser(): CurrentUser | null {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser(user: CurrentUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearCurrentUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  logout(): void {
    this.clearToken();
    this.clearCurrentUser();
  },
};
