const TOKEN_KEY = "access_token";
const USER_KEY = "current_user";
const REMEMBER_KEY = "remember_me";
const EMAIL_KEY = "remembered_email";

function storeFor(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage;
}

/** Storage that currently holds the session, so profile updates stay with it. */
function activeStore(): Storage {
  if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
  return localStorage;
}

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
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Persist the session. Remember me keeps it in localStorage; otherwise it
   * lasts only for this browser session.
   */
  setToken(token: string, remember = true): void {
    const keep = storeFor(remember);
    const drop = storeFor(!remember);
    drop.removeItem(TOKEN_KEY);
    keep.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },

  getCurrentUser(): CurrentUser | null {
    const userStr = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser(user: CurrentUser, remember?: boolean): void {
    if (remember === undefined) {
      activeStore().setItem(USER_KEY, JSON.stringify(user));
      return;
    }
    const keep = storeFor(remember);
    const drop = storeFor(!remember);
    drop.removeItem(USER_KEY);
    keep.setItem(USER_KEY, JSON.stringify(user));
  },

  clearCurrentUser(): void {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getRememberMe(): boolean {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  },

  getRememberedEmail(): string {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  },

  setRememberedEmail(email: string | null): void {
    if (email) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  },

  logout(): void {
    this.clearToken();
    this.clearCurrentUser();
  },
};
