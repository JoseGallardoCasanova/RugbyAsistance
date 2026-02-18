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
import { User, UserRole, Categoria } from '../../types/v2';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { useClub } from '../../context/ClubContext';

interface FormUsuarioProps {
  visible: boolean;
  usuario?: User;
  onClose: () => void;
  onSave: (datos: Partial<User>) => Promise<void>;
}

const FormUsuario: React.FC<FormUsuarioProps> = ({ visible, usuario, onClose, onSave }) => {
  const { club } = useClub();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAutogenerado, setUsernameAutogenerado] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('ayudante');
  const [categoriasAsignadas, setCategoriasAsignadas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  useEffect(() => {
    if (visible) {
      cargarCategorias();
    }
  }, [visible]);

  const cargarCategorias = async () => {
    if (!club) return;
    
    try {
      setLoadingCategorias(true);
      const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);
      const ordenadas = cats.sort((a, b) => a.orden - b.orden);
      setCategorias(ordenadas);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoadingCategorias(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre);
      setApellido(usuario.apellido);
      setUsername(usuario.username);
      setUsernameAutogenerado(false); // Ya tiene username asignado
      setEmail(usuario.email);
      setPassword(''); // No mostrar password
      setRole(usuario.role);
      setCategoriasAsignadas(usuario.categoriasAsignadas || []);
    } else {
      // Limpiar formulario
      setNombre('');
      setApellido('');
      setUsername('');
      setUsernameAutogenerado(true);
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setRole('ayudante');
      setCategoriasAsignadas([]);
    }
  }, [usuario, visible]);

  // Autogenerar username cuando cambia nombre o apellido (solo si está en modo autogenerado)
  useEffect(() => {
    if (usernameAutogenerado && nombre.trim() && apellido.trim()) {
      const normalize = (text: string) => text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');
      
      const nombreNorm = normalize(nombre);
      const apellidoNorm = normalize(apellido);
      const usernameGenerado = nombreNorm.charAt(0) + apellidoNorm;
      
      setUsername(usernameGenerado);
    }
  }, [nombre, apellido, usernameAutogenerado]);

  const handleGuardar = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!apellido.trim()) {
      Alert.alert('Error', 'El apellido es requerido');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'El nombre de usuario es requerido');
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

    if (role === 'entrenador' && categoriasAsignadas.length === 0) {
      Alert.alert('Error', 'Debes asignar al menos una categoría para entrenadores');
      return;
    }

    const datos: Partial<User> = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      role: role,
      categoriasAsignadas: role === 'entrenador' ? categoriasAsignadas : [],
    };

    // En V2, guardar password como passwordHash
    // NOTA: En producción deberías hashear esto en el backend
    if (password.trim()) {
      datos.passwordHash = password.trim();
    }

    setGuardando(true);
    try {
      await onSave(datos);
    } finally {
      setGuardando(false);
    }
  };

  const toggleCategoriaEntrenador = (categoriaId: string) => {
    if (categoriasAsignadas.includes(categoriaId)) {
      setCategoriasAsignadas(categoriasAsignadas.filter(c => c !== categoriaId));
    } else {
      setCategoriasAsignadas([...categoriasAsignadas, categoriaId]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {usuario ? '✏️ Editar Usuario' : '➕ Crear Usuario'}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={guardando}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.form}>
            {/* Nombre */}
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Juan"
              editable={!guardando}
            />

            {/* Apellido */}
            <Text style={styles.label}>Apellido *</Text>
            <TextInput
              style={styles.input}
              value={apellido}
              onChangeText={setApellido}
              placeholder="Pérez"
              editable={!guardando}
            />

            {/* Username */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Nombre de usuario *</Text>
              <View style={styles.usernameContainer}>
                <TextInput
                  style={[styles.input, styles.usernameInput]}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    setUsernameAutogenerado(false); // Desactivar autogeneración si edita manualmente
                  }}
                  placeholder="jperez"
                  autoCapitalize="none"
                  editable={!guardando && !usuario} // Solo editable al crear usuario nuevo
                />
                {!usuario && (
                  <TouchableOpacity
                    style={styles.autoButton}
                    onPress={() => setUsernameAutogenerado(!usernameAutogenerado)}
                  >
                    <Text style={styles.autoButtonText}>
                      {usernameAutogenerado ? '🤖 Auto' : '✏️ Manual'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.hint}>
                {usuario 
                  ? 'El username no se puede cambiar después de crear el usuario' 
                  : usernameAutogenerado
                  ? 'Se genera automáticamente: primera letra del nombre + apellido'
                  : 'Solo letras y números, sin espacios'}
              </Text>
            </View>

            {/* Email */}
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="usuario@ejemplo.com"
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
                  setCategoriasAsignadas([]);
                }}
                disabled={guardando}
              >
                <Text style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}>
                  👑 Admin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleButton, role === 'admin_club' && styles.roleButtonActive]}
                onPress={() => {
                  setRole('admin_club');
                  setCategoriasAsignadas([]);
                }}
                disabled={guardando}
              >
                <Text style={[styles.roleButtonText, role === 'admin_club' && styles.roleButtonTextActive]}>
                  👑 Admin Club
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleButton, role === 'entrenador' && styles.roleButtonActive]}
                onPress={() => {
                  setRole('entrenador');
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

            {/* Categorías para Entrenador */}
            {role === 'entrenador' && (
              <>
                <Text style={styles.label}>Categorías Asignadas * (selecciona múltiples)</Text>
                {loadingCategorias ? (
                  <ActivityIndicator color="#1a472a" style={{ marginVertical: 10 }} />
                ) : (
                  <View style={styles.categoriaSelector}>
                    {categorias.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoriaOption,
                          categoriasAsignadas.includes(cat.id) && styles.categoriaOptionActive,
                        ]}
                        onPress={() => toggleCategoriaEntrenador(cat.id)}
                        disabled={guardando}
                      >
                        <View style={[styles.categoriaColor, { backgroundColor: cat.color }]} />
                        <Text
                          style={[
                            styles.categoriaOptionText,
                            categoriasAsignadas.includes(cat.id) && styles.categoriaOptionTextActive,
                          ]}
                        >
                          {cat.nombre}
                        </Text>
                        {categoriasAsignadas.includes(cat.id) && (
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
    backgroundColor: '#1a472a',
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
    borderColor: '#1a472a',
    backgroundColor: '#e8f5e9',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  roleButtonTextActive: {
    color: '#1a472a',
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
    borderColor: '#1a472a',
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
    color: '#1a472a',
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 20,
    color: '#1a472a',
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
    backgroundColor: '#1a472a',
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
  fieldContainer: {
    marginBottom: 10,
  },
  usernameContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
  },
  autoButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1a472a',
    minWidth: 100,
    alignItems: 'center',
  },
  autoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default FormUsuario;
