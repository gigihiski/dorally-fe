import { ApiError, apiRequest } from "@/lib/api";

export interface PcxProfile {
  email_confirmed: boolean;
  kyc_approved: boolean;
  [key: string]: unknown;
}

export async function getPcxProfile(): Promise<PcxProfile> {
  const response = await apiRequest<PcxProfile>("/integrations/pcx/profile", {
    method: "GET",
  });
  const data = response.data ?? ({} as Partial<PcxProfile>);
  return {
    ...data,
    email_confirmed: data.email_confirmed === true,
    kyc_approved: data.kyc_approved === true,
  };
}

export interface PcxLinkStatus {
  linked?: boolean;
  kyc_approved?: boolean;
  external_user_id?: string;
  linked_at?: string;
  provider?: string;
}

export async function getPcxLinkStatus(): Promise<PcxLinkStatus> {
  const response = await apiRequest<PcxLinkStatus>("/integrations/pcx/status", {
    method: "GET",
  });
  return response.data ?? {};
}

export interface LinkRequest {
  email: string;
  password: string;
}

export interface LinkResult {
  provider: string;
  linked: boolean;
  linked_at?: string;
  external_user_id?: string;
  kyc_approved?: boolean;
}

export interface ExtendedMethod {
  id?: string;
  slug: string;
  name: string;
  currency?: string[];
  image_path?: string;
  parent_slug?: string;
  integration_id?: string;
  enabled?: boolean;
}

export interface DepositMethod {
  id: string;
  slug: string;
  name: string;
  currency: string[];
  image_path?: string;
  is_public?: boolean;
  restricted_countries?: string[];
  extended_methods?: ExtendedMethod[];
  extra?: Record<string, unknown>;
}

interface DepositMethodsResponse {
  methods?: DepositMethod[];
  extra?: Record<string, unknown>;
}

export async function getPcxDepositMethods(): Promise<DepositMethod[]> {
  const response = await apiRequest<DepositMethodsResponse>("/integrations/pcx/deposits/methods", {
    method: "GET",
  });
  return response.data?.methods ?? [];
}

export interface NextAction {
  type?: string;
  redirect_url?: string;
  widget_url?: string;
  widget_data?: Record<string, unknown>;
  pending_url?: string;
  success_url?: string;
  error_url?: string;
}

export interface DepositRequest {
  account_id: string;
  amount: number;
  currency: string;
  method_id: string;
  integration_id: string;
  ext_merchant?: string;
  extended_merchant?: string;
}

export interface TransactionResult {
  transaction_id?: string;
  external_transaction_id?: string;
  provider?: string;
  amount?: number;
  currency?: string;
  status?: string;
  next_action?: NextAction;
}

export async function createPcxDeposit(payload: DepositRequest): Promise<TransactionResult> {
  const response = await apiRequest<TransactionResult>("/integrations/pcx/deposits", {
    method: "POST",
    body: payload,
  });
  return response.data ?? {};
}

export interface PcxAccount {
  id: string;
  number?: number;
  nickname?: string;
  balance?: number;
  currency?: string;
  enabled?: boolean;
  type?: string;
  platform?: { id?: string; type?: string };
  account_type?: { id?: string; name?: string; type?: string; can_deposit?: boolean };
  [key: string]: unknown;
}

export type PcxAccountsGrouped = Partial<
  Record<"trading" | "demo" | "ib" | "mam" | "investor" | "wallet" | "affiliate", PcxAccount[]>
>;

export async function getPcxAccounts(): Promise<PcxAccountsGrouped> {
  const response = await apiRequest<PcxAccountsGrouped>("/integrations/pcx/accounts", {
    method: "GET",
  });
  return response.data ?? {};
}

export async function linkPcxAccount(payload: LinkRequest): Promise<LinkResult> {
  try {
    const response = await apiRequest<LinkResult>("/integrations/pcx/link", {
      method: "POST",
      body: payload,
    });
    return response.data ?? { provider: "pcx", linked: true };
  } catch (err) {
    // 409 has two meanings on this endpoint:
    //   a) "this Batman user is already linked to PCX" — idempotent success
    //   b) "the PCX trader is already linked to a *different* Batman user" — real conflict
    // Backend distinguishes via the error message: "another user" indicates case (b).
    if (err instanceof ApiError && err.status === 409) {
      const message = (err.message || "").toLowerCase();
      if (message.includes("another user")) throw err;
      return { provider: "pcx", linked: true };
    }
    throw err;
  }
}

export interface RegisterLiveRequest {
  email: string;
  first_name: string;
  last_name: string;
  country: string;
  password: string;
  phone: string;
}

export interface RegisterLiveResult {
  provider?: string;
  success?: boolean;
}

export async function registerLivePcx(payload: RegisterLiveRequest): Promise<RegisterLiveResult> {
  const response = await apiRequest<RegisterLiveResult>("/integrations/pcx/register-live", {
    method: "POST",
    body: payload,
    auth: false,
  });
  return response.data ?? {};
}

export async function registerDemoPcx(payload: RegisterLiveRequest): Promise<RegisterLiveResult> {
  const response = await apiRequest<RegisterLiveResult>("/integrations/pcx/register-demo", {
    method: "POST",
    body: payload,
    auth: false,
  });
  return response.data ?? {};
}
