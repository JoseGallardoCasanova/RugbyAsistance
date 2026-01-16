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
import { User, Categoria } from '../../types';
import SupabaseService from '../../services/SupabaseService';
import FormUsuario from './FormUsuario';
import { Colors } from '../../config/theme';
import { usePreferences } from '../../context/PreferencesContext';
import { useFocusEffect } from '@react-navigation/native';

const UsuariosTab: React.FC = () => {
  const { currentColors, fontSizes } = usePreferences();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]); // ✅ NUEVO
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<User | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      // ✅ Cargar tanto usuarios como categorías
      const [usuariosData, categoriasData] = await Promise.all([
        SupabaseService.obtenerUsuarios(),
        SupabaseService.obtenerCategorias(),
      ]);
      
      const activos = usuariosData.filter(u => u.activo !== false);
      setUsuarios(activos);
      
      const categoriasActivas = categoriasData.filter(c => c.activo !== false);
      setCategorias(categoriasActivas);
      
      console.log(`📥 Usuarios cargados: ${activos.length}`);
      console.log(`📥 Categorías cargadas: ${categoriasActivas.length}`);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  // ✅ NUEVA FUNCIÓN: Obtener nombre de categoría
  const getNombreCategoria = (numero: number): string => {
    const cat = categorias.find(c => c.numero === numero);
    return cat ? cat.nombre : `Categoría ${numero}`;
  };

  // ✅ NUEVA FUNCIÓN: Obtener nombres de múltiples categorías
  const getNombresCategorias = (numeros: number[]): string => {
    return numeros.map(n => getNombreCategoria(n)).join(', ');
  };

  const handleCrear = () => {
    setUsuarioEditar(undefined);
    setModalVisible(true);
  };

  const handleEditar = (usuario: User) => {
    setUsuarioEditar(usuario);
    setModalVisible(true);
  };

  const handleEliminar = (usuario: User) => {
    Alert.alert(
      '⚠️ Eliminar Usuario',
      `¿Estás seguro de eliminar a ${usuario.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(String(usuario.id));
              const idNumero = typeof usuario.id === 'number' ? usuario.id : Number(usuario.id);
              if (!Number.isFinite(idNumero)) {
                Alert.alert('❌ Error', 'ID de usuario inválido. Verifica la configuración de la base de datos.');
                return;
              }

              const success = await SupabaseService.eliminarUsuario(idNumero);
              if (success) {
                Alert.alert('✅ Éxito', 'Usuario eliminado correctamente');
                cargarDatos();
              } else {
                Alert.alert('❌ Error', 'No se pudo eliminar el usuario');
              }
            } catch (error) {
              Alert.alert('❌ Error', 'Error al eliminar usuario');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleGuardar = async (datos: Partial<User>) => {
    try {
      let success = false;

      if (usuarioEditar) {
        const idNumero = typeof usuarioEditar.id === 'number' ? usuarioEditar.id : Number(usuarioEditar.id);
        if (!Number.isFinite(idNumero)) {
          Alert.alert('❌ Error', 'ID de usuario inválido. Verifica la configuración de la base de datos.');
          return;
        }
        success = await SupabaseService.actualizarUsuario(idNumero, datos);
      } else {
        success = await SupabaseService.crearUsuario({
          nombre: datos.nombre!,
          email: datos.email!,
          password: datos.password!,
          role: datos.role!,
          categoriaAsignada: datos.categoriaAsignada,
          categoriasAsignadas: datos.categoriasAsignadas,
          activo: true,
        });
      }

      if (success) {
        Alert.alert('✅ Éxito', usuarioEditar ? 'Usuario actualizado' : 'Usuario creado');
        setModalVisible(false);
        cargarDatos();
      } else {
        Alert.alert('❌ Error', 'No se pudo guardar el usuario');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error al guardar usuario');
    }
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.role.toLowerCase().includes(busqueda.toLowerCase())
  );

  const renderUsuario = ({ item }: { item: User }) => {
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.nombre}</Text>
            <Text style={styles.cardEmail}>{item.email}</Text>
            <View style={styles.roleContainer}>
              <View style={[styles.roleBadge, getRoleStyle(item.role)]}>
                <Text style={styles.roleBadgeText}>{getRoleLabel(item.role)}</Text>
              </View>
            </View>
            
            {/* ✅ MOSTRAR CATEGORÍAS CON NOMBRES DINÁMICOS */}
            {item.role === 'ayudante' && item.categoriaAsignada && (
              <Text style={styles.categoriaText}>
                📋 {getNombreCategoria(item.categoriaAsignada)}
              </Text>
            )}
            {item.role === 'entrenador' && item.categoriasAsignadas && item.categoriasAsignadas.length > 0 && (
              <Text style={styles.categoriaText}>
                📋 {getNombresCategorias(item.categoriasAsignadas)}
              </Text>
            )}
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

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return '👑 Admin';
      case 'entrenador': return '🏃 Entrenador';
      case 'ayudante': return '👤 Ayudante';
      default: return role;
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return styles.roleAdmin;
      case 'entrenador': return styles.roleEntrenador;
      case 'ayudante': return styles.roleAyudante;
      default: return {};
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar usuario..."
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Lista de usuarios */}
      <FlatList
        data={usuariosFiltrados}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUsuario}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>
              {busqueda ? 'No se encontraron usuarios' : 'Sin usuarios'}
            </Text>
            <Text style={styles.emptyText}>
              {busqueda 
                ? 'Intenta con otro término de búsqueda' 
                : 'Crea tu primer usuario presionando el botón de abajo'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Botón crear */}
      <TouchableOpacity style={styles.fab} onPress={handleCrear}>
        <Text style={styles.fabText}>+ CREAR USUARIO</Text>
      </TouchableOpacity>

      {/* Modal de formulario */}
      <FormUsuario
        visible={modalVisible}
        usuario={usuarioEditar}
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
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  roleAdmin: {
    backgroundColor: '#FF6B35',
  },
  roleEntrenador: {
    backgroundColor: '#2196F3',
  },
  roleAyudante: {
    backgroundColor: '#4CAF50',
  },
  categoriaText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 5,
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
    backgroundColor: Colors.primary,
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

export default UsuariosTab;
