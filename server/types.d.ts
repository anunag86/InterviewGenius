// Add global type declarations to TypeScript

// Extend the global namespace to include our token storage
declare global {
  var linkedInLastToken: {
    token: string | null;
    tokenType: string | null;
    params: any;
    timestamp: string | null;
  } | undefined;
}

export {};