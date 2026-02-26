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
import { Jugador, Categoria, User } from '../../types/v2';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { formatearRUT, validarRUT } from '../../utils/rutUtils';
import { useClub } from '../../context/ClubContext';

interface FormJugadorProps {
  visible: boolean;
  jugador?: Jugador;
  categoriasPermitidas?: string[]; // UUIDs de categorías
  onClose: () => void;
  onSave: (datos: Partial<Jugador>) => Promise<void>;
}

const FormJugador: React.FC<FormJugadorProps> = ({ visible, jugador, categoriasPermitidas, onClose, onSave }) => {
  const { club } = useClub();
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [rutError, setRutError] = useState('');
  const [categoria, setCategoria] = useState<string>(''); // UUID ahora
  const [guardando, setGuardando] = useState(false);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [usuarioId, setUsuarioId] = useState<string | undefined>(undefined);
  const [usuarios, setUsuarios] = useState<User[]>([]);

  const esEntrenadorRestringido = Array.isArray(categoriasPermitidas);

  useEffect(() => {
    if (visible) {
      cargarCategorias();
    }
  }, [visible]);

  const cargarCategorias = async () => {
    if (!club) return;
    
    try {
      setLoadingCategorias(true);
      const [cats, users] = await Promise.all([
        SupabaseServiceV2.getCategoriasByClub(club.id),
        SupabaseServiceV2.getUsuariosByClub(club.id),
      ]);
      setUsuarios(users.filter(u => u.role === 'jugador'));
      let ordenadas = cats.sort((a, b) => a.orden - b.orden);

      // Si el entrenador tiene restricciones, filtrar por categorías permitidas (UUIDs)
      if (Array.isArray(categoriasPermitidas) && categoriasPermitidas.length > 0) {
        ordenadas = ordenadas.filter(c => categoriasPermitidas.includes(c.id));
      }
      setCategorias(ordenadas);
      
      // Si no hay categoría seleccionada y hay categorías disponibles, seleccionar la primera
      if (!jugador && ordenadas.length > 0) {
        setCategoria(ordenadas[0].id);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoadingCategorias(false);
    }
  };

  useEffect(() => {
    if (jugador) {
      setNombre(jugador.nombre);
      setRut(jugador.rut);
      setCategoria(jugador.categoriaId); // UUID en V2
      setUsuarioId(jugador.usuarioId);
    } else {
      // Limpiar formulario
      setNombre('');
      setRut('');
      setUsuarioId(undefined);
      // Categoría se establece cuando cargan las categorías
    }
  }, [jugador, visible]);

  const handleGuardar = async () => {
    console.log('💾 [FORM JUGADOR] Guardando jugador...');
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!rut.trim()) {
      Alert.alert('Error', 'El RUT es requerido');
      return;
    }

    // Validar RUT solo si no estamos editando (el RUT no se puede cambiar)
    if (!jugador && !validarRUT(rut)) {
      Alert.alert('Error', 'El RUT ingresado no es válido. Por favor verifica el dígito verificador.');
      return;
    }

    const datos: Partial<Jugador> = {
      nombre: nombre.trim(),
      rut: rut.trim(),
      categoriaId: categoria, // UUID en V2
      usuarioId: usuarioId,
    };

    setGuardando(true);
    try {
      await onSave(datos);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {jugador ? '✏️ Editar Jugador' : '➕ Crear Jugador'}
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
              placeholder="Juan Pérez"
              editable={!guardando}
            />

            {/* RUT */}
            <Text style={styles.label}>RUT {!jugador && '*'}</Text>
            <TextInput
              style={[styles.input, jugador && styles.inputDisabled, rutError && styles.inputError]}
              value={rut}
              onChangeText={(text) => {
                console.log('📝 [FORM JUGADOR] RUT ingresado:', text);
                if (!jugador) {
                  const formateado = formatearRUT(text);
                  console.log('📝 [FORM JUGADOR] RUT formateado:', formateado);
                  setRut(formateado);
                  setRutError(''); // Limpiar error mientras escribe
                } else {
                  setRut(text);
                }
              }}
              onBlur={() => {
                if (!jugador && rut.trim() && !validarRUT(rut)) {
                  console.log('📝 [FORM JUGADOR] RUT inválido en blur');
                  setRutError('RUT inválido');
                } else {
                  setRutError('');
                }
              }}
              placeholder="12345678-9"
              maxLength={10}
              keyboardType="default"
              autoCapitalize="characters"
              editable={!guardando && !jugador}
            />
            {rutError && !jugador && (
              <Text style={styles.errorText}>{rutError}</Text>
            )}
            {jugador && (
              <Text style={styles.helperText}>El RUT no se puede modificar</Text>
            )}

            {/* Categoría */}
            <Text style={styles.label}>Categoría *</Text>
            {loadingCategorias ? (
              <ActivityIndicator color="#1a472a" style={{ marginVertical: 10 }} />
            ) : categorias.length === 0 ? (
              <View style={styles.noCategoriesContainer}>
                <Text style={styles.noCategoriesText}>
                  {esEntrenadorRestringido
                    ? 'No tienes categorías asignadas (o no hay categorías disponibles para tus permisos). Pide a un administrador que te asigne categorías.'
                    : 'No hay categorías disponibles. Ve al tab de Categorías para crear una.'}
                </Text>
              </View>
            ) : (
              <View style={styles.categoriaSelector}>
                {categorias.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoriaOption,
                      categoria === cat.id && styles.categoriaOptionActive,
                    ]}
                    onPress={() => setCategoria(cat.id)}
                    disabled={guardando}
                  >
                    <View style={[styles.categoriaColor, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.categoriaOptionText,
                        categoria === cat.id && styles.categoriaOptionTextActive,
                      ]}
                    >
                      {cat.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Usuario vinculado */}
            <Text style={styles.label}>Usuario vinculado (opcional)</Text>
            <Text style={styles.helperText}>
              Vincula este jugador a una cuenta de usuario con rol "Jugador" para que pueda ver su perfil en la app.
            </Text>
            {usuarios.length === 0 ? (
              <View style={styles.noCategoriesContainer}>
                <Text style={styles.noCategoriesText}>
                  No hay usuarios con rol Jugador. Crea un usuario con ese rol desde la pestaña Usuarios.
                </Text>
              </View>
            ) : (
              <View style={styles.categoriaSelector}>
                {/* Opción sin vincular */}
                <TouchableOpacity
                  style={[styles.categoriaOption, !usuarioId && styles.categoriaOptionActive]}
                  onPress={() => setUsuarioId(undefined)}
                  disabled={guardando}
                >
                  <Text style={[styles.categoriaOptionText, !usuarioId && styles.categoriaOptionTextActive]}>
                    🚫 Sin vincular
                  </Text>
                </TouchableOpacity>
                {usuarios.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.categoriaOption, usuarioId === u.id && styles.categoriaOptionActive]}
                    onPress={() => setUsuarioId(u.id)}
                    disabled={guardando}
                  >
                    <Text style={[styles.categoriaOptionText, usuarioId === u.id && styles.categoriaOptionTextActive]}>
                      👤 {u.nombre} {u.apellido}{' '}
                      <Text style={{ fontSize: 12, color: '#999' }}>(@{u.username})</Text>
                    </Text>
                    {usuarioId === u.id && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
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
              style={[styles.saveButton, (guardando || categorias.length === 0) && styles.buttonDisabled]} 
              onPress={handleGuardar}
              disabled={guardando || categorias.length === 0}
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
    maxHeight: '80%',
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
  noCategoriesContainer: {
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  noCategoriesText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
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
  inputDisabled: {
    backgroundColor: '#e0e0e0',
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 5,
  },
  checkmark: {
    fontSize: 16,
    color: '#1a472a',
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
});

export default FormJugador;
