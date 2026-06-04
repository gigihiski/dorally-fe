import { ApiError, apiRequest, type MetaData } from "@/lib/api";

export interface PrimaryAccount {
  id: string;
  login?: string;
  currency?: string;
}

export interface Performance {
  // Note: biggest_drop_pct is a positive magnitude (e.g. 3.62 means -3.62%).
  this_month_return_pct?: number;
  total_return_pct?: number;
  biggest_drop_pct?: number;
  winning_rate_pct?: number;
}

export interface MoneyManagerProfile {
  account_id?: string;
  charge_on?: string;
  fee_timing?: string;
  minimum_start?: number;
  profit_sharing_fee_pct?: number;
  created_at?: string;
  updated_at?: string;
  id?: string;
}

export interface MoneyManager {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar?: string;
  status?: string;
  user_type?: string;
  created_at?: string;
  // New fields from mmcarddomain.Card (swagger 2026-05-26+).
  primary_account?: PrimaryAccount;
  profile?: MoneyManagerProfile;
  performance?: Performance;
  followers_count?: number;
  // Present only when the request is authenticated.
  is_saved?: boolean;
}

export interface MoneyManagerListResult {
  data: MoneyManager[];
  meta?: MetaData;
}

export interface MoneyManagerListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function getMoneyManagers(
  params: MoneyManagerListParams = {},
): Promise<MoneyManagerListResult> {
  const response = await apiRequest<MoneyManager[]>("/users/money-managers", {
    method: "GET",
    query: {
      page: params.page,
      limit: params.limit,
      search: params.search,
    },
  });
  return {
    data: response.data ?? [],
    meta: (response as { meta?: MetaData }).meta,
  };
}

export async function getMoneyManagerByUsername(username: string): Promise<MoneyManager> {
  // auth defaults to true: the endpoint is public, but the BE only fills
  // `is_saved` when a Bearer token is present. Without it, the Save-for-Later
  // toggle never reflects the persisted state.
  const response = await apiRequest<MoneyManager>(
    `/users/money-managers/${encodeURIComponent(username)}`,
    { method: "GET" },
  );
  if (!response.data) {
    throw new ApiError(404, response.message || "Money manager not found", response);
  }
  return response.data;
}
