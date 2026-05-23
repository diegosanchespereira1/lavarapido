export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface ApiClientOptions {
  baseUrl: string;
  /** Token fixo ou função para renovar (Bearer). */
  getToken?: () => string | undefined | Promise<string | undefined>;
  /** Filial ativa enviada em `X-Branch-Id`. */
  branchId?: string;
  /** Permite injetar fetch (ex.: testes). */
  fetchImpl?: FetchLike;
}

/** Remove barra final da base para montar URLs. */
function trimBase(base: string): string {
  return base.replace(/\/+$/, "");
}

/**
 * Cliente HTTP mínimo para a API `/v1` com Authorization e cabeçalho de filial.
 */
export class ApiClient {
  readonly baseUrl: string;
  #getToken?: ApiClientOptions["getToken"];
  #branchId?: string;
  #fetchImpl: FetchLike;

  constructor(options: ApiClientOptions) {
    this.baseUrl = trimBase(options.baseUrl);
    this.#getToken = options.getToken;
    this.#branchId = options.branchId;
    this.#fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  setBranchId(branchId: string | undefined): void {
    this.#branchId = branchId;
  }

  /** Monta caminho sob `/v1`. */
  v1(path: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}/v1${p}`;
  }

  async headers(extra?: HeadersInit): Promise<Headers> {
    const h = new Headers(extra);
    h.set("Accept", "application/json");
    if (typeof this.#getToken === "function") {
      const tok = await this.#getToken();
      if (tok) h.set("Authorization", `Bearer ${tok}`);
    }
    if (this.#branchId) h.set("X-Branch-Id", this.#branchId);
    return h;
  }

  async get(path: string, init?: RequestInit): Promise<Response> {
    return this.#fetchImpl(this.v1(path), {
      ...init,
      method: "GET",
      headers: await this.headers(init?.headers),
    });
  }

  async delete(path: string, init?: RequestInit): Promise<Response> {
    return this.#fetchImpl(this.v1(path), {
      ...init,
      method: "DELETE",
      headers: await this.headers(init?.headers),
    });
  }

  async post(path: string, body?: unknown, init?: RequestInit): Promise<Response> {
    const headers = await this.headers(init?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return this.#fetchImpl(this.v1(path), {
      ...init,
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async patch(path: string, body?: unknown, init?: RequestInit): Promise<Response> {
    const headers = await this.headers(init?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return this.#fetchImpl(this.v1(path), {
      ...init,
      method: "PATCH",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async put(path: string, body?: unknown, init?: RequestInit): Promise<Response> {
    const headers = await this.headers(init?.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return this.#fetchImpl(this.v1(path), {
      ...init,
      method: "PUT",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
}
