import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContextV2';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import NotificacionesService from '../services/NotificacionesService';
import { useClub } from '../context/ClubContext';
import { Categoria, Aviso, Jugador } from '../types/v2';
import BotonFlotanteInscripcion from '../components/BotonFlotanteInscripcion';
import FormularioAutoinscripcion from './FormularioAutoinscripcion';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout, reloadUser } = useAuth();
  const { club } = useClub();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState(user?.nombre || '');
  // Rol dual: jugador que también es apoderado (y viceversa)
  const [jugadorVinculadoId, setJugadorVinculadoId] = useState<string | null>(null);
  const [esApoderadoTambien, setEsApoderadoTambien] = useState(false);
  // Avisos del club
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  // Jugador vinculado (datos completos, incluyendo categoriaId)
  const [jugadorData, setJugadorData] = useState<Jugador | null>(null);
  // Notificaciones semanales de entrenamiento
  const [notifActivas, setNotifActivas] = useState(false);
  const [cargandoNotif, setCargandoNotif] = useState(false);

  // ✅ Refs estables para evitar que useFocusEffect se re-dispare al cambiar user/club
  const clubRef = React.useRef(club);
  const userRef = React.useRef(user);
  React.useEffect(() => { clubRef.current = club; }, [club]);
  React.useEffect(() => { userRef.current = user; }, [user]);

  // Carga inicial de categorías cuando club esté disponible
  useEffect(() => {
    cargarCategorias();
  }, [club?.id]); // solo si cambia el clubId real

  // Sincronizar nombre del usuario cuando cambie
  useEffect(() => {
    setUserDisplayName(user?.nombre || '');
  }, [user?.nombre]);

  // ✅ Auto-recargar al volver a esta pantalla — deps vacías para evitar loop infinito.
  // Accedemos a club/user a través de refs para leer el valor actual sin re-ejecutar al cambiar.
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 [HOME] Pantalla enfocada, recargando datos...');
      reloadUser();
      cargarCategorias();

      const currentClub = clubRef.current;
      const currentUser = userRef.current;

      if (currentClub) {
        SupabaseServiceV2.getAvisosByClub(currentClub.id, true)
          .then(data => setAvisos(data.slice(0, 5)))
          .catch(() => {});
      }

      if (currentClub && currentUser) {
        const esJugadorOApoderado = currentUser.role === 'jugador' || currentUser.role === 'apoderado';
        if (esJugadorOApoderado) {
          SupabaseServiceV2.getJugadorByUsuarioId(currentUser.id)
            .then(j => {
              setJugadorVinculadoId(j?.id ?? null);
              setJugadorData(j);
            })
            .catch(() => {});
          SupabaseServiceV2.getRelacionesByApoderado(currentUser.id)
            .then(rels => setEsApoderadoTambien(rels.length > 0))
            .catch(() => {});
          NotificacionesService.estaActivoSemanal()
            .then(activo => setNotifActivas(activo))
            .catch(() => {});
        }
        // (Super admin: ya no carga clubes aquí, tiene su propio dashboard)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // ← deps vacías: el callback nunca se recrea, rompe el loop
  );

  const cargarCategorias = async () => {
    const currentClub = clubRef.current;
    if (!currentClub) {
      console.warn('⚠️ [HOME] No hay club cargado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await SupabaseServiceV2.getCategoriasByClub(currentClub.id);
      
      // Ordenar por número
      const ordenadas = data.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      
      setCategorias(ordenadas);
      console.log(`📥 Categorías cargadas: ${ordenadas.length}`);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoriaPress = (categoria: Categoria) => {
    // TODO V2: Actualizar verificación de permisos para usar UUIDs
    // Por ahora, solo verificar que el usuario tenga acceso (ya se verifica arriba)
    if (!puedeVerCategoria(categoria)) {
      Alert.alert(
        'Sin acceso',
        `No tienes permisos para ver esta categoría`
      );
      return;
    }

    // Navegar a marcar asistencia (pasar todo el objeto)
    navigation.navigate('Asistencia', { 
      categoria: categoria.id,
      categoriaNombre: categoria.nombre 
    });
  };

  const getCategoriaName = (categoriaId?: string) => {
    if (!categoriaId) return 'N/A';
    const cat = categorias.find(c => c.id === categoriaId);
    return cat ? cat.nombre : `Categoría`;
  };

  const handleAdminPress = () => {
    if (user?.role === 'super_admin' || user?.role === 'admin_club') {
      navigation.navigate('Admin');
      return;
    }

    if (user?.role === 'entrenador') {
      navigation.navigate('Admin', { initialTab: 'jugadores' });
      return;
    }

    Alert.alert('Sin permisos', 'Solo administradores y entrenadores pueden acceder');
  };

  const handlePerfilPress = () => {
    navigation.navigate('Perfil');
  };

  // Categoría del jugador (derivado de jugadorData + lista de categorías cargadas)
  const categoriaJugador: Categoria | null =
    jugadorData?.categoriaId
      ? (categorias.find(c => c.id === jugadorData.categoriaId) ?? null)
      : null;

  const handleToggleNotif = async (activar: boolean) => {
    if (!categoriaJugador) return;
    setCargandoNotif(true);
    try {
      if (activar) {
        const ok = await NotificacionesService.programarEntrenamientosSemanales(
          categoriaJugador.nombre,
          categoriaJugador.diasEntrenamiento,
          categoriaJugador.horarios
        );
        if (ok) {
          setNotifActivas(true);
          Alert.alert('🔔 Listo', 'Recibirás recordatorios 15 min antes de cada entrenamiento.');
        } else {
          Alert.alert('Sin permiso', 'Debes permitir las notificaciones en la configuración del dispositivo.');
        }
      } else {
        await NotificacionesService.cancelarEntrenamientosSemanales();
        setNotifActivas(false);
      }
    } finally {
      setCargandoNotif(false);
    }
  };

  const puedeVerCategoria = (categoria: Categoria): boolean => {
    // TODO V2: Actualizar lógica de permisos para usar categorias_asignadas (UUID[])
    // Por ahora, admin_club y admin tienen acceso total
    if (user?.role === 'super_admin' || user?.role === 'admin_club') return true;
    
    // Para entrenadores, verificar si tienen la categoría asignada (por UUID)
    if (user?.role === 'entrenador') {
      // categoriasAsignadas es un array de UUIDs en V2
      return user.categoriasAsignadas?.includes(categoria.id) || false;
    }
    
    return false;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          backgroundColor="#1a472a" 
          barStyle="light-content" 
          translucent={false}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor="#1a472a" 
        barStyle="light-content" 
        translucent={false}
      />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={club?.logoUrl ? { uri: club.logoUrl } : require('../../assets/logo_Old_Green.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Hola, {userDisplayName}</Text>
            <Text style={styles.subtitle}>
              {user?.role === 'super_admin' && 'Super Admin'}
              {user?.role === 'admin_club' && 'Administrador del Club'}
              {user?.role === 'entrenador' && 'Entrenador'}
              {user?.role === 'jugador' && 'Jugador'}
              {user?.role === 'apoderado' && 'Apoderado'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          {(user?.role === 'super_admin' || user?.role === 'admin_club' || user?.role === 'entrenador') && (
            <TouchableOpacity onPress={handleAdminPress} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>⚙️</Text>
            </TouchableOpacity>
          )}
          {user?.role === 'apoderado' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Apoderado')}
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>👨‍👩‍👧</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handlePerfilPress} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Super admin: banner de club activo */}
      {user?.role === 'super_admin' && (
        <TouchableOpacity
          style={styles.superAdminBanner}
          onPress={() => navigation.navigate('SuperAdminDashboard')}
          activeOpacity={0.8}
        >
          <View style={styles.superAdminBannerLeft}>
            <Text style={styles.superAdminBannerLabel}>🏟️ Club activo</Text>
            <Text style={styles.superAdminBannerClub} numberOfLines={1}>
              {club ? club.nombre : 'Ninguno seleccionado'}
            </Text>
          </View>
          <View style={styles.superAdminBannerRight}>
            <Text style={styles.superAdminBannerBtn}>Ver todos ›</Text>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        {/* Admin / Super Admin: acceso rápido a pagos */}
        {(user?.role === 'super_admin' || user?.role === 'admin_club') && (
          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: '#e8f5e9', borderColor: '#1a472a' }]}
            onPress={() => navigation.navigate('Admin', { initialTab: 'pagos' })}
          >
            <Text style={styles.roleCardIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleCardTitle, { color: '#1b5e20' }]}>Pagos del Club</Text>
              <Text style={styles.roleCardSub}>Precios, descuentos globales y historial de pagos</Text>
            </View>
            <Text style={[styles.roleCardArrow, { color: '#1a472a' }]}>›</Text>
          </TouchableOpacity>
        )}

        {/* Jugador: acceso rápido a su perfil */}
        {(user?.role === 'jugador' || jugadorVinculadoId) && (
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => navigation.navigate('PerfilJugador', jugadorVinculadoId && user?.role !== 'jugador' ? { jugadorId: jugadorVinculadoId } : undefined)}
          >
            <Text style={styles.roleCardIcon}>🏉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleCardTitle}>Mi Perfil de Jugador</Text>
              <Text style={styles.roleCardSub}>Ver asistencias, estadísticas y datos personales</Text>
            </View>
            <Text style={styles.roleCardArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Jugador: tarjeta de entrenamiento */}
        {user?.role === 'jugador' && categoriaJugador && categoriaJugador.diasEntrenamiento?.length > 0 && (() => {
          const diasOrden = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
          const diasLabels: Record<string,string> = { lunes:'Lun', martes:'Mar', miercoles:'Mié', jueves:'Jue', viernes:'Vie', sabado:'Sáb', domingo:'Dom' };
          const hoyNum = new Date().getDay(); // 0=dom, 1=lun, ...
          const hoyKey = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][hoyNum];
          const entrenaHoy = categoriaJugador.diasEntrenamiento.includes(hoyKey);

          return (
            <View style={[styles.entrenamientoCard, entrenaHoy && styles.entrenamientoCardHoy]}>
              <View style={styles.entrenamientoHeader}>
                <Text style={styles.entrenamientoTitulo}>
                  {entrenaHoy ? '⚡ ¡Entrenas hoy!' : '📅 Horario de Entrenamientos'}
                </Text>
                <Text style={styles.entrenamientoCat}>{categoriaJugador.nombre}</Text>
              </View>

              {/* Chips de días */}
              <View style={styles.diasRow}>
                {diasOrden.map(dia => {
                  const activo = categoriaJugador.diasEntrenamiento.includes(dia);
                  const esHoy  = dia === hoyKey;
                  if (!activo) return null;
                  return (
                    <View key={dia} style={[
                      styles.diaChip,
                      esHoy && styles.diaChipHoy,
                    ]}>
                      <Text style={[styles.diaChipText, esHoy && styles.diaChipTextHoy]}>
                        {diasLabels[dia]}
                      </Text>
                      {categoriaJugador.horarios?.[dia] ? (
                        <Text style={[styles.diaChipHora, esHoy && styles.diaChipHoraHoy]}>
                          {categoriaJugador.horarios[dia]}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {/* Toggle notificaciones */}
              <View style={styles.notifRow}>
                <Text style={styles.notifLabel}>🔔 Recordatorios</Text>
                {cargandoNotif
                  ? <ActivityIndicator size="small" color="#1a472a" />
                  : <Switch
                      value={notifActivas}
                      onValueChange={handleToggleNotif}
                      trackColor={{ false: '#ddd', true: '#a5d6a7' }}
                      thumbColor={notifActivas ? '#1a472a' : '#f4f3f4'}
                    />
                }
              </View>
            </View>
          );
        })()}

        {/* Jugador: acceso rápido a pago */}
        {user?.role === 'jugador' && jugadorData && (
          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: '#fff3e0', borderColor: '#e65100' }]}
            onPress={() => navigation.navigate('Pago', { jugadorIds: [jugadorData.id] })}
          >
            <Text style={styles.roleCardIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleCardTitle, { color: '#bf360c' }]}>Pagar cuota</Text>
              <Text style={styles.roleCardSub}>Registra tu mensualidad, matrícula o pago anual</Text>
            </View>
            <Text style={[styles.roleCardArrow, { color: '#e65100' }]}>›</Text>
          </TouchableOpacity>
        )}

        {/* Apoderado: acceso al portal */}
        {(user?.role === 'apoderado' || esApoderadoTambien) && (
          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: '#ede7f6', borderColor: '#5c6bc0' }]}
            onPress={() => navigation.navigate('Apoderado')}
          >
            <Text style={styles.roleCardIcon}>👨‍👩‍👧</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleCardTitle, { color: '#3949ab' }]}>Portal Apoderado</Text>
              <Text style={styles.roleCardSub}>Ver asistencias y datos de tus hijos</Text>
            </View>
            <Text style={[styles.roleCardArrow, { color: '#5c6bc0' }]}>›</Text>
          </TouchableOpacity>
        )}

        {/* Jugador / Apoderado: evaluar entrenador */}
        {(user?.role === 'jugador' || user?.role === 'apoderado' || esApoderadoTambien) && (
          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}
            onPress={() => navigation.navigate('Evaluaciones')}
          >
            <Text style={styles.roleCardIcon}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleCardTitle, { color: '#92400e' }]}>Evaluar Entrenador</Text>
              <Text style={styles.roleCardSub}>Califica a tu entrenador de forma anónima</Text>
            </View>
            <Text style={[styles.roleCardArrow, { color: '#f59e0b' }]}>›</Text>
          </TouchableOpacity>
        )}

        {/* Avisos del club */}
        {avisos.length > 0 && (
          <View style={styles.avisosSection}>
            {avisos.map(aviso => {
              const colorMap = {
                info:    { bg: '#e3f2fd', border: '#1565c0', icon: 'ℹ️', text: '#1565c0' },
                warning: { bg: '#fff3e0', border: '#e65100', icon: '⚠️', text: '#e65100' },
                urgente: { bg: '#ffebee', border: '#b71c1c', icon: '🚨', text: '#b71c1c' },
              };
              const c = colorMap[aviso.tipo] ?? colorMap.info;
              return (
                <View key={aviso.id} style={[styles.avisoCard, { backgroundColor: c.bg, borderLeftColor: c.border }]}>
                  <View style={styles.avisoHeader}>
                    <Text style={styles.avisoIcon}>{c.icon}</Text>
                    <Text style={[styles.avisoTitulo, { color: c.text }]}>{aviso.titulo}</Text>
                  </View>
                  <Text style={styles.avisoContenido}>{aviso.contenido}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Selecciona una categoría:</Text>

        {categorias.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin categorías</Text>
            <Text style={styles.emptyText}>
              No hay categorías configuradas. {'\n'}
              Ve al Panel de Admin para crear categorías.
            </Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {categorias.map((categoria) => {
              const tieneAcceso = puedeVerCategoria(categoria);

              return (
                <TouchableOpacity
                  key={`categoria-${categoria.id}`}
                  style={[
                    styles.categoryCard,
                    !tieneAcceso && styles.categoryCardDisabled,
                  ]}
                  onPress={() => handleCategoriaPress(categoria)}
                  disabled={!tieneAcceso}
                >
                  <Text style={styles.categoryName}>{categoria.nombre}</Text>
                  {categoria.totalJugadores !== undefined && (
                    <View style={styles.categoryCountBadge}>
                      <Text style={styles.categoryCountText}>👥 {categoria.totalJugadores}</Text>
                    </View>
                  )}
                  {!tieneAcceso && (
                    <Text style={styles.categoryLocked}>🔒</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Botón flotante - Solo para admin, admin_club y entrenador */}
      {(user?.role === 'super_admin' || user?.role === 'admin_club' || user?.role === 'entrenador') && (
        <>
          {console.log('✅ [HOME] Mostrando botón flotante para role:', user?.role)}
          <BotonFlotanteInscripcion
            isAdmin={user?.role === 'super_admin' || user?.role === 'admin_club'}
            onOpenFormulario={() => {
              console.log('📋 [HOME] Callback onOpenFormulario ejecutado');
              setFormularioVisible(true);
            }}
          />
        </>
      )}

      {/* Modal con formulario */}
      <Modal
        visible={formularioVisible}
        animationType="slide"
        onRequestClose={() => setFormularioVisible(false)}
      >
        <FormularioAutoinscripcion
          onSuccess={() => {
            setFormularioVisible(false);
            Alert.alert('✅ Éxito', 'Jugador inscrito correctamente');
          }}
        />
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
  header: {
    backgroundColor: '#1a472a',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#a8d5a8',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1a472a',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardIcon: { fontSize: 30, marginRight: 12 },
  roleCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a472a', marginBottom: 2 },
  roleCardSub: { fontSize: 13, color: '#555' },
  roleCardArrow: { fontSize: 24, color: '#1a472a', marginLeft: 8 },
  avisosSection: {
    gap: 8,
    marginBottom: 18,
  },
  avisoCard: {
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
  },
  avisoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  avisoIcon: { fontSize: 15 },
  avisoTitulo: { fontSize: 14, fontWeight: '700', flex: 1 },
  avisoContenido: { fontSize: 13, color: '#444', lineHeight: 18 },

  // Super admin banner (reemplaza el chip-selector horizontal)
  superAdminBanner: {
    backgroundColor: '#163d22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168,213,168,0.3)',
  },
  superAdminBannerLeft: {
    flex: 1,
  },
  superAdminBannerLabel: {
    fontSize: 11,
    color: 'rgba(168,213,168,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  superAdminBannerClub: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  superAdminBannerRight: {
    paddingLeft: 12,
  },
  superAdminBannerBtn: {
    fontSize: 13,
    color: '#a8d5a8',
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryCardDisabled: {
    opacity: 0.5,
  },
  categoryNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  categoryCountBadge: {
    marginTop: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryCountText: {
    fontSize: 12,
    color: '#1a472a',
    fontWeight: '600',
  },
  categoryLocked: {
    fontSize: 16,
    marginTop: 5,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },

  // ─── Tarjeta de horario de entrenamiento (jugador) ────────────────────────
  entrenamientoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1a472a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 3,
  },
  entrenamientoCardHoy: {
    borderLeftColor: '#ff6b35',
    backgroundColor: '#fff8f5',
  },
  entrenamientoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entrenamientoTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  entrenamientoCat: {
    fontSize: 12,
    color: '#1a472a',
    fontWeight: '600',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  diasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  diaChip: {
    borderWidth: 1.5,
    borderColor: '#1a472a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 46,
  },
  diaChipHoy: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  diaChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a472a',
  },
  diaChipTextHoy: {
    color: '#fff',
  },
  diaChipHora: {
    fontSize: 10,
    color: '#1a472a',
    marginTop: 2,
  },
  diaChipHoraHoy: {
    color: '#fff',
  },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notifLabel: {
    fontSize: 13,
    color: '#555',
  },
});

export default HomeScreen;
