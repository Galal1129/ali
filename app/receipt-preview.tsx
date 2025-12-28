import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Share2, Download } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/lib/supabase';
import { AccountMovement } from '@/types/database';
import { generateReceiptHTML, generateQRCodeData } from '@/utils/receiptGenerator';

export default function ReceiptPreviewScreen() {
  const router = useRouter();
  const { movementId, customerName, customerAccountNumber } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [movement, setMovement] = useState<AccountMovement | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const qrRef = useRef<any>(null);

  useEffect(() => {
    loadMovement();
  }, [movementId]);

  const loadMovement = async () => {
    try {
      setIsLoading(true);
      const { data: movementData, error: movementError } = await supabase
        .from('account_movements')
        .select('*, customers(name, account_number, phone)')
        .eq('id', movementId)
        .single();

      if (movementError) throw movementError;

      if (movementData) {
        setMovement(movementData);
        await generateReceipt(movementData);
      }
    } catch (error) {
      console.error('Error loading movement:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل بيانات السند');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReceipt = async (movementData: any) => {
    try {
      const customerData = movementData.customers;
      const receiptData = {
        ...movementData,
        customerName: customerData?.name || (customerName as string) || 'عميل غير محدد',
        customerAccountNumber: customerData?.account_number || (customerAccountNumber as string) || '0000000',
        customerPhone: customerData?.phone,
      };

      const qrData = generateQRCodeData(receiptData);

      const qrCodeDataUrl = await new Promise<string>((resolve) => {
        setTimeout(async () => {
          if (qrRef.current) {
            qrRef.current.toDataURL((dataUrl: string) => {
              resolve(`data:image/png;base64,${dataUrl}`);
            });
          } else {
            resolve('');
          }
        }, 100);
      });

      const html = generateReceiptHTML(receiptData, qrCodeDataUrl);

      setHtmlContent(html);
    } catch (error) {
      console.error('Error generating receipt:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء السند');
    }
  };

  const handleShare = async () => {
    if (!movement || !htmlContent) {
      Alert.alert('خطأ', 'لم يتم تحميل بيانات السند بعد');
      return;
    }

    try {
      setIsLoading(true);

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      const pdfName = `receipt_${movement.receipt_number || movement.movement_number}.pdf`;
      const pdfPath = `${FileSystem.documentDirectory}${pdfName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: pdfPath,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: 'مشاركة السند',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('تنبيه', 'المشاركة غير متاحة على هذا الجهاز');
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء مشاركة السند');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!movement || !htmlContent) {
      Alert.alert('خطأ', 'لم يتم تحميل بيانات السند بعد');
      return;
    }

    try {
      setIsLoading(true);

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      const pdfName = `receipt_${movement.receipt_number || movement.movement_number}.pdf`;
      const pdfPath = `${FileSystem.documentDirectory}${pdfName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: pdfPath,
      });

      if (Platform.OS === 'web') {
        const content = await FileSystem.readAsStringAsync(pdfPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${content}`;
        link.download = pdfName;
        link.click();
      } else {
        Alert.alert('نجح', `تم حفظ الملف: ${pdfName}`);
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تنزيل السند');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowRight size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>معاينة السند</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>جاري تحميل السند...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowRight size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>معاينة السند</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
            <Download size={20} color="#4F46E5" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={20} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hidden}>
        {movement && (
          <QRCode
            value={generateQRCodeData({
              ...movement,
              customerName: (movement as any).customers?.name || (customerName as string) || 'عميل غير محدد',
              customerAccountNumber: (movement as any).customers?.account_number || (customerAccountNumber as string) || '0000000',
            })}
            size={120}
            getRef={(ref) => (qrRef.current = ref)}
          />
        )}
      </View>

      <ScrollView style={styles.content}>
        {htmlContent ? (
          <WebView
            style={styles.webView}
            source={{ html: htmlContent }}
            originWhitelist={['*']}
            scalesPageToFit={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>لم يتم تحميل السند</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.shareButton, isLoading && styles.shareButtonDisabled]}
          onPress={handleShare}
          disabled={isLoading}
        >
          <Share2 size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>
            {isLoading ? 'جاري المشاركة...' : 'مشاركة السند'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    minHeight: 800,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  shareButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  hidden: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    opacity: 0,
  },
});
