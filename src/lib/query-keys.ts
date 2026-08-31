export const qk = {
  memories: {
    dashboard: (u?: string, lang?: string, f?: unknown) =>
      ['memories', 'dashboard', { u, lang, f }] as const,
    folder: (id: string, u?: string, lang?: string, f?: unknown) =>
      ['memories', 'folder', id, { u, lang, f }] as const,
    detail: (id: string) => ['memories', 'detail', id] as const,
  },
  galleries: {
    detail: (id: string) => ['galleries', 'detail', id] as const,
  },
};
