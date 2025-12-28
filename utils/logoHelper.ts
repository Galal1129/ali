import { Platform, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export async function getLogoBase64(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      const resolveAssetSource = Image.resolveAssetSource(
        require('@/assets/images/logo_1.png')
      );
      return resolveAssetSource.uri;
    }

    const asset = Asset.fromModule(require('@/assets/images/logo_1.png'));
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error('Asset localUri is null');
    }

    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
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
