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
import { Categoria } from '../../types'; // ✅ Ruta corregida

interface FormCategoriaProps {
  visible: boolean;
  categoria?: Categoria;
  onClose: () => void;
  onSave: (datos: Partial<Categoria>) => Promise<void>;
}

const COLORES_PREDEFINIDOS = [
  Colors.primary, '#2d5a3d', '#3f6d50', '#518063',
  '#639376', '#75a689', '#87b99c', '#99ccaf',
  '#2196F3', '#1976d2', '#0d47a1', '#03A9F4',
  '#FF6B35', '#f44336', '#e91e63', '#9c27b0',
  '#673ab7', '#3f51b5', '#009688', '#4CAF50',
];

const FormCategoria: React.FC<FormCategoriaProps> = ({ visible, categoria, onClose, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState(Colors.primary);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (categoria) {
      setNombre(categoria.nombre);
      setColor(categoria.color || Colors.primary);
    } else {
      // Limpiar formulario
      setNombre('');
      setColor(Colors.primary);
    }
  }, [categoria, visible]);

  const handleGuardar = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    const datos: Partial<Categoria> = {
      nombre: nombre.trim(),
      color: color,
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
              {categoria ? '✏️ Editar Categoría' : '➕ Crear Categoría'}
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
              placeholder="Ej: M-14, M-16, Sub 18, Seniors..."
              editable={!guardando}
              maxLength={50}
            />
            <Text style={styles.hint}>El nombre que verán los usuarios</Text>
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
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 5,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 15,
  },
  colorPreviewCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  colorPreviewText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderColor: '#333',
    borderWidth: 3,
  },
  checkmark: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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

export default FormCategoria;
