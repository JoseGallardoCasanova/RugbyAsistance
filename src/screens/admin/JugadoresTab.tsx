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
  ScrollView, // ✅ AGREGADO: Import faltante
} from 'react-native';
import { Jugador, Categoria } from '../../types';
import SupabaseService from '../../services/SupabaseService';
import { usePreferences } from '../../context/PreferencesContext';
import { Colors } from '../../config/theme';
import FormJugador from './FormJugador';
import ModalDetallesJugador from './ModalDetallesJugador';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const JugadoresTab: React.FC = () => {
  const { user } = useAuth();
  const { currentColors, fontSizes } = usePreferences();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [jugadorEditar, setJugadorEditar] = useState<Jugador | undefined>();
  const [jugadorDetalles, setJugadorDetalles] = useState<Jugador | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoriasEntrenador = useMemo(() => {
    if (user?.role !== 'entrenador') return undefined;
    return user.categoriasAsignadas;
  }, [user?.categoriasAsignadas, user?.role]);

  const entrenadorSinCategorias =
    user?.role === 'entrenador' && (!Array.isArray(categoriasEntrenador) || categoriasEntrenador.length === 0);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [jugadoresData, categoriasData] = await Promise.all([
        SupabaseService.obtenerJugadores(),
        SupabaseService.obtenerCategorias(),
      ]);
      
      let activos = jugadoresData.filter(j => j.activo !== false);
      
      let categoriasActivas = categoriasData
        .filter(c => c.activo !== false)
        .sort((a, b) => a.numero - b.numero);

      // ✅ Permisos entrenador: solo su categoría asignada (1)
      if (user?.role === 'entrenador') {
        if (Array.isArray(categoriasEntrenador) && categoriasEntrenador.length > 0) {
          activos = activos.filter(j => categoriasEntrenador.includes(j.categoria));
          categoriasActivas = categoriasActivas.filter(c => categoriasEntrenador.includes(c.numero));
        } else {
          activos = [];
          categoriasActivas = [];
          setCategoriaFiltro(null);
        }
      }

      setJugadores(activos);
      setCategorias(categoriasActivas);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los jugadores');
    } finally {
      setLoading(false);
    }
  }, [categoriasEntrenador, user?.role]);

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

  const getNombreCategoria = (numero: number): string => {
    const cat = categorias.find(c => c.numero === numero);
    return cat ? cat.nombre : `Categoría ${numero}`;
  };

  const getColorCategoria = (numero: number): string => {
    const cat = categorias.find(c => c.numero === numero);
    return cat?.color || current'#2563eb' // Colors.primary;
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
    const accion = jugador.bloqueado ? 'desbloquear' : 'bloquear';
    Alert.alert(
      `⚠️ ${jugador.bloqueado ? 'Desbloquear' : 'Bloquear'} Jugador`,
      `¿Estás seguro de ${accion} a ${jugador.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setDeletingId(jugador.rut);
              const nuevoEstado = !jugador.bloqueado;
              
              const success = await SupabaseService.bloquearJugador(jugador.rut, nuevoEstado);
              
              if (success) {
                Alert.alert('✅ Éxito', `Jugador ${accion}do correctamente`);
                await cargarDatos();
              } else {
                Alert.alert('❌ Error', `No se pudo ${accion} el jugador`);
              }
            } catch (error) {
              console.error('🔒 [JUGADORES TAB] Error al bloquear:', error);
              Alert.alert('❌ Error', `Error al ${accion} el jugador: ${error}`);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
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
              setDeletingId(jugador.rut);
              const success = await SupabaseService.eliminarJugador(jugador.rut);
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
    try {
      let success = false;

      // ✅ Permisos entrenador: debe ser una categoría asignada
      if (user?.role === 'entrenador') {
        if (!Array.isArray(categoriasEntrenador) || categoriasEntrenador.length === 0) {
          Alert.alert('Sin categorías', 'No tienes categorías asignadas para crear/editar jugadores.');
          return;
        }
        const categoriaElegida = datos.categoria;
        if (typeof categoriaElegida !== 'number' || !categoriasEntrenador.includes(categoriaElegida)) {
          Alert.alert('Sin acceso', 'Solo puedes usar tus categorías asignadas.');
          return;
        }
      }

      if (jugadorEditar) {
        success = await SupabaseService.actualizarJugador(jugadorEditar.rut, datos);
      } else {
        success = await SupabaseService.crearJugador({
          nombre: datos.nombre!,
          rut: datos.rut!,
          categoria: datos.categoria!,
          activo: true,
        });
      }

      if (success) {
        Alert.alert('✅ Éxito', jugadorEditar ? 'Jugador actualizado' : 'Jugador creado');
        setModalVisible(false);
        cargarDatos();
      } else {
        Alert.alert('❌ Error', 'No se pudo guardar el jugador');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error al guardar jugador');
    }
  };

  const jugadoresFiltrados = jugadores.filter(j => {
    const matchBusqueda = j.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          j.rut.includes(busqueda);
    const matchCategoria = categoriaFiltro === null || j.categoria === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  const renderJugador = ({ item }: { item: Jugador }) => {
    const isDeleting = deletingId === item.rut;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.nombre}</Text>
            <Text style={styles.cardRut}>RUT: {item.rut}</Text>
            <View style={styles.categoriaContainer}>
              <View style={[styles.categoriaIndicator, { backgroundColor: getColorCategoria(item.categoria) }]} />
              <Text style={styles.categoriaText}>{getNombreCategoria(item.categoria)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {/* Solo admins pueden editar/eliminar */}
          {user?.role === 'admin' && (
            <>
              <TouchableOpacity
                style={[styles.button, item.bloqueado ? styles.buttonSuccess : styles.buttonWarning, isDeleting && styles.buttonDisabled]}
                onPress={() => handleBloquear(item)}
                disabled={isDeleting}
              >
                <Text style={styles.buttonText}>{item.bloqueado ? '🔓 Desbloquear' : '🔒 Bloquear'}</Text>
              </TouchableOpacity>

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
        <ActivityIndicator size="large" color={current'#2563eb' // Colors.primary} />
        <Text style={[styles.loadingText, { fontSize: fontSizes.md, color: currentColors.textSecondary }]}>Cargando jugadores...</Text>
      </View>
    );
  }

  if (entrenadorSinCategorias) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🏉</Text>
        <Text style={{ fontSize: fontSizes.lg, fontWeight: 'bold', color: currentColors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
          Sin categorías asignadas
        </Text>
        <Text style={{ fontSize: fontSizes.sm, color: currentColors.textSecondary, textAlign: 'center', paddingHorizontal: 30 }}>
          Pide a un administrador que te asigne una o más categorías para poder inscribir jugadores.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Barra de búsqueda */}
      <View style={[styles.searchContainer, { backgroundColor: currentColors.backgroundWhite }]}>
        <TextInput
          style={[styles.searchInput, { fontSize: fontSizes.md, color: currentColors.textPrimary }]}
          placeholder="🔍 Buscar jugador..."
          placeholderTextColor={currentColors.textLight}
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
          const nombreMostrar = cat.nombre ? cat.nombre.substring(0, 5) : `M${cat.numero}`;
          return (
            <TouchableOpacity
              key={String(cat.numero)}
              style={[styles.filterButton, categoriaFiltro === cat.numero && styles.filterButtonActive]}
              onPress={() => setCategoriaFiltro(cat.numero)}
            >
              <Text style={[styles.filterButtonText, categoriaFiltro === cat.numero && styles.filterButtonTextActive]}>
                {nombreMostrar}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de jugadores */}
      <FlatList
        data={jugadoresFiltrados}
        keyExtractor={(item) => item.rut}
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
      {user?.role === 'admin' && (
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
    borderColor: '#2563eb' // Colors.primary,
    marginRight: 8,
    minWidth: 60,
    minHeight: 34,
  },
  filterButtonActive: {
    backgroundColor: '#2563eb' // Colors.primary,
    borderColor: '#2563eb' // Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#2563eb' // Colors.primary,
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
    color: Colors.textPrimary,
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
    backgroundColor: '#2563eb' // Colors.primary,
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

export default JugadoresTab;
