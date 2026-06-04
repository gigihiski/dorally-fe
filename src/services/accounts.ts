import { apiRequest, type MetaData } from "@/lib/api";

export interface FolloweeInfo {
  account_id?: string;
  login?: string;
  [k: string]: unknown;
}

export interface AccountDetail {
  id: string;
  login: string;
  name?: string;
  server?: string;
  group?: string;
  status?: string;
  balance?: number;
  credit?: number;
  debit?: number;
  leverage?: number;
  investors_count?: number;
  rights?: number;
  followees?: FolloweeInfo[];
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  currency?: string;
  external_account_id?: string;
  provider?: string;
  account_type?: string;
}

export interface ListAccountsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AccountListResult {
  data: AccountDetail[];
  meta?: MetaData;
}

export async function getMyAccounts(params: ListAccountsParams = {}): Promise<AccountListResult> {
  const response = await apiRequest<AccountDetail[]>("/accounts/me", {
    method: "GET",
    query: {
      status: params.status,
      search: params.search,
      page: params.page,
      limit: params.limit,
    },
  });
  return {
    data: response.data ?? [],
    meta: (response as { meta?: MetaData }).meta,
  };
}
