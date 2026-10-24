import { Image, type ImageProps } from 'react-native';
import { useSyncExternalStore } from 'react';
import { getAuthToken, subscribeAuthToken } from '@/src/shared/auth/tokenStore';
import { privatePhotoHeaders } from './photoAccess';

export type AuthenticatedImageProps = Omit<ImageProps, 'source'> & { uri: string | undefined };

export function AuthenticatedImage({ uri, ...props }: AuthenticatedImageProps) {
  const token = useSyncExternalStore(subscribeAuthToken, getAuthToken, () => null);
  const headers = privatePhotoHeaders(uri, token);
  return <Image {...props} source={{ uri, ...(headers ? { headers, cache: 'reload' as const } : {}) }} />;
}
