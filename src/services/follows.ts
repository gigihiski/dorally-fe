import { apiRequest } from "@/lib/api";

export interface RiskSettings {
  id?: string;
  followee_id?: string;
  max_loss_pct?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Followee {
  id: string;
  investor_id?: string;
  money_manager_id?: string;
  status?: string;
  risk?: RiskSettings;
  created_at?: string;
  deleted_at?: string;
  updated_at?: string;
}

export interface ToggleFollowRequest {
  money_manager_id: string;
  investor_account_id: string;
}

export async function toggleFollow(payload: ToggleFollowRequest): Promise<Followee> {
  const response = await apiRequest<Followee>("/followees/me/toggle", {
    method: "POST",
    body: payload,
  });
  if (!response.data) throw new Error("toggleFollow returned no data");
  return response.data;
}

export interface ListFolloweesParams {
  status?: "active" | "inactive" | "blocked";
  page?: number;
  limit?: number;
}

export async function listMyFollowees(params: ListFolloweesParams = {}): Promise<Followee[]> {
  const response = await apiRequest<Followee[]>("/followees/me", {
    method: "GET",
    query: {
      status: params.status,
      page: params.page,
      limit: params.limit,
    },
  });
  return response.data ?? [];
}

export async function setFollowRisk(
  followeeId: string,
  max_loss_pct: number,
): Promise<RiskSettings> {
  const response = await apiRequest<RiskSettings>(
    `/followees/me/${encodeURIComponent(followeeId)}/risk`,
    {
      method: "PUT",
      body: { max_loss_pct },
    },
  );
  return response.data ?? {};
}
