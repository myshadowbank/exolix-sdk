/*
 * Exolix API v2 TypeScript SDK (single-file)
 * Docs: https://exolix.com/developers
 * Endpoints covered:
 * - GET   /currencies
 * - GET   /currencies/{code}/networks
 * - GET   /currencies/networks
 * - GET   /rate
 * - GET   /transactions
 * - GET   /transactions/{id}
 * - POST  /transactions
 *
 * Usage:
 *   const api = new Exolix({ apiKey: process.env.EXOLIX_API_KEY });
 *   const { data } = await api.listCurrencies({ page: 1, size: 50, withNetworks: true });
 *
 * Notes:
 * - Some endpoints require an API key via `Authorization` header. See docs.
 * - This SDK works in both browser and Node (Node v18+ has global fetch).
 * - If you need a polyfill or want custom fetch, pass `fetch` in the constructor.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type RateType = "float" | "fixed";

export interface ExolixOptions {
  /** Your Exolix API key (sent as `Authorization` header). */
  apiKey?: string;
  /** Base URL for the API. Default: "https://exolix.com/api/v2" */
  baseUrl?: string;
  /** Optional custom fetch implementation */
  fetch?: typeof globalThis.fetch;
  /** Abort signal applied to all requests unless overridden per-call */
  signal?: AbortSignal;
  /** Default timeout ms per request. If provided, will auto-abort. */
  timeoutMs?: number;
}

export interface Paginated<T> {
  data: T[];
  count: number;
}

export interface CurrencyNetwork {
  network: string;
  name: string;
  shortName: string | null;
  notes: string | null;
  addressRegex?: string | null; // docs show addressRegex typo: addresRegex in one section
  addresRegex?: string | null;  // keep both for forward-compat
  isDefault: boolean;
  blockExplorer: string | null;
  memoNeeded: boolean;
  memoName: string | null;
  memoRegex: string | null;
  precision: number | boolean; // docs show boolean in one spot and number in another; accept both
  decimal: number | null;
  contract: string | null;
  icon: string | null;
}

export interface CurrencyItem {
  code: string;
  name: string;
  icon: string;
  notes: string;
  networks?: CurrencyNetwork[]; // only when withNetworks=true
}

export interface ListCurrenciesParams {
  page?: number;
  size?: number;
  search?: string;
  withNetworks?: boolean;
}

export interface ListNetworksParams {
  page?: number;
  size?: number;
  search?: string;
}

export interface RateParams {
  coinFrom: string;
  coinTo: string;
  amount?: string | number; // one of amount or withdrawalAmount is required by docs
  withdrawalAmount?: string | number;
  rateType: RateType; // required per docs ("fixed" or "float")
  networkFrom?: string;
  networkTo?: string;
}

export interface RateResponse {
  fromAmount: number;
  toAmount: number;
  rate: number;
  message: string | null;
  minAmount: number;
  withdrawMin: number;
  maxAmount: number;
}

export interface TransactionCoin {
  coinCode: string;
  coinName: string;
  network: string;
  networkName: string;
  networkShortName: string | null;
  icon: string;
  memoName: string | null;
  contract: string | null;
}

export type TransactionStatus =
  | "wait"
  | "confirmation"
  | "confirmed"
  | "exchanging"
  | "sending"
  | "success"
  | "overdue"
  | "refunded";

export type TransactionSource = "api" | "referral";

export interface HashLink {
  hash: string | null;
  link: string | null;
}

export interface Transaction {
  id: string;
  amount: number;
  amountTo: number;
  coinFrom: TransactionCoin;
  coinTo: TransactionCoin;
  comment: string | null;
  createdAt: string; // ISO date
  depositAddress: string;
  depositExtraId: string | null;
  withdrawalAddress: string;
  withdrawalExtraId?: string | null;
  hashIn: HashLink;
  hashOut: HashLink;
  rate: number;
  rateType: RateType;
  refundAddress: string | null;
  refundExtraId: string | null;
  status: TransactionStatus;
  source?: TransactionSource;
}

export interface ListTransactionsParams {
  page?: number;
  size?: number;
  search?: string; // by transaction id
  sort?: string;  // by field name
  order?: "asc" | "desc";
  dateFrom?: string; // ISO datetime
  dateTo?: string;   // ISO datetime
  statuses?: string; // comma-separated according to docs
}

export interface CreateTransactionBody {
  coinFrom: string;
  networkFrom: string;
  coinTo: string;
  networkTo: string;
  amount?: number; // or
  withdrawalAmount?: number; // either amount OR withdrawalAmount (docs show both supported)
  withdrawalAddress: string;
  withdrawalExtraId?: string;
  rateType?: RateType; // default fixed per docs, but they also say default fixed; we accept both
  refundAddress?: string;
  refundExtraId?: string;
  slippage?: number; // %; refundAddress required if slippage is provided
}

// export interface CreateTransactionResponse extends Transaction {}

export class exolix {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly _fetch: typeof globalThis.fetch;
  private readonly defaultSignal?: AbortSignal;
  private readonly timeoutMs?: number;

  constructor(opts: ExolixOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "https://exolix.com/api/v2").replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this._fetch = opts.fetch ?? (globalThis.fetch as typeof globalThis.fetch);
    if (!this._fetch) {
      throw new Error("No fetch implementation found. Provide one in ExolixOptions.fetch or use an environment with global fetch (e.g., Node 18+ or browsers). ");
    }
    this.defaultSignal = opts.signal;
    this.timeoutMs = opts.timeoutMs;
  }

  // ===== Common =====

  /** List available currencies (optionally include networks). */
  async listCurrencies(params: ListCurrenciesParams = {}, init?: RequestInit): Promise<Paginated<CurrencyItem>> {
    return this._get<Paginated<CurrencyItem>>("/currencies", (params as any), init);
  }

  /** Get networks by currency code. */
  async getCurrencyNetworks(code: string, init?: RequestInit): Promise<CurrencyNetwork[]> {
    if (!code) throw new Error("code is required");
    return this._get<CurrencyNetwork[]>(`/currencies/${encodeURIComponent(code)}/networks`, undefined, init);
  }

  /** List all networks (paginated). */
  async listNetworks(params: ListNetworksParams = {}, init?: RequestInit): Promise<Paginated<CurrencyNetwork>> {
    return this._get<Paginated<CurrencyNetwork>>("/currencies/networks", (params as any), init);
  }

  /** Get rate / limits for a specific pair and amount. */
  async getRate(params: RateParams, init?: RequestInit): Promise<RateResponse> {
    if (!params || !params.coinFrom || !params.coinTo || !params.rateType) {
      throw new Error("coinFrom, coinTo and rateType are required");
    }
    if (params.amount == null && params.withdrawalAmount == null) {
      throw new Error("Either amount or withdrawalAmount must be provided");
    }
    return this._get<RateResponse>("/rate", (params as any), init);
  }

  // ===== Exchange =====

  /**
   * List transaction history (requires API key for account-related history per docs).
   */
  async listTransactions(params: ListTransactionsParams = {}, init?: RequestInit): Promise<Paginated<Transaction>> {
    return this._get<Paginated<Transaction>>("/transactions", (params as any), init);
  }

  /** Get a single transaction by id. */
  async getTransaction(id: string, init?: RequestInit): Promise<Transaction> {
    if (!id) throw new Error("id is required");
    return this._get<Transaction>(`/transactions/${encodeURIComponent(id)}`, undefined, init);
  }

  /** Create an exchange transaction. */
  async createTransaction(body: CreateTransactionBody, init?: RequestInit): Promise<Transaction> {
    if (!body) throw new Error("body is required");
    const required = ["coinFrom", "networkFrom", "coinTo", "networkTo", "withdrawalAddress"] as const;
    for (const k of required) {
      if (!(k in body) || (body as any)[k] == null || (body as any)[k] === "") {
        throw new Error(`${k} is required`);
      }
    }
    if (body.amount == null && body.withdrawalAmount == null) {
      throw new Error("Either amount or withdrawalAmount must be provided");
    }
    return this._post<Transaction>("/transactions", body, init);
  }

  // ===== Low-level helpers =====

  private _headers(extra?: HeadersInit, authOverride?: boolean): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    // The docs specify to send Authorization header with the raw API key (no Bearer)
    if ((authOverride ?? true) && this.apiKey) {
      headers["Authorization"] = this.apiKey;
    }
    if (extra) {
      // Merge user headers (user headers win)
      for (const [k, v] of Object.entries(extra as Record<string, string>)) headers[k] = v as string;
    }
    return headers;
  }

  private _buildQuery(params?: Record<string, unknown>): string {
    if (!params) return "";
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      usp.append(k, String(v));
    }
    const q = usp.toString();
    return q ? `?${q}` : "";
  }

  private async _applyTimeout(signal?: AbortSignal): Promise<AbortSignal | undefined> {
    const timeoutMs = this.timeoutMs;
    if (!timeoutMs) return signal ?? this.defaultSignal;
    const controller = new AbortController();
    const signals: AbortSignal[] = [];
    if (signal) signals.push(signal);
    if (this.defaultSignal) signals.push(this.defaultSignal);

    // If any of the provided signals abort, propagate
    for (const s of signals) {
      if (s.aborted) controller.abort();
      else s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
    }

    const t = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);
    // Clear on completion handled by caller (fetch finally)
    (controller as any)._exolixTimeout = t;
    return controller.signal;
  }

  private async _request<T>(path: string, init?: RequestInit & { auth?: boolean; query?: Record<string, unknown> }): Promise<T> {
    const url = `${this.baseUrl}${path}${this._buildQuery(init?.query as any)}`;
    const { auth, query, ...rest } = init || {};
    const headers = this._headers(rest?.headers, auth ?? true);

    const signal = await this._applyTimeout((rest?.signal as any));

    let timeoutHandle: any;
    try {
      const res = await this._fetch(url, {
        method: rest?.method ?? "GET",
        headers,
        body: rest?.body,
        signal,
      });
      // Clear timeout if set
      timeoutHandle = (signal as any)?.owner?._exolixTimeout ?? (signal as any)?._exolixTimeout;
      if (timeoutHandle) clearTimeout(timeoutHandle);

      const text = await res.text();
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const payload = isJson && text ? (JSON.parse(text) as any) : (text as unknown as any);

      if (!res.ok) {
        const message = (payload && (payload.message || payload.error || payload.detail)) || res.statusText || "Request failed";
        const error = new ExolixError(message, res.status, url, payload);
        throw error;
      }
      return payload as T;
    } catch (err: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (err?.name === "AbortError") {
        throw new ExolixError("The request was aborted", 0, url);
      }
      if (err instanceof ExolixError) throw err;
      throw new ExolixError(err?.message || "Unknown network error", 0, url);
    }
  }

  private _get<T>(path: string, query?: Record<string, unknown>, init?: RequestInit): Promise<T> {
    return this._request<T>(path, { ...init, method: "GET", query });
    }

  private _post<T>(path: string, body?: any, init?: RequestInit): Promise<T> {
    return this._request<T>(path, { ...init, method: "POST", body: JSON.stringify(body ?? {}) });
  }
}

export class ExolixError extends Error {
  public readonly status: number;
  public readonly url: string;
  public readonly data?: any;
  constructor(message: string, status: number, url: string, data?: any) {
    super(message);
    this.name = "ExolixError";
    this.status = status;
    this.url = url;
    this.data = data;
  }
}

// ---- OPTIONAL: tiny default export for convenience ----
export default exolix;
