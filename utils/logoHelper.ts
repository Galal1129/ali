import { Platform, Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export async function getLogoBase64(): Promise<string> {
  try {
    const resolveAssetSource = Image.resolveAssetSource(
      require('@/assets/images/logo_1.png')
    );

    if (Platform.OS === 'web') {
      return resolveAssetSource.uri;
    }

    const base64 = await FileSystem.readAsStringAsync(resolveAssetSource.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error loading logo:', error);
    const resolveAssetSource = Image.resolveAssetSource(
      require('@/assets/images/logo_1.png')
    );
    return resolveAssetSource.uri;
  }
}

export function getLogoUrl(): string {
  const resolveAssetSource = Image.resolveAssetSource(
    require('@/assets/images/logo_1.png')
  );
  return resolveAssetSource.uri;
}
