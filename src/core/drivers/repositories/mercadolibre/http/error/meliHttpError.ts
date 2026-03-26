import axios from 'axios';

export class MeliHttpErrorHandler {
  static handle(error: unknown): null {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // 🟡 Errores esperables (NO rompen flujo)
      if (
        status === 400 || // parámetros inválidos (ML es muy estricto)
        status === 403 || // métricas no disponibles / permisos
        status === 404 // recurso inexistente
      ) {
        console.warn(
          `[MELI API] ${status} – ${error.response?.data?.message ?? 'No data'}`,
        );
        return null;
      }

      // 🔴 Errores reales
      console.error('[MELI API UPSTREAM ERROR]', {
        status: status ?? 'UNKNOWN',
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data,
        message: error.message,
      });

      throw new Error(
        `[MELI API ERROR] ${status ?? 'UNKNOWN'} – ${error.message}`,
      );
    }

    // 🔴 Error no Axios
    throw error;
  }
}
