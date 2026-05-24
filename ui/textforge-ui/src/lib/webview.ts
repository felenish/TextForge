export interface WebViewBridge {
  addEventListener(type: 'message', fn: (e: MessageEvent) => void): void;
  removeEventListener(type: 'message', fn: (e: MessageEvent) => void): void;
  postMessage(msg: string): void;
}

/** Returns the WebView2 message bridge, or undefined when running in a plain browser. */
export function getWebView(): WebViewBridge | undefined {
  return (window as { chrome?: { webview?: WebViewBridge } }).chrome?.webview;
}

export type HostMessage =
  | 'save-all'
  | { type: 'update-available'; version: string };

export type AppMessage =
  | 'app-ready'
  | 'save-complete'
  | 'do-update';

/** Post "do-update" to the WPF host. No-op in a plain browser. */
export function requestUpdate() {
  getWebView()?.postMessage('do-update');
}

/** Open a URL in the system default browser. No-op in a plain browser. */
export function openUrl(url: string) {
  getWebView()?.postMessage(JSON.stringify({ type: 'open-url', url }));
}
