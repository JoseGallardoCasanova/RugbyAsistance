import React, { useState, useEffect } from 'react';
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
import DatabaseService from '../../services/DatabaseService';
import GoogleSheetsService from '../../services/GoogleSheetsService'; // ✅ AGREGADO
import FormCategoria from './FormCategoria';

const CategoriasTab: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaEditar, setCategoriaEditar] = useState<Categoria | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false); // ✅ NUEVO

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.obtenerCategorias();
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarCategorias();
    setRefreshing(false);
  };

  // ✅ NUEVO: Sincronizar categorías con Google Sheets
  const sincronizarConGoogleSheets = async () => {
    try {
      setSincronizando(true);
      
      Alert.alert(
        '🔄 Sincronizando...',
        'Actualizando nombres de categorías en todas las hojas de asistencia...'
      );

      const success = await GoogleSheetsService.sincronizarCategoriasEnHojas();

      if (success) {
        Alert.alert(
          '✅ Sincronización completa',
          'Los nombres de las categorías se actualizaron en todas las hojas de asistencia.'
        );
      } else {
        Alert.alert(
          '⚠️ Sincronización parcial',
          'No se pudieron actualizar algunas hojas. Verifica que la URL de asistencias esté configurada correctamente.'
        );
      }
    } catch (error) {
      console.error('Error al sincronizar:', error);
      Alert.alert('❌ Error', 'No se pudo sincronizar con Google Sheets');
    } finally {
      setSincronizando(false);
    }
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
              setDeletingId(categoria.id);
              const success = await DatabaseService.eliminarCategoria(categoria.id);
              if (success) {
                // ✅ SINCRONIZAR después de eliminar
                await GoogleSheetsService.sincronizarCategoriasEnHojas();
                
                Alert.alert('✅ Éxito', 'Categoría eliminada y sincronizada con Google Sheets');
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
        success = await DatabaseService.actualizarCategoria(categoriaEditar.id, datos);
      } else {
        const maxNumero = categorias.length > 0 
          ? Math.max(...categorias.map(c => c.numero))
          : 0;
        
        success = await DatabaseService.crearCategoria({
          numero: maxNumero + 1,
          nombre: datos.nombre!,
          color: datos.color || '#1a472a',
          activo: true,
        });
      }

      if (success) {
        // ✅ SINCRONIZAR después de crear/editar
        setSincronizando(true);
        await GoogleSheetsService.sincronizarCategoriasEnHojas();
        setSincronizando(false);
        
        Alert.alert(
          '✅ Éxito', 
          categoriaEditar 
            ? 'Categoría actualizada y sincronizada con Google Sheets' 
            : 'Categoría creada y sincronizada con Google Sheets'
        );
        setModalVisible(false);
        cargarCategorias();
      } else {
        Alert.alert('❌ Error', 'No se pudo guardar la categoría');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error al guardar categoría');
    }
  };

  const categoriasFiltradas = categorias.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.numero.toString().includes(busqueda)
  );

  const renderCategoria = ({ item }: { item: Categoria }) => {
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.colorIndicator, { backgroundColor: item.color || '#1a472a' }]} />
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
        <ActivityIndicator size="large" color="#1a472a" />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar categoría..."
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* ✅ NUEVO: Botón de sincronización manual */}
      <View style={styles.syncContainer}>
        <TouchableOpacity 
          style={[styles.syncButton, sincronizando && styles.syncButtonDisabled]}
          onPress={sincronizarConGoogleSheets}
          disabled={sincronizando}
        >
          {sincronizando ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.syncButtonText}> Sincronizando...</Text>
            </>
          ) : (
            <Text style={styles.syncButtonText}>🔄 Sincronizar con Google Sheets</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.syncHint}>
          Actualiza los nombres de categorías en todas las hojas de asistencia
        </Text>
      </View>

      {/* Lista de categorías */}
      <FlatList
        data={categoriasFiltradas}
        keyExtractor={(item) => item.id}
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
    backgroundColor: '#1a472a',
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
