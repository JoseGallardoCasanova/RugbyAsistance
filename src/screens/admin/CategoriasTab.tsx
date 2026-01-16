import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Categoria } from '../../types';
import SupabaseService from '../../services/SupabaseService';
import FormCategoria from './FormCategoria';
import { Colors } from '../../config/theme';
import { usePreferences } from '../../context/PreferencesContext';
import { useFocusEffect } from '@react-navigation/native';

const CategoriasTab: React.FC = () => {
  const { currentColors, fontSizes } = usePreferences();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaEditar, setCategoriaEditar] = useState<Categoria | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cargarCategorias = useCallback(async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.obtenerCategorias();
      const ordenadas = data
        .filter(c => c.activo !== false)
        .sort((a, b) => a.numero - b.numero);
      setCategorias(ordenadas);
      console.log(`📥 Categorías cargadas: ${data.length}`);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useFocusEffect(
    useCallback(() => {
      cargarCategorias();
    }, [cargarCategorias])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarCategorias();
    setRefreshing(false);
  };

  const handleCrear = () => {
    setCategoriaEditar(undefined);
    setModalVisible(true);
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaEditar(categoria);
    setModalVisible(true);
  };

  const handleEliminar = (categoria: Categoria) => {
    Alert.alert(
      '⚠️ Eliminar Categoría',
      `¿Estás seguro de eliminar "${categoria.nombre}"?\n\nEsto ocultará la categoría pero NO borrará los jugadores asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(String(categoria.numero));
              const success = await SupabaseService.eliminarCategoria(categoria.numero);
              if (success) {
                console.log('✅ [CATEGORIAS] Categoría eliminada');
                cargarCategorias();
              } else {
                Alert.alert('❌ Error', 'No se pudo eliminar la categoría');
              }
            } catch (error) {
              Alert.alert('❌ Error', 'Error al eliminar categoría');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleGuardar = async (datos: Partial<Categoria>) => {
    try {
      let success = false;

      if (categoriaEditar) {
        success = await SupabaseService.actualizarCategoria(categoriaEditar.numero, datos);
      } else {
        const maxNumero = categorias.length > 0 
          ? Math.max(...categorias.map(c => c.numero))
          : 0;
        
        success = await SupabaseService.crearCategoria({
          numero: maxNumero + 1,
          nombre: datos.nombre!,
          color: datos.color || '#2563eb', // Colors.primary
          activo: true,
        });
      }

      if (success) {
        console.log('✅ [CATEGORIAS] Categoría guardada');
        setModalVisible(false);
        cargarCategorias();
      } else {
        Alert.alert('❌ Error', 'No se pudo guardar la categoría');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('❌ Error', 'Error al guardar categoría');
    }
  };

  const categoriasFiltradas = categorias.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.numero.toString().includes(busqueda)
  );

  const renderCategoria = ({ item }: { item: Categoria }) => {
    const isDeleting = deletingId === String(item.numero);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.colorIndicator, { backgroundColor: item.color || currentColors.primary }]} />
          <View style={styles.cardInfo}>
            <View style={styles.numeroContainer}>
              <Text style={styles.numero}>#{item.numero}</Text>
            </View>
            <Text style={styles.cardName}>{item.nombre}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonEdit, isDeleting && styles.buttonDisabled]}
            onPress={() => handleEditar(item)}
            disabled={isDeleting}
          >
            <Text style={styles.buttonText}>✏️ Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDelete, isDeleting && styles.buttonDisabled]}
            onPress={() => handleEliminar(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>🗑️ Eliminar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentColors.primary} />
        <Text style={[styles.loadingText, { fontSize: fontSizes.md, color: currentColors.textSecondary }]}>Cargando categorías...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Barra de búsqueda */}
      <View style={[styles.searchContainer, { backgroundColor: currentColors.backgroundWhite }]}>
        <TextInput
          style={[styles.searchInput, { fontSize: fontSizes.md, color: currentColors.textPrimary }]}
          placeholder="🔍 Buscar categoría..."
          placeholderTextColor={currentColors.textLight}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Lista de categorías */}
      <FlatList
        data={categoriasFiltradas}
        keyExtractor={(item) => String(item.numero)}
        renderItem={renderCategoria}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {busqueda ? 'No se encontraron categorías' : 'Sin categorías'}
            </Text>
            <Text style={styles.emptyText}>
              {busqueda 
                ? 'Intenta con otro término de búsqueda' 
                : 'Crea tu primera categoría presionando el botón de abajo'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Botón crear */}
      <TouchableOpacity style={styles.fab} onPress={handleCrear}>
        <Text style={styles.fabText}>+ CREAR CATEGORÍA</Text>
      </TouchableOpacity>

      {/* Modal de formulario */}
      <FormCategoria
        visible={modalVisible}
        categoria={categoriaEditar}
        onClose={() => setModalVisible(false)}
        onSave={handleGuardar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  // ✅ NUEVO: Estilos para sincronización
  syncContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  syncButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  syncHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  colorIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  cardInfo: {
    flex: 1,
  },
  numeroContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  numero: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonEdit: {
    backgroundColor: '#2196F3',
  },
  buttonDelete: {
    backgroundColor: '#f44336',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2563eb', // Colors.primary
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CategoriasTab;
