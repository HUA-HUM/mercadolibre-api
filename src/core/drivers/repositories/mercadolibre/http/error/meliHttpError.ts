import { BadGatewayException, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MAX_LOGGED_BODY_LENGTH = 300;

/**
 * Mercado Libre respondió 429 (rate limit). Se propaga al cliente como 429
 * con header Retry-After (ver MeliRateLimitFilter) para que espere y reintente.
 */
export class MeliRateLimitException extends HttpException {
  constructor(
    public readonly retryAfterSeconds: number,
    path?: string,
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'too_many_requests',
        message: 'Mercado Libre rate limit reached. Retry later.',
        retryAfterSeconds,
        path,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

const parseRetryAfter = (value: unknown): number => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds)
    : DEFAULT_RETRY_AFTER_SECONDS;
};

const compact = (data: unknown): string => {
  if (data === undefined || data === null) return '';
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return text.length > MAX_LOGGED_BODY_LENGTH
    ? `${text.slice(0, MAX_LOGGED_BODY_LENGTH)}…`
    : text;
};

export class MeliHttpErrorHandler {
  static handle(error: unknown): null {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
      const url = error.config?.url ?? 'unknown';
      const data = error.response?.data as { message?: string } | undefined;

      // 🟡 Errores esperables (NO rompen flujo)
      if (
        status === 400 || // parámetros inválidos (ML es muy estricto)
        status === 403 || // métricas no disponibles / permisos
        status === 404 // recurso inexistente
      ) {
        console.warn(
          `[MELI API] ${status} ${method} ${url} – ${data?.message ?? 'No data'}`,
        );
        return null;
      }

      // 🟠 Rate limit: una sola línea de log y 429 al cliente
      if (status === 429) {
        const retryAfter = parseRetryAfter(
          error.response?.headers?.['retry-after'],
        );
        console.warn(
          `[MELI API] 429 ${method} ${url} – rate limited, retry after ${retryAfter}s`,
        );
        throw new MeliRateLimitException(retryAfter, url);
      }

      // 🔴 Errores reales: una sola línea de log y 502 al cliente
      console.error(
        `[MELI API UPSTREAM ERROR] ${status ?? 'UNKNOWN'} ${method} ${url} – ${error.message} ${compact(data)}`.trim(),
      );

      throw new BadGatewayException({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: `[MELI API ERROR] ${status ?? 'UNKNOWN'} – ${error.message}`,
        meliStatus: status ?? null,
      });
    }

    // 🔴 Error no Axios
    throw error;
  }
}
