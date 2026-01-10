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
import { Jugador, Categoria } from '../../types';
import SupabaseService from '../../services/SupabaseService';

interface FormJugadorProps {
  visible: boolean;
  jugador?: Jugador;
  categoriasPermitidas?: number[];
  onClose: () => void;
  onSave: (datos: Partial<Jugador>) => Promise<void>;
}

const FormJugador: React.FC<FormJugadorProps> = ({ visible, jugador, categoriasPermitidas, onClose, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [categoria, setCategoria] = useState<number>(1);
  const [guardando, setGuardando] = useState(false);

  // ✅ NUEVO: Cargar categorías dinámicas
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  const esEntrenadorRestringido = Array.isArray(categoriasPermitidas);

  useEffect(() => {
    if (visible) {
      cargarCategorias();
    }
  }, [visible]);

  const cargarCategorias = async () => {
    try {
      setLoadingCategorias(true);
      const cats = await SupabaseService.obtenerCategorias();
      let activas = cats
        .filter(c => c.activo !== false)
        .sort((a, b) => a.numero - b.numero);

      if (Array.isArray(categoriasPermitidas) && categoriasPermitidas.length > 0) {
        activas = activas.filter(c => categoriasPermitidas.includes(c.numero));
      }
      setCategorias(activas);
      
      // Si no hay categoría seleccionada y hay categorías disponibles, seleccionar la primera
      if (!jugador && activas.length > 0) {
        setCategoria(activas[0].numero);
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
      setCategoria(jugador.categoria);
    } else {
      // Limpiar formulario
      setNombre('');
      setRut('');
      // Categoría se establece cuando cargan las categorías
    }
  }, [jugador, visible]);

  const handleGuardar = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!rut.trim()) {
      Alert.alert('Error', 'El RUT es requerido');
      return;
    }

    const datos: Partial<Jugador> = {
      nombre: nombre.trim(),
      rut: rut.trim(),
      categoria: categoria,
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
              style={[styles.input, jugador && styles.inputDisabled]}
              value={rut}
              onChangeText={setRut}
              placeholder="123456789"
              editable={!guardando && !jugador}
            />
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
                    key={String(cat.numero)}
                    style={[
                      styles.categoriaOption,
                      categoria === cat.numero && styles.categoriaOptionActive,
                    ]}
                    onPress={() => setCategoria(cat.numero)}
                    disabled={guardando}
                  >
                    <View style={[styles.categoriaColor, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.categoriaOptionText,
                        categoria === cat.numero && styles.categoriaOptionTextActive,
                      ]}
                    >
                      {cat.nombre}
                    </Text>
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
});

export default FormJugador;
