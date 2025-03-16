/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_GITHUB_TOKEN: string
  readonly VITE_GITHUB_OWNER: string
  readonly VITE_GITHUB_REPO: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
