import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { Asset } from 'expo-asset';

const DEFAULT_LOGO_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNFNUU3RUIiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzZCNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TG9nbzwvdGV4dD48L3N2Zz4=';

async function getDefaultLogoBase64(): Promise<string> {
  try {
    const asset = Asset.fromModule(require('@/assets/images/logo_1.png'));
    await asset.downloadAsync();

    if (Platform.OS === 'web') {
      return asset.uri;
    }

    if (asset.localUri) {
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: 'base64' as any,
      });
      return `data:image/png;base64,${base64}`;
    }

    return DEFAULT_LOGO_PLACEHOLDER;
  } catch (error) {
    console.error('Error loading default logo:', error);
    return DEFAULT_LOGO_PLACEHOLDER;
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

    const asset = Asset.fromModule(require('@/assets/images/logo_1.png'));
    await asset.downloadAsync();
    return asset.uri;
  } catch (error) {
    console.error('Error loading logo URL:', error);
    return DEFAULT_LOGO_PLACEHOLDER;
  }
}
