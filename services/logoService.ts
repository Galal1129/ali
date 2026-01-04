import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'shop-logos';

export interface UploadLogoResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function pickImageFromGallery(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permissionResult.granted) {
    throw new Error('Permission to access gallery was denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }

  return null;
}

export async function pickImageFromCamera(): Promise<string | null> {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

  if (!permissionResult.granted) {
    throw new Error('Permission to access camera was denied');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }

  return null;
}

export async function uploadLogo(imageUri: string, userId: string = 'default'): Promise<UploadLogoResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const arrayBuffer = decode(base64);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading logo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload logo',
    };
  }
}

export async function deleteLogo(logoUrl: string): Promise<boolean> {
  try {
    const urlParts = logoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `logos/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting logo:', error);
    return false;
  }
}

export async function updateShopLogo(logoUrl: string | null): Promise<boolean> {
  try {
    const { data: settings, error: fetchError } = await supabase
      .from('app_settings')
      .select('id, shop_logo')
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (settings) {
      if (settings.shop_logo && logoUrl !== settings.shop_logo) {
        await deleteLogo(settings.shop_logo);
      }

      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ shop_logo: logoUrl })
        .eq('id', settings.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({ shop_logo: logoUrl, pin_code: '1234' });

      if (insertError) {
        throw insertError;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating shop logo:', error);
    return false;
  }
}

export async function updateShopSettings(settings: {
  shop_name?: string;
  shop_phone?: string;
  shop_address?: string;
}): Promise<boolean> {
  try {
    const { data: currentSettings, error: fetchError } = await supabase
      .from('app_settings')
      .select('id')
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (currentSettings) {
      const { error: updateError } = await supabase
        .from('app_settings')
        .update(settings)
        .eq('id', currentSettings.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({ ...settings, pin_code: '1234' });

      if (insertError) {
        throw insertError;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating shop settings:', error);
    return false;
  }
}
