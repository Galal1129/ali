import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { Asset } from 'expo-asset';

const DEFAULT_LOGO_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNFNUU3RUIiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzZCNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TG9nbzwvdGV4dD48L3N2Zz4=';

async function getDefaultLogoBase64(): Promise<string> {
  try {
    console.log('[logoHelper] Starting to load default logo...');
    const asset = Asset.fromModule(require('@/assets/images/logo_1.png'));

    if (!asset.downloaded) {
      console.log('[logoHelper] Downloading asset...');
      await asset.downloadAsync();
    }

    console.log('[logoHelper] Asset downloaded. URI:', asset.uri, 'LocalURI:', asset.localUri);

    if (Platform.OS === 'web') {
      console.log('[logoHelper] Platform is web, returning URI directly');
      return asset.uri;
    }

    const uriToUse = asset.localUri || asset.uri;

    if (!uriToUse) {
      console.error('[logoHelper] No URI available for asset');
      return DEFAULT_LOGO_PLACEHOLDER;
    }

    console.log('[logoHelper] Reading file as base64...');
    const base64 = await FileSystem.readAsStringAsync(uriToUse, {
      encoding: 'base64' as any,
    });

    console.log('[logoHelper] Successfully converted to base64. Length:', base64.length);
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('[logoHelper] Error loading default logo:', error);
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

async function getReceiptLogoFromDatabase(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('selected_receipt_logo, shop_logo')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.selected_receipt_logo || data.shop_logo;
  } catch (error) {
    console.error('Error loading receipt logo from database:', error);
    return null;
  }
}

async function convertUrlToBase64(url: string): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return url;
    }

    const cacheFileName = `logo_${Date.now()}.png`;
    const cachePath = `${FileSystem.cacheDirectory}${cacheFileName}`;

    const downloadResult = await FileSystem.downloadAsync(url, cachePath);

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download logo: ${downloadResult.status}`);
    }

    const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
      encoding: 'base64' as any,
    });

    const mimeType = url.endsWith('.png') ? 'image/png' :
                      url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg' :
                      'image/png';

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return url;
  }
}

export async function getLogoBase64(): Promise<string> {
  try {
    console.log('[logoHelper] Getting logo base64...');
    const dbLogoUrl = await getLogoFromDatabase();

    if (dbLogoUrl) {
      console.log('[logoHelper] Database logo URL found:', dbLogoUrl);

      if (Platform.OS === 'web') {
        console.log('[logoHelper] Returning database URL for web');
        return dbLogoUrl;
      }

      try {
        console.log('[logoHelper] Converting database logo to base64...');
        const base64 = await convertUrlToBase64(dbLogoUrl);
        console.log('[logoHelper] Successfully converted database logo');
        return base64;
      } catch (error) {
        console.error('[logoHelper] Error converting database logo to base64:', error);
      }
    } else {
      console.log('[logoHelper] No database logo found, using default');
    }

    return await getDefaultLogoBase64();
  } catch (error) {
    console.error('[logoHelper] Error loading logo:', error);
    console.error('[logoHelper] Falling back to default logo');
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

export async function getReceiptLogoBase64(): Promise<string> {
  try {
    console.log('[logoHelper] Getting receipt logo base64...');
    const dbLogoUrl = await getReceiptLogoFromDatabase();

    if (dbLogoUrl) {
      console.log('[logoHelper] Receipt logo URL found:', dbLogoUrl);

      if (Platform.OS === 'web') {
        console.log('[logoHelper] Returning receipt logo URL for web');
        return dbLogoUrl;
      }

      try {
        console.log('[logoHelper] Converting receipt logo to base64...');
        const base64 = await convertUrlToBase64(dbLogoUrl);
        console.log('[logoHelper] Successfully converted receipt logo');
        return base64;
      } catch (error) {
        console.error('[logoHelper] Error converting receipt logo to base64:', error);
      }
    } else {
      console.log('[logoHelper] No receipt logo found, using default');
    }

    return await getDefaultLogoBase64();
  } catch (error) {
    console.error('[logoHelper] Error loading receipt logo:', error);
    console.error('[logoHelper] Falling back to default logo');
    return await getDefaultLogoBase64();
  }
}
