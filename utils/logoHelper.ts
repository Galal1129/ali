import { Platform, Image } from 'react-native';

export async function getLogoBase64(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return '';
    }
    return '';
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}

export function getLogoUrl(): string {
  return '';
}
