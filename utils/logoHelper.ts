import { Platform, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export async function getLogoBase64(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      const resolveAssetSource = Image.resolveAssetSource(
        require('@/assets/images/logo.jpg')
      );
      return resolveAssetSource.uri;
    }

    const asset = Asset.fromModule(require('@/assets/images/logo.jpg'));
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error('Asset localUri is null');
    }

    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: 'base64' as any,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}

export function getLogoUrl(): string {
  const resolveAssetSource = Image.resolveAssetSource(
    require('@/assets/images/logo.jpg')
  );
  return resolveAssetSource.uri;
}
