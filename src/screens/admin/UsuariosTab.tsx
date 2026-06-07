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
  Modal,
  ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
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

  // Importación masiva
  const [importModal, setImportModal] = useState(false);
  const [importPaso, setImportPaso] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrores, setImportErrores] = useState<string[]>([]);
  const [importDone, setImportDone] = useState(false);

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

  const handleDescargarPlantillaEntrenadores = async () => {
    if (!club) return;
    try {
      const columnas = ['nombre', 'apellido', 'email', 'telefono', 'contraseña'];
      const ayuda = ['Nombre(s)', 'Apellido(s)', 'Email', 'Teléfono', 'entrenador123 (modificable)'];
      const ejemplo = ['María', 'López', 'maria@mail.com', '+56912345678', 'entrenador123'];
      const wsData = [columnas, ayuda, ejemplo];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = columnas.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Entrenadores');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fecha = new Date().toISOString().split('T')[0];
      const fileName = `Plantilla_Entrenadores_${club.nombre}_${fecha}.xlsx`;
      const fileUri = (FileSystem.documentDirectory ?? '') + fileName;
      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else {
        Alert.alert('Descargado', `Plantilla guardada: ${fileName}`);
      }
    } catch (e: any) {
      Alert.alert('Error', `No se pudo generar la plantilla: ${e.message}`);
    }
  };

  const handleImportarEntrenadores = async () => {
    if (!club) return;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const uri = picked.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = XLSX.read(base64, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const filas: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!filas.length) { Alert.alert('Vacío', 'El archivo no tiene datos.'); return; }

      setImportTotal(filas.length);
      setImportPaso(0);
      setImportErrores([]);
      setImportDone(false);
      setImportModal(true);

      const errores: string[] = [];
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        setImportPaso(i + 1);
        const nombreVal = String(fila['nombre'] || fila['Nombre'] || '').trim();
        const apellidoVal = String(fila['apellido'] || fila['Apellido'] || '').trim();
        const emailVal = String(fila['email'] || fila['Email'] || '').trim();
        const passwordVal = String(fila['contraseña'] || fila['Contraseña'] || fila['password'] || fila['Password'] || fila['clave'] || '').trim() || 'entrenador123';
        if (!nombreVal) {
          errores.push(`Fila ${i + 2}: nombre es obligatorio`);
          continue;
        }
        try {
          const result = await SupabaseServiceV2.crearUsuario({
            clubId: club.id,
            nombre: nombreVal,
            apellido: apellidoVal || undefined,
            email: emailVal || undefined,
            telefono: String(fila['telefono'] || fila['Telefono'] || '').trim() || undefined,
            role: 'entrenador',
            passwordHash: passwordVal,
            categoriasAsignadas: [],
          } as any);
          if (!result) {
            errores.push(`Fila ${i + 2} (${nombreVal}): No se pudo crear`);
          }
        } catch (e: any) {
          errores.push(`Fila ${i + 2} (${nombreVal}): ${e.message}`);
        }
      }
      setImportErrores(errores);
      setImportDone(true);
      cargarDatos();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setImportModal(false);
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

      {/* Barra de acción */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1a472a' }]} onPress={handleCrear}>
          <Text style={styles.actionBtnText}>➕ Crear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1565c0' }]} onPress={handleImportarEntrenadores}>
          <Text style={styles.actionBtnText}>📥 Importar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6a1b9a' }]} onPress={handleDescargarPlantillaEntrenadores}>
          <Text style={styles.actionBtnText}>📋 Plantilla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0277bd' }]} onPress={handleExportarUsuarios}>
          <Text style={styles.actionBtnText}>📊 Exportar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de formulario */}
      <FormUsuario
        visible={modalVisible}
        usuario={usuarioEditar}
        onClose={() => setModalVisible(false)}
        onSave={handleGuardar}
      />

      {/* Modal progreso importación */}
      <Modal visible={importModal} animationType="fade" transparent>
        <View style={styles.importOverlay}>
          <View style={styles.importCard}>
            <Text style={styles.importTitle}>📥 Importando entrenadores...</Text>
            <Text style={styles.importSub}>⚠️ No cierres la app hasta que termine el proceso.</Text>
            <Text style={styles.importCount}>{importPaso} / {importTotal}</Text>
            {!importDone && <ActivityIndicator color="#1a472a" size="large" style={{ marginTop: 12 }} />}
            {importDone && (
              <>
                <Text style={[styles.importCount, { color: '#2e7d32', marginTop: 12 }]}>✅ Proceso completado</Text>
                {importErrores.length > 0 && (
                  <ScrollView style={{ maxHeight: 130, marginTop: 8, width: '100%' }}>
                    {importErrores.map((e, i) => (
                      <Text key={i} style={styles.importError}>{e}</Text>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity style={styles.importClose} onPress={() => setImportModal(false)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100,
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  importOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  importCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '85%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  importTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a472a', marginBottom: 8 },
  importSub: { fontSize: 12, color: '#e65100', textAlign: 'center', marginBottom: 16 },
  importCount: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  importError: { fontSize: 12, color: '#c62828', marginBottom: 4 },
  importClose: {
    marginTop: 16, backgroundColor: '#1a472a',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32,
  },
});

export default UsuariosTab;
