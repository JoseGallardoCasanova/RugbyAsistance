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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { User, Categoria } from '../../types/v2';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import FormUsuario from './FormUsuario';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';

const UsuariosTab: React.FC = () => {
  const { user } = useAuth();
  const { club } = useClub();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<User | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!club) return;
    
    try {
      setLoading(true);
      const [usuariosData, categoriasData] = await Promise.all([
        SupabaseServiceV2.getUsuariosByClub(club.id),
        SupabaseServiceV2.getCategoriasByClub(club.id),
      ]);
      
      setUsuarios(usuariosData);
      setCategorias(categoriasData);
      
      console.log(`📥 Usuarios cargados: ${usuariosData.length}`);
      console.log(`📥 Categorías cargadas: ${categoriasData.length}`);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [club]);

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

  // Obtener nombre de categoría por UUID
  const getNombreCategoria = (categoriaId: string): string => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat ? cat.nombre : `Categoría`;
  };

  // Obtener nombres de múltiples categorías por UUIDs
  const getNombresCategorias = (categoriaIds: string[]): string => {
    return categoriaIds.map(id => getNombreCategoria(id)).join(', ');
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
              setDeletingId(usuario.id);
              const success = await SupabaseServiceV2.eliminarUsuario(usuario.id);
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
    if (!club) {
      Alert.alert('❌ Error', 'No se pudo obtener el club');
      return;
    }

    try {
      let result = null;

      if (usuarioEditar) {
        // Editar usuario existente
        result = await SupabaseServiceV2.actualizarUsuario(usuarioEditar.id, datos);
      } else {
        // Crear nuevo usuario con el password ingresado en el formulario
        const nuevoUsuario: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'ultimoLogin'> = {
          clubId: club.id,
          email: datos.email!,
          passwordHash: datos.passwordHash!, // Password viene del formulario, se hasheará en el servicio
          nombre: datos.nombre!,
          apellido: datos.apellido,
          fotoUrl: datos.fotoUrl,
          telefono: datos.telefono,
          role: datos.role!,
          categoriasAsignadas: datos.categoriasAsignadas || [],
        };
        
        result = await SupabaseServiceV2.crearUsuario(nuevoUsuario);
        
        if (result) {
          // Confirmar creación
          Alert.alert(
            '✅ Usuario Creado',
            `Usuario creado exitosamente.\n\n` +
            `👤 Username: ${result.username}\n\n` +
            `El usuario puede iniciar sesión con su username y la contraseña que configuraste.`
          );
        }
      }

      if (result) {
        if (usuarioEditar) {
          Alert.alert('✅ Éxito', 'Usuario actualizado');
        }
        setModalVisible(false);
        cargarDatos();
      } else {
        Alert.alert('❌ Error', 'No se pudo guardar el usuario');
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      Alert.alert('❌ Error', 'Error al guardar el usuario');
    }
  };

  const handleExportarUsuarios = async () => {
    try {
      if (usuarios.length === 0) {
        Alert.alert('Sin datos', 'No hay usuarios para exportar');
        return;
      }

      console.log('📊 [USUARIOS] Exportando usuarios con usernames...');

      // Preparar datos para Excel
      const datosExcel = usuarios.map(u => ({
        'Nombre': u.nombre,
        'Apellido': u.apellido,
        'Username': u.username,
        'Email': u.email,
        'Teléfono': u.telefono || '',
        'Rol': getRoleLabel(u.role),
        'Categorías Asignadas': u.role === 'entrenador' 
          ? getNombresCategorias(u.categoriasAsignadas) 
          : '-',
        'Último Login': u.ultimoLogin 
          ? new Date(u.ultimoLogin).toLocaleDateString('es-CL') 
          : 'Nunca',
      }));

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

      // Ajustar anchos de columna
      ws['!cols'] = [
        { wch: 15 }, // Nombre
        { wch: 15 }, // Apellido
        { wch: 15 }, // Username
        { wch: 25 }, // Email
        { wch: 12 }, // Teléfono
        { wch: 15 }, // Rol
        { wch: 30 }, // Categorías
        { wch: 15 }, // Último Login
      ];

      // Generar archivo
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const fecha = new Date().toISOString().split('T')[0];
      const fileName = `Usuarios_${club?.nombre || 'Club'}_${fecha}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Compartir archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Alert.alert('✅ Exportación Exitosa', 'El archivo Excel se ha generado correctamente');
      } else {
        Alert.alert('Error', 'No se puede compartir archivos en este dispositivo');
      }

    } catch (error: any) {
      console.error('❌ Error al exportar usuarios:', error);
      Alert.alert('Error', `No se pudo exportar: ${error.message}`);
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
            
            {/* MOSTRAR CATEGORÍAS CON NOMBRES DINÁMICOS */}
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
      case 'admin_club': return '👑 Admin Club';
      case 'entrenador': return '🏃 Entrenador';
      case 'ayudante': return '👤 Ayudante';
      default: return role;
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return styles.roleAdmin;
      case 'admin_club': return styles.roleAdmin;
      case 'entrenador': return styles.roleEntrenador;
      case 'ayudante': return styles.roleAyudante;
      default: return {};
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a472a" />
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

      {/* Botones de acción */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.fab, styles.fabExport]} 
          onPress={handleExportarUsuarios}
        >
          <Text style={styles.fabText}>📊 EXPORTAR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.fab, styles.fabCreate]} 
          onPress={handleCrear}
        >
          <Text style={styles.fabText}>+ CREAR</Text>
        </TouchableOpacity>
      </View>

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
    color: '#1a472a',
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
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  fab: {
    backgroundColor: '#1a472a',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabExport: {
    backgroundColor: '#2196F3',
  },
  fabCreate: {
    backgroundColor: '#1a472a',
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default UsuariosTab;
