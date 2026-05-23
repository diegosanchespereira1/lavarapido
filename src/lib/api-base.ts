const LOCAL_API = "http://localhost:3011";

/** URL da API no browser (ignora localhost embutido no build de produção). */
export function resolveApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window === "undefined") {
    return envUrl && !envUrl.includes("localhost") ? envUrl : LOCAL_API;
  }

  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return envUrl ?? LOCAL_API;
  }

  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl.replace(/\/$/, "");
  }

  // lavarapido.cliente.com → apilarapido.cliente.com
  if (hostname.startsWith("lavarapido.")) {
    return `${protocol}//apilarapido.${hostname.slice("lavarapido.".length)}`;
  }

  // lava.cliente.com → apilava.cliente.com
  if (hostname.startsWith("lava.")) {
    return `${protocol}//apilava.${hostname.slice("lava.".length)}`;
  }

  return envUrl ?? LOCAL_API;
}
