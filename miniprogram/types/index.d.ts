interface IAppOption {
  globalData: {
    apiBaseUrl: string;
    user: {
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
      role: string;
      status: string;
    } | null;
    loginReady: Promise<string> | null;
    sessionEpoch: number;
  };
  ensureSession: (options?: {
    optional?: boolean;
    forceLogin?: boolean;
  }) => Promise<string>;
}
