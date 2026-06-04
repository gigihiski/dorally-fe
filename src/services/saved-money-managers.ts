import { apiRequest, type MetaData } from "@/lib/api";
import type { MoneyManagerProfile } from "./money-managers";

export interface SavedCardAccount {
  id: string;
  login?: string;
  name?: string;
  server?: string;
}

export interface SavedCardOwner {
  user_id?: string;
  username?: string;
  name?: string;
  avatar?: string;
}

export interface SavedCard {
  id: string;
  money_manager_account_id: string;
  saved_at?: string;
  account?: SavedCardAccount;
  owner?: SavedCardOwner;
  profile?: MoneyManagerProfile;
  investors_count?: number;
}

export interface SavedMoneyManager {
  id?: string;
  investor_user_id?: string;
  money_manager_account_id?: string;
  created_at?: string;
}

export interface ListSavedParams {
  page?: number;
  limit?: number;
}

export interface SavedListResult {
  data: SavedCard[];
  meta?: MetaData;
}

export async function listSavedMoneyManagers(
  params: ListSavedParams = {},
): Promise<SavedListResult> {
  const response = await apiRequest<SavedCard[]>("/me/saved-money-managers", {
    method: "GET",
    query: { page: params.page, limit: params.limit },
  });
  return {
    data: response.data ?? [],
    meta: (response as { meta?: MetaData }).meta,
  };
}

export async function saveMoneyManager(
  money_manager_account_id: string,
): Promise<SavedMoneyManager> {
  const response = await apiRequest<SavedMoneyManager>("/me/saved-money-managers", {
    method: "POST",
    body: { money_manager_account_id },
  });
  return response.data ?? {};
}

export async function unsaveMoneyManager(money_manager_account_id: string): Promise<void> {
  await apiRequest(`/me/saved-money-managers/${encodeURIComponent(money_manager_account_id)}`, {
    method: "DELETE",
  });
}
