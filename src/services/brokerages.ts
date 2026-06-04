import { apiRequest, type MetaData } from "@/lib/api";

export interface Brokerage {
  id: string;
  name: string;
  server?: string;
  description?: string;
  logo?: string;
  status?: string;
  login?: string;
  timeout?: number;
  created_at?: string;
}

export interface BrokerageListParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BrokerageListResult {
  data: Brokerage[];
  meta?: MetaData;
}

export async function getBrokerages(
  params: BrokerageListParams = {},
): Promise<BrokerageListResult> {
  const response = await apiRequest<Brokerage[]>("/brokerages", {
    method: "GET",
    query: {
      status: params.status,
      search: params.search,
      page: params.page,
      limit: params.limit,
    },
    auth: false,
  });
  return {
    data: response.data ?? [],
    meta: (response as { meta?: MetaData }).meta,
  };
}
