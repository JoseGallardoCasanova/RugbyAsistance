import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';

interface PerfilScreenProps {
  navigation: any;
}

const PerfilScreen: React.FC<PerfilScreenProps> = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const { club } = useClub();
  const [email, setEmail] = useState(user?.email || '');
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [categoriasNombres, setCategoriasNombres] = useState<string[]>([]);
  
  // Estados para cambio de contraseña
  const [modalPasswordVisible, setModalPasswordVisible] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showPasswordNuevo, setShowPasswordNuevo] = useState(false);
  const [showPasswordConfirmar, setShowPasswordConfirmar] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('📸 Foto seleccionada');
      await updateUser({ fotoUrl: result.assets[0].uri });
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'El email no puede estar vacío');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Ingresa un email válido');
      return;
    }

    await updateUser({ 
      email: email.trim(),
    });
    setEditandoEmail(false);
    console.log('✅ Email actualizado:', email);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleCambiarPassword = async () => {
    // Validaciones
    if (!passwordActual.trim()) {
      Alert.alert('Error', 'Ingresa tu contraseña actual');
      return;
    }

    if (!passwordNuevo.trim()) {
      Alert.alert('Error', 'Ingresa tu nueva contraseña');
      return;
    }

    if (passwordNuevo.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordNuevo !== passwordConfirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (passwordActual === passwordNuevo) {
      Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setCambiandoPassword(true);
    try {
      const resultado = await SupabaseServiceV2.cambiarPassword(
        user!.id,
        passwordActual,
        passwordNuevo
      );

      if (resultado) {
        Alert.alert(
          '✅ Contraseña actualizada',
          'Tu contraseña ha sido cambiada exitosamente'
        );
        // Limpiar y cerrar modal
        setPasswordActual('');
        setPasswordNuevo('');
        setPasswordConfirmar('');
        setModalPasswordVisible(false);
      } else {
        Alert.alert('❌ Error', 'La contraseña actual es incorrecta');
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      Alert.alert('❌ Error', 'No se pudo cambiar la contraseña');
    } finally {
      setCambiandoPassword(false);
    }
  };

  const getRoleColor = () => {
    const colors: any = {
      admin: '#e63946',
      admin_club: '#d62839',
      entrenador: '#f77f00',
      ayudante: '#06a77d',
    };
    return colors[user?.role || 'ayudante'];
  };

  const getRoleLabel = () => {
    const labels: any = {
      admin: 'Administrador',
      admin_club: 'Administrador del Club',
      entrenador: 'Entrenador',
      ayudante: 'Ayudante',
    };
    return labels[user?.role || 'ayudante'];
  };

  // Cargar nombres de categorías para entrenadores
  React.useEffect(() => {
    const cargarCategorias = async () => {
      if (user?.role === 'entrenador' && user.categoriasAsignadas && user.categoriasAsignadas.length > 0 && club) {
        try {
          const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);
          const nombres = user.categoriasAsignadas
            .map(id => cats.find(c => c.id === id)?.nombre)
            .filter(Boolean) as string[];
          setCategoriasNombres(nombres);
        } catch (error) {
          console.error('Error al cargar categorías:', error);
        }
      }
    };
    cargarCategorias();
  }, [user?.categoriasAsignadas, club]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Foto de perfil */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={handlePickImage} style={styles.photoContainer}>
            {user?.fotoUrl ? (
              <Image source={{ uri: user.fotoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>👤</Text>
              </View>
            )}
            <View style={styles.photoEdit}>
              <Text style={styles.photoEditIcon}>📷</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Información */}
        <View style={styles.infoSection}>
          {/* Nombre - Solo lectura */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nombre completo</Text>
            <Text style={styles.infoValue}>
              {user?.nombre}{user?.apellido ? ` ${user.apellido}` : ''}
            </Text>
            <Text style={styles.infoHint}>El nombre no puede modificarse desde aquí</Text>
          </View>

          {/* Username - Solo lectura */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nombre de usuario</Text>
            <Text style={[styles.infoValue, styles.usernameText]}>@{user?.username}</Text>
            <Text style={styles.usernameHint}>
              Usa este nombre para iniciar sesión. No puede modificarse.
            </Text>
          </View>

          {/* Email - Editable */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            {editandoEmail ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.editButtonCancel}
                    onPress={() => {
                      setEmail(user?.email || '');
                      setEditandoEmail(false);
                    }}
                  >
                    <Text style={styles.editButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editButtonSave}
                    onPress={handleSaveEmail}
                  >
                    <Text style={styles.editButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>{user?.email}</Text>
                <TouchableOpacity onPress={() => setEditandoEmail(true)}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Rol */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Rol</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor() }]}>
              <Text style={styles.roleBadgeText}>{getRoleLabel()}</Text>
            </View>
          </View>

          {/* Categorías asignadas (solo para entrenadores) */}
          {user?.role === 'entrenador' && categoriasNombres.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Categorías asignadas</Text>
              <Text style={styles.infoValue}>{categoriasNombres.join(', ')}</Text>
            </View>
          )}

          {/* Club */}
          {club && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Club</Text>
              <Text style={styles.infoValue}>{club.nombre}</Text>
            </View>
          )}
        </View>

        {/* Botón de cambiar contraseña */}
        <TouchableOpacity 
          style={styles.changePasswordButton} 
          onPress={() => setModalPasswordVisible(true)}
        >
          <Text style={styles.changePasswordButtonText}>🔐 Cambiar Contraseña</Text>
        </TouchableOpacity>

        {/* Botón de cerrar sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Versión */}
        <Text style={styles.version}>Versión 1.0.0</Text>
      </ScrollView>

      {/* Modal de cambio de contraseña */}
      <Modal
        visible={modalPasswordVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalPasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setModalPasswordVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Contraseña actual */}
              <Text style={styles.modalLabel}>Contraseña actual *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordActual}
                  onChangeText={setPasswordActual}
                  placeholder="Ingresa tu contraseña actual"
                  secureTextEntry={!showPasswordActual}
                  editable={!cambiandoPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  onPress={() => setShowPasswordActual(!showPasswordActual)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPasswordActual ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Nueva contraseña */}
              <Text style={styles.modalLabel}>Nueva contraseña *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordNuevo}
                  onChangeText={setPasswordNuevo}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!showPasswordNuevo}
                  editable={!cambiandoPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  onPress={() => setShowPasswordNuevo(!showPasswordNuevo)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPasswordNuevo ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Confirmar contraseña */}
              <Text style={styles.modalLabel}>Confirmar nueva contraseña *</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordConfirmar}
                  onChangeText={setPasswordConfirmar}
                  placeholder="Repite la nueva contraseña"
                  secureTextEntry={!showPasswordConfirmar}
                  editable={!cambiandoPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  onPress={() => setShowPasswordConfirmar(!showPasswordConfirmar)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>{showPasswordConfirmar ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Botones */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setPasswordActual('');
                    setPasswordNuevo('');
                    setPasswordConfirmar('');
                    setModalPasswordVisible(false);
                  }}
                  disabled={cambiandoPassword}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleCambiarPassword}
                  disabled={cambiandoPassword}
                >
                  {cambiandoPassword ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Cambiar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a472a',
  },
  backButton: {
    width: 40,
  },
  backIcon: {
    fontSize: 30,
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 50,
  },
  photoEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff6b35',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoEditIcon: {
    fontSize: 18,
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 20,
  },
  editContainer: {
    marginTop: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButtonCancel: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonSave: {
    flex: 1,
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  usernameText: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: '#1a472a',
    fontWeight: 'bold',
  },
  usernameHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  infoHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  changePasswordButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 10,
  },
  eyeIcon: {
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonSave: {
    backgroundColor: '#4caf50',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginBottom: 30,
  },
});

export default PerfilScreen;
