import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ScrollView,
  Modal,
} from 'react-native';
import { Jugador, Categoria, User, RelacionApoderado } from '../../types/v2';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import FormJugador from './FormJugador';
import ModalDetallesJugador from './ModalDetallesJugador';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';
import { useFocusEffect } from '@react-navigation/native';

const JugadoresTab: React.FC = () => {
  const { user } = useAuth();
  const { club } = useClub();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null); // UUID ahora
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [jugadorEditar, setJugadorEditar] = useState<Jugador | undefined>();
  const [jugadorDetalles, setJugadorDetalles] = useState<Jugador | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Gestión apoderados
  const [modalApodVisible, setModalApodVisible] = useState(false);
  const [jugadorApod, setJugadorApod] = useState<Jugador | null>(null);
  const [apodVinculados, setApodVinculados] = useState<{ relacion: RelacionApoderado; apoderado: User }[]>([]);
  const [apodDisponibles, setApodDisponibles] = useState<User[]>([]);
  const [busquedaApod, setBusquedaApod] = useState('');
  const [cargandoApod, setCargandoApod] = useState(false);

  const categoriasEntrenador = useMemo(() => {
    if (user?.role !== 'entrenador') return undefined;
    return user.categoriasAsignadas;
  }, [user?.categoriasAsignadas, user?.role]);

  const entrenadorSinCategorias =
    user?.role === 'entrenador' && (!Array.isArray(categoriasEntrenador) || categoriasEntrenador.length === 0);

  const cargarDatos = useCallback(async () => {
    if (!club) {
      console.warn('⚠️ [JUGADORES TAB] No hay club cargado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [jugadoresData, categoriasData] = await Promise.all([
        SupabaseServiceV2.getJugadoresByClub(club.id),
        SupabaseServiceV2.getCategoriasByClub(club.id),
      ]);
      
      // V2: No hay campo activo, todos son activos
      let jugadoresFiltrados = jugadoresData;
      
      let categoriasOrdenadas = categoriasData.sort((a, b) => (a.orden || 0) - (b.orden || 0));

      // ✅ Permisos entrenador: solo sus categorías asignadas (UUIDs)
      if (user?.role === 'entrenador') {
        if (Array.isArray(categoriasEntrenador) && categoriasEntrenador.length > 0) {
          jugadoresFiltrados = jugadoresFiltrados.filter(j => categoriasEntrenador.includes(j.categoriaId));
          categoriasOrdenadas = categoriasOrdenadas.filter(c => categoriasEntrenador.includes(c.id));
        } else {
          jugadoresFiltrados = [];
          categoriasOrdenadas = [];
          setCategoriaFiltro(null);
        }
      }

      setJugadores(jugadoresFiltrados);
      setCategorias(categoriasOrdenadas);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los jugadores');
    } finally {
      setLoading(false);
    }
  }, [club, categoriasEntrenador, user?.role]);

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

  const getNombreCategoria = (categoriaId: string): string => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat ? cat.nombre : `Categoría`;
  };

  const getColorCategoria = (categoriaId: string): string => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.color || '#1a472a';
  };

  const handleCrear = () => {
    if (entrenadorSinCategorias) {
      Alert.alert(
        'Sin categorías asignadas',
        'No tienes categorías asignadas para inscribir jugadores. Pide a un administrador que te asigne una o más categorías.'
      );
      return;
    }
    setJugadorEditar(undefined);
    setModalVisible(true);
  };

  const handleEditar = (jugador: Jugador) => {
    setJugadorEditar(jugador);
    setModalVisible(true);
  };

  const handleVerDetalles = (jugador: Jugador) => {
    setJugadorDetalles(jugador);
    setModalDetallesVisible(true);
  };

  const handleBloquear = (jugador: Jugador) => {
    // TODO V2: Implementar bloqueo en SupabaseServiceV2 (o eliminar feature)
    Alert.alert('No implementado', 'La función de bloqueo aún no está disponible en V2');
  };

  const handleEliminar = (jugador: Jugador) => {
    Alert.alert(
      '⚠️ Eliminar Jugador',
      `¿Estás seguro de eliminar a ${jugador.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(jugador.id);
              const success = await SupabaseServiceV2.eliminarJugador(jugador.id);
              if (success) {
                Alert.alert('✅ Éxito', 'Jugador eliminado correctamente');
                cargarDatos();
              } else {
                Alert.alert('❌ Error', 'No se pudo eliminar el jugador');
              }
            } catch (error) {
              Alert.alert('❌ Error', 'Error al eliminar jugador');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleGuardar = async (datos: Partial<Jugador>) => {
    if (!club) {
      Alert.alert('❌ Error', 'No se pudo obtener el club');
      return;
    }

    try {
      let result = null;

      if (jugadorEditar) {
        // Editar jugador existente
        result = await SupabaseServiceV2.actualizarJugador(jugadorEditar.id, datos);
      } else {
        // Crear nuevo jugador
        const nuevoJugador: Omit<Jugador, 'id' | 'createdAt' | 'updatedAt'> = {
          clubId: club.id,
          usuarioId: null,
          categoriaId: datos.categoriaId!,
          rut: datos.rut!,
          nombre: datos.nombre!,
          numero: datos.numero,
          fechaNacimiento: datos.fechaNacimiento,
          email: datos.email,
          telefono: datos.telefono,
          contactoEmergencia: datos.contactoEmergencia,
          telEmergencia: datos.telEmergencia,
          relacionEmergencia: datos.relacionEmergencia,
          sistemaSalud: datos.sistemaSalud,
          seguroComplementario: datos.seguroComplementario,
          nombreTutor: datos.nombreTutor,
          rutTutor: datos.rutTutor,
          telTutor: datos.telTutor,
          emailTutor: datos.emailTutor,
          fuma: datos.fuma || false,
          fumaFrecuencia: datos.fumaFrecuencia,
          enfermedades: datos.enfermedades,
          alergias: datos.alergias,
          medicamentos: datos.medicamentos,
          lesiones: datos.lesiones,
          grupoSanguineo: datos.grupoSanguineo,
          actividad: datos.actividad,
          autorizoUsoImagen: datos.autorizoUsoImagen || false,
          datosFormularioExtra: datos.datosFormularioExtra,
        };
        result = await SupabaseServiceV2.crearJugador(nuevoJugador);
      }

      if (result) {
        Alert.alert('✅ Éxito', jugadorEditar ? 'Jugador actualizado' : 'Jugador creado');
        setModalVisible(false);
        cargarDatos();
      } else {
        Alert.alert('❌ Error', 'No se pudo guardar el jugador');
      }
    } catch (error) {
      console.error('Error al guardar jugador:', error);
      Alert.alert('❌ Error', 'Error al guardar el jugador');
    }
  };

  const handleGestionarApoderados = async (jugador: Jugador) => {
    if (!club) return;
    setJugadorApod(jugador);
    setCargandoApod(true);
    setModalApodVisible(true);
    setBusquedaApod('');
    try {
      const [vinculados, todos] = await Promise.all([
        SupabaseServiceV2.getApoderadosByJugador(jugador.id),
        SupabaseServiceV2.getUsuariosByClub(club.id),
      ]);
      setApodVinculados(vinculados);
      setApodDisponibles(todos.filter(u => u.role === 'apoderado'));
    } finally {
      setCargandoApod(false);
    }
  };

  const handleVincularApod = async (apoderado: User) => {
    if (!club || !jugadorApod) return;
    const ok = await SupabaseServiceV2.vincularApoderadoJugador(club.id, apoderado.id, jugadorApod.id);
    if (ok) {
      // Recargar
      const vinculados = await SupabaseServiceV2.getApoderadosByJugador(jugadorApod.id);
      setApodVinculados(vinculados);
      Alert.alert('✅', `${apoderado.nombre} vinculado como apoderado`);
    } else {
      Alert.alert('❌ Error', 'No se pudo crear el vínculo');
    }
  };

  const handleDesvincularApod = async (apoderadoId: string, nombre: string) => {
    if (!jugadorApod) return;
    Alert.alert('Desvincular', `¿Eliminar a ${nombre} como apoderado?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular', style: 'destructive',
        onPress: async () => {
          const ok = await SupabaseServiceV2.desvincularApoderadoJugador(apoderadoId, jugadorApod.id);
          if (ok) {
            const vinculados = await SupabaseServiceV2.getApoderadosByJugador(jugadorApod.id);
            setApodVinculados(vinculados);
          }
        },
      },
    ]);
  };

  const jugadoresFiltrados = jugadores.filter(j => {
    const matchBusqueda = j.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          j.rut.includes(busqueda);
    const matchCategoria = categoriaFiltro === null || j.categoriaId === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  const renderJugador = ({ item }: { item: Jugador }) => {
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.nombre}</Text>
            <Text style={styles.cardRut}>RUT: {item.rut}</Text>
            <View style={styles.categoriaContainer}>
              <View style={[styles.categoriaIndicator, { backgroundColor: getColorCategoria(item.categoriaId) }]} />
              <Text style={styles.categoriaText}>{getNombreCategoria(item.categoriaId)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {/* Solo admins pueden editar/eliminar */}
          {(user?.role === 'admin' || user?.role === 'admin_club') && (
            <>
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

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#5c6bc0' }]}
                onPress={() => handleGestionarApoderados(item)}
              >
                <Text style={styles.buttonText}>👨‍👩‍👧 Apod.</Text>
              </TouchableOpacity>
            </>
          )}
          
          {/* Entrenadores solo ven mensaje informativo */}
          {user?.role === 'entrenador' && (
            <View style={styles.entrenadorInfo}>
              <Text style={styles.entrenadorInfoText}>
                👀 Solo visualización
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a472a" />
        <Text style={styles.loadingText}>Cargando jugadores...</Text>
      </View>
    );
  }

  if (entrenadorSinCategorias) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🏉</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' }}>
          Sin categorías asignadas
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 30 }}>
          Pide a un administrador que te asigne una o más categorías para poder inscribir jugadores.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar jugador..."
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Filtro por categoría con nombres dinámicos */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterButton, categoriaFiltro === null && styles.filterButtonActive]}
          onPress={() => setCategoriaFiltro(null)}
        >
          <Text style={[styles.filterButtonText, categoriaFiltro === null && styles.filterButtonTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>

        {categorias.map((cat) => {
          const nombreMostrar = cat.nombre ? cat.nombre.substring(0, 5) : 'Cat';
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterButton, categoriaFiltro === cat.id && styles.filterButtonActive]}
              onPress={() => setCategoriaFiltro(cat.id)}
            >
              <Text style={[styles.filterButtonText, categoriaFiltro === cat.id && styles.filterButtonTextActive]}>
                {nombreMostrar}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de jugadores */}
      <FlatList
        data={jugadoresFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderJugador}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏉</Text>
            <Text style={styles.emptyTitle}>
              {busqueda || categoriaFiltro !== null ? 'No se encontraron jugadores' : 'Sin jugadores'}
            </Text>
            <Text style={styles.emptyText}>
              {busqueda || categoriaFiltro !== null
                ? 'Intenta con otro término de búsqueda o categoría' 
                : 'Crea tu primer jugador presionando el botón de abajo'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Botón crear - Solo para admins */}
      {(user?.role === 'admin' || user?.role === 'admin_club') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCrear}
        >
          <Text style={styles.fabText}>+ CREAR JUGADOR</Text>
        </TouchableOpacity>
      )}

      {/* Modal de formulario */}
      <FormJugador
        visible={modalVisible}
        jugador={jugadorEditar}
        categoriasPermitidas={user?.role === 'entrenador' ? categoriasEntrenador : undefined}
        onClose={() => setModalVisible(false)}
        onSave={handleGuardar}
      />

      {/* Modal de detalles */}
      <ModalDetallesJugador
        visible={modalDetallesVisible}
        jugador={jugadorDetalles}
        onClose={() => setModalDetallesVisible(false)}
      />

      {/* Modal Apoderados */}
      <Modal visible={modalApodVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalApod}>
            <View style={styles.modalApodHeader}>
              <Text style={styles.modalApodTitulo}>👨‍👩‍👧 Apoderados</Text>
              <TouchableOpacity onPress={() => setModalApodVisible(false)}>
                <Text style={{ fontSize: 22, color: '#fff' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 14 }}>
              <Text style={styles.modalApodSub}>Jugador: {jugadorApod?.nombre}</Text>

              {cargandoApod ? (
                <ActivityIndicator color="#1a472a" style={{ marginVertical: 20 }} />
              ) : (
                <>
                  {/* Vinculados actuales */}
                  <Text style={styles.modalApodSeccion}>Apoderados vinculados</Text>
                  {apodVinculados.length === 0 ? (
                    <Text style={styles.modalApodVacio}>Sin apoderados vinculados</Text>
                  ) : (
                    apodVinculados.map(({ relacion, apoderado }) => (
                      <View key={relacion.id} style={styles.apodRow}>
                        <Text style={styles.apodNombre}>👤 {apoderado.nombre} {apoderado.apellido}</Text>
                        <Text style={styles.apodRol}>{relacion.tipoRelacion}</Text>
                        <TouchableOpacity
                          style={styles.apodRemoveBtn}
                          onPress={() => handleDesvincularApod(apoderado.id, `${apoderado.nombre} ${apoderado.apellido}`)}
                        >
                          <Text style={{ color: '#c62828', fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  {/* Disponibles para vincular */}
                  <Text style={[styles.modalApodSeccion, { marginTop: 16 }]}>
                    Usuarios con rol Apoderado
                  </Text>
                  <TextInput
                    style={styles.modalApodSearch}
                    placeholder="🔍 Buscar por nombre..."
                    value={busquedaApod}
                    onChangeText={setBusquedaApod}
                  />
                  {apodDisponibles
                    .filter(u => {
                      const yaVinculado = apodVinculados.some(v => v.apoderado.id === u.id);
                      const matchBusq = `${u.nombre} ${u.apellido}`.toLowerCase().includes(busquedaApod.toLowerCase());
                      return !yaVinculado && matchBusq;
                    })
                    .map(u => (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.apodDisponibleRow}
                        onPress={() => handleVincularApod(u)}
                      >
                        <Text style={styles.apodNombre}>👤 {u.nombre} {u.apellido}</Text>
                        <Text style={styles.apodVincularText}>⭕ Vincular</Text>
                      </TouchableOpacity>
                    ))
                  }
                  {apodDisponibles.filter(u => !apodVinculados.some(v => v.apoderado.id === u.id)).length === 0 && (
                    <Text style={styles.modalApodVacio}>
                      No hay usuarios con rol apoderado sin vincular.
                      Crea uno desde la pestaña Usuarios.
                    </Text>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalApodCerrarBtn}
              onPress={() => setModalApodVisible(false)}
            >
              <Text style={styles.modalApodCerrarText}>Cerrar</Text>
            </TouchableOpacity>
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
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#1a472a',
    marginRight: 8,
    minWidth: 60,
    minHeight: 34,
  },
  filterButtonActive: {
    backgroundColor: '#1a472a',
    borderColor: '#1a472a',
  },
  filterButtonText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#1a472a',
    fontWeight: '600',
    includeFontPadding: false,
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
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
  cardRut: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoriaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriaIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  categoriaText: {
    fontSize: 14,
    color: '#1a472a',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  entrenadorInfo: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  entrenadorInfoText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonInfo: {
    backgroundColor: '#9C27B0',
  },
  buttonEdit: {
    backgroundColor: '#2196F3',
  },
  buttonDelete: {
    backgroundColor: '#f44336',
  },
  buttonWarning: {
    backgroundColor: '#ff9800',
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
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

  // Apoderados modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalApod: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalApodHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#5c6bc0',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalApodTitulo: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  modalApodSub: { fontSize: 13, color: '#666', marginBottom: 12 },
  modalApodSeccion: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },
  modalApodVacio: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginBottom: 8 },
  apodRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, backgroundColor: '#f5f5f5',
    borderRadius: 8, marginBottom: 6,
  },
  apodNombre: { flex: 1, fontSize: 14, color: '#222' },
  apodRol: { fontSize: 12, color: '#5c6bc0', marginRight: 10 },
  apodRemoveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ffeaea', justifyContent: 'center', alignItems: 'center',
  },
  apodDisponibleRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, backgroundColor: '#e8f5e9',
    borderRadius: 8, marginBottom: 6,
  },
  apodVincularText: { fontSize: 13, color: '#1a472a', fontWeight: '600' },
  modalApodSearch: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 14, marginBottom: 10, backgroundColor: '#fafafa',
  },
  modalApodCerrarBtn: {
    margin: 14, backgroundColor: '#5c6bc0',
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  modalApodCerrarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default JugadoresTab;
