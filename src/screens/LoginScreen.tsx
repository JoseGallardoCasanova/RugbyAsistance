import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    const success = await login(email, password);
    setLoading(false);

    if (!success) {
      Alert.alert('Error', 'Credenciales incorrectas');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo Old Green */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo_Old_Green.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>OLD GREEN</Text>
          <Text style={styles.subtitle}>Rugby Club</Text>
          <Text style={styles.appName}>Sistema de Asistencia</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ayuda */}
        <View style={styles.help}>
          <Text style={styles.helpTitle}>Usuarios de prueba:</Text>
          <Text style={styles.helpText}>Admin: admin@rugby.cl / admin123</Text>
          <Text style={styles.helpText}>Entrenador: entrenador@rugby.cl / entrenador123</Text>
          <Text style={styles.helpText}>Ayudante: ayudante@rugby.cl / ayudante123</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a472a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  appName: {
    fontSize: 16,
    color: '#ddd',
    fontWeight: '500',
  },
  form: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#ff6b35',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  help: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
  },
  helpTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  helpText: {
    color: '#ddd',
    fontSize: 12,
    marginBottom: 4,
  },
});

export default LoginScreen;
