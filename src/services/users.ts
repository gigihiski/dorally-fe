import { apiRequest } from "@/lib/api";

export interface User {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: string;
  user_type?: string;
  country_code?: string;
  last_password_changed_at?: string;
  last_username_changed_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export async function getMyProfile(): Promise<User> {
  const response = await apiRequest<User>("/users/me", { method: "GET" });
  return response.data ?? {};
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  username?: string;
  phone?: string;
  avatar?: string;
  country_code?: string;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<User> {
  const response = await apiRequest<User>("/users/me", {
    method: "PATCH",
    body: payload,
  });
  return response.data ?? {};
}
