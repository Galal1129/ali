import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleProp,
  ViewStyle,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  enableAutomaticScroll?: boolean;
  extraScrollHeight?: number;
}

export function KeyboardAwareView({
  children,
  contentContainerStyle,
  enableAutomaticScroll = true,
  extraScrollHeight = 50,
}: KeyboardAwareViewProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      enabled={enableAutomaticScroll}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[
            { flexGrow: 1, paddingBottom: extraScrollHeight },
            contentContainerStyle
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
