import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as Crypto from 'expo-crypto';

export default function TestLogin() {
  const [pin, setPin] = useState('11223344');
  const [hash, setHash] = useState('');

  const generateHash = async () => {
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    setHash(hashHex);
    console.log('PIN:', pin);
    console.log('Generated Hash:', hashHex);
    console.log('Expected Hash:', '4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4');
    console.log('Match:', hashHex === '4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Hash Generation</Text>

      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder="Enter PIN"
      />

      <TouchableOpacity style={styles.button} onPress={generateHash}>
        <Text style={styles.buttonText}>Generate Hash</Text>
      </TouchableOpacity>

      {hash && (
        <View style={styles.result}>
          <Text style={styles.label}>Generated Hash:</Text>
          <Text style={styles.hash}>{hash}</Text>

          <Text style={styles.label}>Expected Hash:</Text>
          <Text style={styles.hash}>4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4</Text>

          <Text style={[styles.label, hash === '4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4' ? styles.match : styles.noMatch]}>
            {hash === '4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4' ? '✓ Match!' : '✗ No Match'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  result: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  hash: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginTop: 5,
  },
  match: {
    color: 'green',
    fontSize: 18,
  },
  noMatch: {
    color: 'red',
    fontSize: 18,
  },
});
