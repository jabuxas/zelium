import { useState } from 'react';
import { Linking, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';

export interface ScannerCameraProps { onScanned: (data: string) => void }

export default function ScannerCamera({ onScanned }: ScannerCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState(false);
  if (!permission) return <ActivityIndicator accessibilityLabel="Verificando permissão da câmera" />;
  if (error) return <Text accessibilityRole="alert">Não foi possível abrir a câmera. Você pode digitar o número do patrimônio.</Text>;
  if (!permission.granted) return <View style={{ gap: 12 }}>
    <Text>Permita o uso da câmera para ler a etiqueta. Você também pode digitar o número do patrimônio.</Text>
    <Button mode="outlined" onPress={() => {
      const operation = permission.canAskAgain ? requestPermission() : Linking.openSettings();
      void operation.catch(() => setError(true));
    }}>{permission.canAskAgain ? 'Permitir câmera' : 'Abrir configurações'}</Button>
  </View>;
  return <CameraView testID="camera-view" style={{ height: 240, width: '100%' }} facing="back"
    barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={result => onScanned(result.data)} onMountError={() => setError(true)} />;
}
