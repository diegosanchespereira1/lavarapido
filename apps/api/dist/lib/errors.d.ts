import type { Context } from "hono";
/** Respostas de erro sempre em PT-BR. */
export interface ApiErrorBody {
    erro: string;
    codigo?: string;
    /** ID único por requisição (útil ao cruzar com logs). */
    requestId?: string;
    detalhes?: unknown;
}
export declare const CODIGOS: {
    readonly TOKEN_INVALIDO: "TOKEN_INVALIDO";
    readonly TOKEN_AUSENTE: "TOKEN_AUSENTE";
    readonly NAO_AUTORIZADO: "NAO_AUTORIZADO";
    readonly CONFLITO: "CONFLITO";
    readonly VALIDACAO: "VALIDACAO";
    readonly NAO_ENCONTRADO: "NAO_ENCONTRADO";
    readonly SERVICO_INDISPONIVEL: "SERVICO_INDISPONIVEL";
};
export declare function problema(c: Context, status: number, erro: string, codigo?: string, detalhes?: unknown): Response;
//# sourceMappingURL=errors.d.ts.map