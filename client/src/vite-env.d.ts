/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESOURCE_VERSION: string;
  /** QQ互联「网站应用」的 AppID（可选）：填了分享时会带上 share_id，不填也能用。 */
  readonly VITE_QQ_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
