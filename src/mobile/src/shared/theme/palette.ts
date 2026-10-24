// Cores funcionais existentes no web; não substituem o manual da marca oficial.
export const palettes = {
  light: {
    background: '#f8fafc', surface: '#ffffff', surfaceVariant: '#f1f5f9',
    text: '#0f172a', secondaryText: '#475569', border: '#e2e8f0', outline: '#64748b',
    primary: '#2563eb', onPrimary: '#ffffff', primaryContainer: '#dbeafe', onPrimaryContainer: '#1e3a8a',
    error: '#b42318', errorContainer: '#fee4e2', onErrorContainer: '#7a271a',
    success: '#166534', successContainer: '#dcfce7', warning: '#92400e', warningContainer: '#fef3c7',
  },
  dark: {
    background: '#0b1220', surface: '#111c2e', surfaceVariant: '#1e293b',
    text: '#f8fafc', secondaryText: '#cbd5e1', border: '#334155', outline: '#94a3b8',
    primary: '#93c5fd', onPrimary: '#0f172a', primaryContainer: '#1e3a8a', onPrimaryContainer: '#dbeafe',
    error: '#fda29b', errorContainer: '#7a271a', onErrorContainer: '#fee4e2',
    success: '#86efac', successContainer: '#14532d', warning: '#fcd34d', warningContainer: '#78350f',
  },
} as const;
