export interface GitHubTokenData {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}
export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export type ServiceResponse<T = any> = {
  message: string;
  success: boolean;
  data?: T | null;
};

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ExternalNewsletterCreate {
  id: string;
  name?: string;
  keyType: string;
}

export type OauthType = "google" | "github";

export type OauthParamErros = "missing_code" | "auth_failed" | "signups_closed";
