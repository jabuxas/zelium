import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { WebCameraProps } from "./WebCamera.types";

export function WebCamera({
  visible,
  onCapture,
  onClose,
  onError,
}: WebCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        setReady(true);
      })
      .catch(() => {
        onError?.("Não foi possível acessar a câmera do navegador.");
        onClose();
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [visible, onClose, onError]);

  if (!visible) return null;

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture({
      uri: canvas.toDataURL("image/jpeg", 0.8),
      fileName: `camera-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
    });
    onClose();
  };

  return createPortal(
    <div style={overlayStyle}>
      <div style={boxStyle}>
        <video ref={videoRef} autoPlay playsInline muted style={videoStyle} />
        <div style={rowStyle}>
          <button type="button" onClick={onClose} style={secondaryButton}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!ready}
            style={primaryButton}
          >
            Capturar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const boxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  maxWidth: "90vw",
};

const videoStyle: CSSProperties = {
  width: "100%",
  maxWidth: 480,
  borderRadius: 8,
  backgroundColor: "#000",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 12,
};

const buttonBase: CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  fontSize: 16,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  ...buttonBase,
  backgroundColor: "#6750a4",
  color: "#fff",
};

const secondaryButton: CSSProperties = {
  ...buttonBase,
  backgroundColor: "#e0e0e0",
  color: "#000",
};
