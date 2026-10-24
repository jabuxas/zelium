import { buildPaperTheme } from '../tokens';

function luminancia(hex: string) {
  const normal = hex.replace('#', '');
  const full = normal.length === 3 ? normal.split('').map(x => x + x).join('') : normal;
  const canais = [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return canais[0]! * 0.2126 + canais[1]! * 0.7152 + canais[2]! * 0.0722;
}

it.each(['light', 'dark'] as const)('%s mantém contraste AA nas cores de leitura e ação', scheme => {
  const { colors } = buildPaperTheme(scheme);
  for (const [texto, fundo] of [[colors.onSurface, colors.surface], [colors.onBackground, colors.background], [colors.onPrimary, colors.primary], [colors.onSurfaceVariant, colors.surface]]) {
    const a = luminancia(texto!), b = luminancia(fundo!);
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});

it('usa a cor funcional do web e diferencia superfície de fundo', () => {
  const theme = buildPaperTheme('light');
  expect(theme.colors.primary).toBe('#2563eb');
  expect(theme.colors.surface).not.toBe(theme.colors.background);
});
