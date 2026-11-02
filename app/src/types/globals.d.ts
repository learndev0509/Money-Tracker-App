/** Filled in by vite.config.ts `define` from package.json and the build date. */
declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;

interface Navigator {
  /** iOS Safari: true when running as a Home Screen app. */
  standalone?: boolean;
  setAppBadge?(count?: number): Promise<void>;
  clearAppBadge?(): Promise<void>;
}
