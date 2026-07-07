interface MetabaseConfig {
  jwt?: string;
  isGuest?: boolean;
  instanceUrl: string;
  theme?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Window {
  metabaseConfig?: MetabaseConfig;
}

declare namespace JSX {
  interface IntrinsicElements {
    "metabase-dashboard": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        "with-title"?: string;
        "with-downloads"?: string;
      },
      HTMLElement
    >;
  }
}
