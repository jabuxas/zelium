import {
  createContext,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Portal } from "react-native-paper";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "error" | "success" | "info";

type ToastState = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

const TYPE_COLORS: Record<ToastType, ColorValue> = {
  error: "#B3261E",
  success: "#1B6D3A",
  info: "#2f95dc",
};

const DURATION_MS = 4000;
const ENTER_MS = 180;
const EXIT_MS = 220;

function ToastItem({ toast }: { toast: ToastState }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(DURATION_MS - ENTER_MS - EXIT_MS),
      Animated.timing(progress, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress]);

  const animatedStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-16, 0],
          }),
        },
      ],
    }),
    [progress],
  );

  return (
    <Animated.View
      testID="snackbar"
      style={[
        styles.toast,
        { backgroundColor: TYPE_COLORS[toast.type] },
        animatedStyle,
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.accent} />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timerRefs = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextIdRef = useRef(1);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = nextIdRef.current++;
    const timer = setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timerRefs.current.delete(id);
    }, DURATION_MS);

    timerRefs.current.set(id, timer);
    setToasts((current) => [...current, { id, message, type }]);
  }, []);

  useEffect(() => {
    const timers = timerRefs.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: show }}>
      {children}
      <Portal>
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: insets.top + 12,
            paddingHorizontal: 16,
            gap: 8,
            zIndex: 1000,
          }}
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} />
          ))}
        </View>
      </Portal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    borderRadius: 8,
    elevation: 6,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  accent: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderRadius: 999,
    width: 4,
  },
  toastText: {
    color: "#fff",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
