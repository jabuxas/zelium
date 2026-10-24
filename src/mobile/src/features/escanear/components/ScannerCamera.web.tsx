import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native-paper';
import type { CameraViewProps } from 'expo-camera';

// Expo Web inicializa um worker externo ao importar a câmera; adie até o uso.
const Camera = lazy(() => import('expo-camera').then(module => ({ default: module.CameraView })));

export default function ScannerCamera(props: CameraViewProps) {
  return <Suspense fallback={<ActivityIndicator accessibilityLabel="Preparando câmera" />}><Camera {...props} /></Suspense>;
}
