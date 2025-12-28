import { Platform, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { supabase } from '@/lib/supabase';

async function getDefaultLogoBase64(): Promise<string> {
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
    console.error('Error loading default logo:', error);
    return '';
  }
}

async function getLogoFromDatabase(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('shop_logo')
      .maybeSingle();

    if (error || !data || !data.shop_logo) {
      return null;
    }

    return data.shop_logo;
  } catch (error) {
    console.error('Error loading logo from database:', error);
    return null;
  }
}

async function convertUrlToBase64(url: string): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return url;
    }

    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return url;
  }
}

export async function getLogoBase64(): Promise<string> {
  try {
    const dbLogoUrl = await getLogoFromDatabase();

    if (dbLogoUrl) {
      if (Platform.OS === 'web') {
        return dbLogoUrl;
      }

      try {
        const base64 = await convertUrlToBase64(dbLogoUrl);
        return base64;
      } catch (error) {
        console.error('Error converting database logo to base64:', error);
      }
    }

    return await getDefaultLogoBase64();
  } catch (error) {
    console.error('Error loading logo:', error);
    return await getDefaultLogoBase64();
  }
}

export async function getLogoUrl(): Promise<string> {
  try {
    const dbLogoUrl = await getLogoFromDatabase();

    if (dbLogoUrl) {
      return dbLogoUrl;
    }

    const resolveAssetSource = Image.resolveAssetSource(
      require('@/assets/images/logo.jpg')
    );
    return resolveAssetSource.uri;
  } catch (error) {
    console.error('Error loading logo URL:', error);
    const resolveAssetSource = Image.resolveAssetSource(
      require('@/assets/images/logo.jpg')
    );
    return resolveAssetSource.uri;
  }
}
