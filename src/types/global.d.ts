export {};

declare global {
  interface Window {
    debug?: (enabled?: boolean) => boolean;
  }
}
