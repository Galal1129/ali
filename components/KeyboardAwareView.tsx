import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function KeyboardAwareView({ children, contentContainerStyle }: KeyboardAwareViewProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
