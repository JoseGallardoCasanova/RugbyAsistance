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
import { usePreferences } from '../context/PreferencesContext';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // ✅ NUEVO
  const { login } = useAuth();
  const { currentColors, fontSizes } = usePreferences();

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

  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: currentColors.primary,
    } as const,
    button: {
      backgroundColor: currentColors.accent || '#ff6b35',
      borderRadius: 10,
      padding: 15,
      alignItems: 'center' as const,
    },
  };

  return (
    <KeyboardAvoidingView
      style={[dynamicStyles.container, { backgroundColor: currentColors.primary }]}
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
          <Text style={[styles.title, { fontSize: fontSizes.xlarge }]}>OLD GREEN</Text>
          <Text style={[styles.subtitle, { fontSize: fontSizes.medium }]}>Rugby Club</Text>
          <Text style={[styles.appName, { fontSize: fontSizes.medium }]}>Sistema de Asistencia</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <TextInput
            style={[styles.input, { fontSize: fontSizes.medium }]}
            placeholder="Usuario"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          {/* ✅ MEJORADO: Input de contraseña con botón show/hide */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { fontSize: fontSizes.medium }]}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[dynamicStyles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { fontSize: fontSizes.large }]}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ...se eliminó la sección de usuarios de prueba... */}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({

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
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  appName: {
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
  },
  // ✅ NUEVO: Estilos para el contenedor de contraseña
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
  },
  eyeButton: {
    padding: 10,
  },
  eyeIcon: {
    fontSize: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
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
