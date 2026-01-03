import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>عذراً، حدث خطأ</Text>
          <Text style={styles.error}>
            {this.state.error?.message || 'خطأ غير معروف'}
          </Text>
          <Text style={styles.stack}>
            {this.state.error?.stack}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    color: '#F87171',
    marginBottom: 12,
    textAlign: 'center',
  },
  stack: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'left',
    fontFamily: 'monospace',
  },
});
