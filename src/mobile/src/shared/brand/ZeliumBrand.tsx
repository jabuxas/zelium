import { useState } from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { zeliumBrand } from './config';

export function ZeliumBrand({ logoSource = zeliumBrand.logoSource }: { logoSource?: ImageSourcePropType | null }) {
  const theme = useTheme();
  const [falhou, setFalhou] = useState(false);
  if (logoSource && !falhou) return <Image source={logoSource} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo Zelium" onError={() => setFalhou(true)} />;
  return <Text variant="headlineMedium" style={[styles.nome, { color: theme.colors.onSurface }]}>{zeliumBrand.nome}</Text>;
}

const styles = StyleSheet.create({
  logo: { width: 148, height: 44, maxWidth: '100%' },
  nome: { fontWeight: '700', letterSpacing: -0.5 },
});
