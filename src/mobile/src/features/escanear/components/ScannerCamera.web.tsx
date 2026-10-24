import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native-paper';
import jsQR from 'jsqr';
import type { ScannerCameraProps } from './ScannerCamera';

/** Leitor empacotado no app: não importa o worker/CDN do expo-camera web. */
export default function ScannerCamera({ onScanned }: ScannerCameraProps) {
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onScanned);
  callback.current = onScanned;
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    const canvas = document.createElement('canvas');
    const stop = () => { stream?.getTracks().forEach(track => track.stop()); };

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (disposed) { stop(); return; }
        const element = video.current;
        if (!element) { stop(); return; }
        element.srcObject = stream;
        await element.play();
        if (disposed) return;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Canvas indisponível');

        const scan = () => {
          if (disposed) return;
          try {
            if (element.readyState >= 2 && element.videoWidth > 0) {
              const scale = Math.min(1, 640 / element.videoWidth);
              canvas.width = Math.round(element.videoWidth * scale);
              canvas.height = Math.round(element.videoHeight * scale);
              context.drawImage(element, 0, 0, canvas.width, canvas.height);
              const frame = context.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(frame.data, frame.width, frame.height);
              if (code) callback.current(code.data);
            }
            timer = window.setTimeout(scan, 300);
          } catch {
            stop(); setError(true);
          }
        };
        scan();
      } catch {
        stop();
        if (!disposed) setError(true);
      }
    }
    void start();
    return () => { disposed = true; window.clearTimeout(timer); stop(); };
  }, []);

  if (error) return <Text accessibilityRole="alert">Não foi possível abrir a câmera. Verifique a permissão do navegador ou digite o número do patrimônio.</Text>;
  return <video ref={video} autoPlay muted playsInline aria-label="Prévia da câmera para leitura de QR" style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 8 }} />;
}
