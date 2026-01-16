import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { User, UserRole, Categoria } from '../../types';
import SupabaseService from '../../services/SupabaseService';
import { usePreferences } from '../../context/PreferencesContext';

interface FormUsuarioProps {
  visible: boolean;
  usuario?: User;
  onClose: () => void;
  onSave: (datos: Partial<User>) => Promise<void>;
}

const FormUsuario: React.FC<FormUsuarioProps> = ({ visible, usuario, onClose, onSave }) => {
  const { currentColors, fontSizes } = usePreferences();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('ayudante');
  const [categoriaAsignada, setCategoriaAsignada] = useState<number | undefined>();
  const [categoriasAsignadas, setCategoriasAsignadas] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  
  // ✅ NUEVO: Cargar categorías dinámicas
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  useEffect(() => {
    if (visible) {
      cargarCategorias();
    }
  }, [visible]);

  const cargarCategorias = async () => {
    try {
      setLoadingCategorias(true);
      const cats = await SupabaseService.obtenerCategorias();
      const activas = cats.filter(c => c.activo !== false).sort((a, b) => a.numero - b.numero);
      setCategorias(activas);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoadingCategorias(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre);
      setEmail(usuario.email);
      setPassword(''); // No mostrar password
      setRole(usuario.role);
      setCategoriaAsignada(usuario.categoriaAsignada);
      setCategoriasAsignadas(usuario.categoriasAsignadas || []);
    } else {
      // Limpiar formulario
      setNombre('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setRole('ayudante');
      setCategoriaAsignada(undefined);
      setCategoriasAsignadas([]);
    }
  }, [usuario, visible]);

  const handleGuardar = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'El email es requerido');
      return;
    }

    if (!usuario && !password.trim()) {
      Alert.alert('Error', 'La contraseña es requerida para usuarios nuevos');
      return;
    }

    if (role === 'ayudante' && !categoriaAsignada) {
      Alert.alert('Error', 'Debes asignar una categoría para ayudantes');
      return;
    }

    if (role === 'entrenador' && categoriasAsignadas.length === 0) {
      Alert.alert('Error', 'Debes asignar al menos una categoría para entrenadores');
      return;
    }

    const datos: Partial<User> = {
      nombre: nombre.trim(),
      email: email.trim(),
      role: role,
      categoriaAsignada: role === 'ayudante' ? categoriaAsignada : undefined,
      categoriasAsignadas: role === 'entrenador' ? categoriasAsignadas : undefined,
    };

    if (password.trim()) {
      datos.password = password.trim();
    }

    setGuardando(true);
    try {
      await onSave(datos);
    } finally {
      setGuardando(false);
    }
  };

  const toggleCategoriaEntrenador = (numero: number) => {
    if (categoriasAsignadas.includes(numero)) {
      setCategoriasAsignadas(categoriasAsignadas.filter(c => c !== numero));
    } else {
      setCategoriasAsignadas([...categoriasAsignadas, numero]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: currentColors.backgroundWhite }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: currentColors.primary }]}>
            <Text style={[styles.title, { fontSize: fontSizes.lg }]}>
              {usuario ? '✏️ Editar Usuario' : '➕ Crear Usuario'}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={guardando}>
              <Text style={[styles.closeButton, { fontSize: fontSizes.xxl }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.form}>
            {/* Nombre */}
            <Text style={[styles.label, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>Nombre *</Text>
            <TextInput
              style={[styles.input, { fontSize: fontSizes.md, color: currentColors.textPrimary, backgroundColor: currentColors.background, borderColor: currentColors.border }]}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Juan Pérez"
              placeholderTextColor={currentColors.textLight}
              editable={!guardando}
            />

            {/* Email */}
            <Text style={[styles.label, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>Email *</Text>
            <TextInput
              style={[styles.input, { fontSize: fontSizes.md, color: currentColors.textPrimary, backgroundColor: currentColors.background, borderColor: currentColors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="usuario@ejemplo.com"
              placeholderTextColor={currentColors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!guardando}
            />

            {/* Password */}
            <Text style={styles.label}>
              Contraseña {usuario ? '(dejar vacío para no cambiar)' : '*'}
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={usuario ? 'Dejar vacío para mantener actual' : 'Contraseña'}
                secureTextEntry={!showPassword}
                editable={!guardando}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Rol */}
            <Text style={styles.label}>Rol *</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}
                onPress={() => {
                  setRole('admin');
                  setCategoriaAsignada(undefined);
                  setCategoriasAsignadas([]);
                }}
                disabled={guardando}
              >
                <Text style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}>
                  👑 Admin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleButton, role === 'entrenador' && styles.roleButtonActive]}
                onPress={() => {
                  setRole('entrenador');
                  setCategoriaAsignada(undefined);
                }}
                disabled={guardando}
              >
                <Text style={[styles.roleButtonText, role === 'entrenador' && styles.roleButtonTextActive]}>
                  🏃 Entrenador
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleButton, role === 'ayudante' && styles.roleButtonActive]}
                onPress={() => {
                  setRole('ayudante');
                  setCategoriasAsignadas([]);
                }}
                disabled={guardando}
              >
                <Text style={[styles.roleButtonText, role === 'ayudante' && styles.roleButtonTextActive]}>
                  👤 Ayudante
                </Text>
              </TouchableOpacity>
            </View>

            {/* Categoría para Ayudante */}
            {role === 'ayudante' && (
              <>
                <Text style={styles.label}>Categoría Asignada *</Text>
                {loadingCategorias ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginVertical: 10 }} />
                ) : (
                  <View style={styles.categoriaSelector}>
                    {categorias.map((cat) => (
                      <TouchableOpacity
                        key={String(cat.numero)}
                        style={[
                          styles.categoriaOption,
                          categoriaAsignada === cat.numero && styles.categoriaOptionActive,
                        ]}
                        onPress={() => setCategoriaAsignada(cat.numero)}
                        disabled={guardando}
                      >
                        <View style={[styles.categoriaColor, { backgroundColor: cat.color }]} />
                        <Text
                          style={[
                            styles.categoriaOptionText,
                            categoriaAsignada === cat.numero && styles.categoriaOptionTextActive,
                          ]}
                        >
                          {cat.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Categorías para Entrenador */}
            {role === 'entrenador' && (
              <>
                <Text style={styles.label}>Categorías Asignadas * (selecciona múltiples)</Text>
                {loadingCategorias ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginVertical: 10 }} />
                ) : (
                  <View style={styles.categoriaSelector}>
                    {categorias.map((cat) => (
                      <TouchableOpacity
                        key={String(cat.numero)}
                        style={[
                          styles.categoriaOption,
                          categoriasAsignadas.includes(cat.numero) && styles.categoriaOptionActive,
                        ]}
                        onPress={() => toggleCategoriaEntrenador(cat.numero)}
                        disabled={guardando}
                      >
                        <View style={[styles.categoriaColor, { backgroundColor: cat.color }]} />
                        <Text
                          style={[
                            styles.categoriaOptionText,
                            categoriasAsignadas.includes(cat.numero) && styles.categoriaOptionTextActive,
                          ]}
                        >
                          {cat.nombre}
                        </Text>
                        {categoriasAsignadas.includes(cat.numero) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Botones */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.cancelButton, guardando && styles.buttonDisabled]} 
              onPress={onClose}
              disabled={guardando}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.saveButton, guardando && styles.buttonDisabled]} 
              onPress={handleGuardar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 24,
    color: '#fff',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
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
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#e8f5e9',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  roleButtonTextActive: {
    color: Colors.primary,
  },
  categoriaSelector: {
    gap: 10,
  },
  categoriaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoriaOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#e8f5e9',
  },
  categoriaColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
  },
  categoriaOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  categoriaOptionTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default FormUsuario;
