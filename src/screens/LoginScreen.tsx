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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContextV2';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type LoginNavProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [buscandoUsername, setBuscandoUsername] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<LoginNavProp>();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    const success = await login(username, password);
    setLoading(false);

    if (!success) {
      Alert.alert('Error', 'Credenciales incorrectas');
    }
  };

  const handleRecuperarUsername = async () => {
    if (!emailRecuperar.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    setBuscandoUsername(true);
    const resultado = await SupabaseServiceV2.recuperarUsernamePorEmail(emailRecuperar);
    setBuscandoUsername(false);

    if (resultado) {
      Alert.alert(
        '✅ Username Encontrado',
        `Hola ${resultado.nombre}!\n\nTu nombre de usuario es:\n\n${resultado.username}`,
        [
          {
            text: 'Copiar',
            onPress: () => {
              // TODO: Implementar copiado al portapapeles si es necesario
              Alert.alert('Info', 'Anota tu username para iniciar sesión');
            },
          },
          { text: 'OK', onPress: () => setModalVisible(false) },
        ]
      );
      setEmailRecuperar('');
    } else {
      Alert.alert(
        'Email no encontrado',
        'No existe ninguna cuenta asociada a este email. Contacta a tu administrador.'
      );
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
            placeholder="Nombre de usuario"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* ✅ MEJORADO: Input de contraseña con botón show/hide */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
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
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Text>
          </TouchableOpacity>

          {/* Enlace para recuperar username */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu nombre de usuario?</Text>
          </TouchableOpacity>

          {/* Registro de club */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿Nuevo club?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('RegistroClub')}
          >
            <Text style={styles.registerButtonText}>🏉 Registrar mi club</Text>
          </TouchableOpacity>
        </View>

        {/* Modal de recuperar username */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Recuperar Username</Text>
              <Text style={styles.modalSubtitle}>
                Ingresa el email de tu cuenta y te mostraremos tu nombre de usuario.
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                placeholderTextColor="#999"
                value={emailRecuperar}
                onChangeText={setEmailRecuperar}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setModalVisible(false);
                    setEmailRecuperar('');
                  }}
                  disabled={buscandoUsername}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleRecuperarUsername}
                  disabled={buscandoUsername}
                >
                  {buscandoUsername ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                      Buscar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ...se eliminó la sección de usuarios de prueba... */}
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
    fontSize: 16,
  },
  eyeButton: {
    padding: 10,
  },
  eyeIcon: {
    fontSize: 20,
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
  forgotLink: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotText: {
    color: '#fff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginHorizontal: 10,
  },
  registerButton: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#ccc',
  },
  modalButtonConfirm: {
    backgroundColor: '#1a472a',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalButtonTextConfirm: {
    color: '#fff',
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
