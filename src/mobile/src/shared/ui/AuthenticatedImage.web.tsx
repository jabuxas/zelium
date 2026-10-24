import { useEffect, useState, useSyncExternalStore } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { authGeneration, expireSession, getAuthToken, subscribeAuthToken } from '@/src/shared/auth/tokenStore';
import { privatePhotoHeaders } from './photoAccess';
import type { AuthenticatedImageProps } from './AuthenticatedImage';

export function AuthenticatedImage({ uri, ...props }: AuthenticatedImageProps) {
  const token = useSyncExternalStore(subscribeAuthToken, getAuthToken, () => null);
  if (!privatePhotoHeaders(uri, token)) return <Image {...props} source={{ uri }} />;
  return <PrivatePhoto key={`${authGeneration()}:${uri}`} uri={uri!} token={token!} {...props} />;
}

function PrivatePhoto({ uri, token, ...props }: AuthenticatedImageProps & { uri: string; token: string }) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const generation = authGeneration();
    let objectUrl: string | undefined;
    fetch(uri, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
      .then(async res => {
        if (res.status === 401) expireSession(generation);
        if (!res.ok) throw new Error('Foto indisponível');
        return res.blob();
      }).then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [uri, token]);
  if (source) return <Image {...props} source={{ uri: source }} />;
  const { width, height, aspectRatio, borderRadius } = StyleSheet.flatten(props.style) ?? {};
  return <View style={{ width, height, aspectRatio, borderRadius, alignItems: 'center', justifyContent: 'center' }} testID={props.testID}>{error ? <Text>Foto indisponível</Text> : <ActivityIndicator accessibilityLabel="Carregando foto" />}</View>;
}
