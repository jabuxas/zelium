export type WebCameraCapture = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export type WebCameraProps = {
  visible: boolean;
  onCapture: (capture: WebCameraCapture) => void;
  onClose: () => void;
  onError?: (message: string) => void;
};
