/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * URL publica da API. Em desenvolvimento pode ficar vazia (o proxy do Vite
   * cuida do "/api"). Em producao (Vercel) aponte para a API, ex.:
   * "https://sua-api.onrender.com/api".
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
