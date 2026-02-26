import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { Jugador, Asistencia } from '../types/v2';

interface AsistenciaScreenProps {
  navigation: any;
  route: any;
}

const AsistenciaScreen: React.FC<AsistenciaScreenProps> = ({ navigation, route }) => {
  const { categoria, categoriaNombre } = route.params; // categoria es UUID ahora
  const { user } = useAuth();
  const { club } = useClub();
  
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [asistencia, setAsistencia] = useState<{ [rut: string]: boolean }>({});
  const [enviando, setEnviando] = useState(false);
  const [yaEnviado, setYaEnviado] = useState(false);
  const [fechaRetroactiva, setFechaRetroactiva] = useState(false);

  useEffect(() => {
    cargarJugadores();
  }, [categoria]);

  // Recargar asistencia cuando cambia el modo de fecha
  useEffect(() => {
    if (jugadores.length > 0) {
      cargarAsistenciaDelDia(jugadores, getFechaActiva(fechaRetroactiva));
    }
  }, [fechaRetroactiva]);

  useFocusEffect(
    React.useCallback(() => {
      cargarJugadores();
    }, [categoria])
  );

  const getFechaLocalHoy = (): string => {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const getFechaAyer = (): string => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const año = ayer.getFullYear();
    const mes = String(ayer.getMonth() + 1).padStart(2, '0');
    const dia = String(ayer.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const getFechaActiva = (retroactiva: boolean = fechaRetroactiva): string => {
    return retroactiva ? getFechaAyer() : getFechaLocalHoy();
  };

  const getNombreDia = (fecha: string): string => {
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const [año, mes, dia] = fecha.split('-').map(Number);
    const d = new Date(año, mes - 1, dia);
    return `${dias[d.getDay()]} ${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}`;
  };

  const cargarAsistenciaDelDia = async (jugadoresActuales: Jugador[], fecha?: string) => {
    if (!club) return;
    
    try {
      const fechaUsar = fecha ?? getFechaActiva();
      console.log(`📥 [ASISTENCIA] Cargando asistencia del día ${fechaUsar} para categoría ${categoriaNombre}`);
      
      // Obtener asistencias del día desde Supabase V2
      const asistenciasData = await SupabaseServiceV2.getAsistenciasPorFecha(club.id, categoria, fechaUsar);
      
      if (asistenciasData && asistenciasData.length > 0) {
        // Mapear asistencias a formato { rut: boolean }
        const asistenciaMap: { [rut: string]: boolean } = {};
        asistenciasData.forEach(a => {
          // Buscar el jugador por ID para obtener su RUT
          const jugador = jugadoresActuales.find(j => j.id === a.jugadorId);
          if (jugador) {
            asistenciaMap[jugador.rut] = a.asistio;
          }
        });
        
        setAsistencia(asistenciaMap);
        setYaEnviado(true);
        console.log(`✅ [ASISTENCIA] Asistencia cargada: ${Object.keys(asistenciaMap).length} jugadores marcados`);
        console.log(`📋 [ASISTENCIA] Mapeados:`, asistenciaMap);
      } else {
        const label = fechaRetroactiva ? 'para ayer' : 'para hoy';
        console.log(`ℹ️ [ASISTENCIA] No hay asistencia guardada ${label}, iniciando en blanco`);
        setAsistencia({});
        setYaEnviado(false);
      }
    } catch (error) {
      console.log('⚠️ [ASISTENCIA] Error al cargar asistencia, iniciando en blanco:', error);
      setAsistencia({});
      setYaEnviado(false);
    }
  };

  const cargarJugadores = async () => {
    if (!club) {
      console.warn('⚠️ [ASISTENCIA] No hay club cargado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Obtener jugadores de la categoría (V2 usa UUID)
      const jugadoresCategoria = await SupabaseServiceV2.getJugadoresByCategoria(categoria);
      
      setJugadores(jugadoresCategoria);
      console.log(`📥 Jugadores de categoría ${categoriaNombre}:`, jugadoresCategoria.length);
      
      // ✅ Cargar asistencia DESPUÉS de tener los jugadores (pasar como parámetro para evitar problemas de estado)
      await cargarAsistenciaDelDia(jugadoresCategoria, getFechaActiva());
    } catch (error) {
      console.error('Error al cargar jugadores:', error);
      Alert.alert('Error', 'No se pudieron cargar los jugadores');
    } finally {
      setLoading(false);
    }
  };

  const toggleAsistencia = (rut: string) => {
    // Si es entrenador y ya envió, no puede modificar
    if (user?.role === 'entrenador' && yaEnviado) {
      const label = fechaRetroactiva ? 'de ayer' : 'de hoy';
      Alert.alert('Asistencia enviada', `Ya enviaste la asistencia ${label}. No puedes modificarla.`);
      return;
    }
    
    console.log('✅ Toggle asistencia:', rut, !asistencia[rut]);
    setAsistencia(prev => ({
      ...prev,
      [rut]: !prev[rut],
    }));
  };

  const marcarTodos = (valor: boolean) => {
    // Si es entrenador y ya envió, no puede modificar
    if (user?.role === 'entrenador' && yaEnviado) {
      const label = fechaRetroactiva ? 'de ayer' : 'de hoy';
      Alert.alert('Asistencia enviada', `Ya enviaste la asistencia ${label}. No puedes modificarla.`);
      return;
    }
    
    const nuevaAsistencia: { [rut: string]: boolean } = {};
    jugadores.forEach(j => {
      nuevaAsistencia[j.rut] = valor;
    });
    setAsistencia(nuevaAsistencia);
    console.log(valor ? '✅ Todos presentes' : '❌ Todos ausentes');
  };

  const handleEnviar = async () => {
    if (!user) return;

    // Verificar permisos
    if (user.role === 'ayudante') {
      Alert.alert(
        'Sin permisos',
        'Los ayudantes no pueden enviar la asistencia. Solo el entrenador o admin puede hacerlo.'
      );
      return;
    }

    const totalMarcados = Object.keys(asistencia).length;
    if (totalMarcados === 0) {
      Alert.alert('Atención', 'Debes marcar al menos un jugador');
      return;
    }

    const fechaLabel = fechaRetroactiva
      ? `AYER — ${getNombreDia(getFechaAyer())}`
      : `HOY — ${getNombreDia(getFechaLocalHoy())}`;

    Alert.alert(
      'Confirmar envío',
      `¿Enviar asistencia de ${categoriaNombre}?\n📅 ${fechaLabel}\n\n` +
      `Jugadores marcados: ${totalMarcados}/${jugadores.length}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setEnviando(true);

            const fecha = getFechaActiva();
            
            console.log('📅 Fecha activa:', fecha, fechaRetroactiva ? '(AYER)' : '(HOY)');
            console.log('🕐 Hora local completa:', new Date().toLocaleString('es-CL'));
            
            // Preparar registros de asistencia para V2
            const registros: Omit<Asistencia, 'id' | 'createdAt'>[] = jugadores.map(j => ({
              clubId: club!.id,
              categoriaId: categoria,
              jugadorId: j.id,
              fecha,
              asistio: asistencia[j.rut] || false,
              marcadoPor: user!.id, // UUID del usuario en V2
              marcadoEn: new Date().toISOString(),
              notas: undefined,
            }));

            console.log('📤 Enviando asistencia:', registros.length, 'registros');

            // Enviar a Supabase V2
            const success = await SupabaseServiceV2.guardarAsistencias(registros);

            setEnviando(false);

            if (success) {
              setYaEnviado(true); // Marcar como enviado
              Alert.alert(
                '✅ Enviado',
                'La asistencia se ha guardado correctamente',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                '❌ Error',
                'No se pudo enviar la asistencia. Verifica tu conexión.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const contarPresentes = () => {
    return Object.values(asistencia).filter(v => v).length;
  };

  const contarAusentes = () => {
    const totalMarcados = Object.keys(asistencia).length;
    const presentes = contarPresentes();
    return totalMarcados - presentes;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Categoría {categoriaNombre}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Cargando jugadores...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Categoría {categoriaNombre}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Banner fecha retroactiva */}
      {fechaRetroactiva && (
        <View style={styles.bannerRetroactivo}>
          <View style={styles.bannerRetroactivoLeft}>
            <Text style={styles.bannerRetroactivoIcon}>📅</Text>
            <View>
              <Text style={styles.bannerRetroactivoTitulo}>Marcando para AYER</Text>
              <Text style={styles.bannerRetroactivoFecha}>{getNombreDia(getFechaAyer())}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bannerRetroactivoBoton}
            onPress={() => setFechaRetroactiva(false)}
          >
            <Text style={styles.bannerRetroactivoBotonText}>Volver a hoy</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controles rápidos */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.buttonPresente]}
          onPress={() => marcarTodos(true)}
        >
          <Text style={styles.controlButtonText}>✅ Todos presentes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.buttonAusente]}
          onPress={() => marcarTodos(false)}
        >
          <Text style={styles.controlButtonText}>❌ Todos ausentes</Text>
        </TouchableOpacity>

        {!fechaRetroactiva && (
          <TouchableOpacity
            style={[styles.controlButton, styles.buttonAyer]}
            onPress={() => setFechaRetroactiva(true)}
          >
            <Text style={styles.controlButtonText}>📅 Ayer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Resumen */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{jugadores.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, styles.presente]}>{contarPresentes()}</Text>
          <Text style={styles.summaryLabel}>Presentes</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, styles.ausente]}>{contarAusentes()}</Text>
          <Text style={styles.summaryLabel}>Ausentes</Text>
        </View>
      </View>

      {/* Lista de jugadores */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {jugadores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏉</Text>
            <Text style={styles.emptyTitle}>Sin jugadores</Text>
            <Text style={styles.emptyText}>
              No hay jugadores registrados en esta categoría.
            </Text>
            <Text style={styles.emptyHint}>
              Ve al Panel de Admin para agregar jugadores.
            </Text>
          </View>
        ) : (
          jugadores.map((jugador) => {
            const presente = asistencia[jugador.rut] === true;
            const ausente = asistencia[jugador.rut] === false;
            const noMarcado = asistencia[jugador.rut] === undefined;

            return (
              <TouchableOpacity
                key={jugador.rut}
                style={[
                  styles.jugadorCard,
                  presente && styles.jugadorPresente,
                  ausente && styles.jugadorAusente,
                ]}
                onPress={() => toggleAsistencia(jugador.rut)}
              >
                <View style={styles.jugadorInfo}>
                  <View style={styles.nombreContainer}>
                    <Text style={styles.jugadorNombre}>{jugador.nombre}</Text>
                    {jugador.bloqueado && (
                      <TouchableOpacity
                        style={styles.bloqueadoIndicador}
                        onPress={() => Alert.alert('Jugador Bloqueado')}
                      >
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.jugadorRut}>RUT: {jugador.rut}</Text>
                </View>

                <View style={styles.jugadorEstado}>
                  {presente && (
                    <View style={styles.estadoBadge}>
                      <Text style={styles.estadoText}>✅ Presente</Text>
                    </View>
                  )}
                  {ausente && (
                    <View style={[styles.estadoBadge, styles.estadoBadgeAusente]}>
                      <Text style={styles.estadoText}>❌ Ausente</Text>
                    </View>
                  )}
                  {noMarcado && (
                    <Text style={styles.noMarcado}>Sin marcar</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Botón enviar */}
      {jugadores.length > 0 && (
        <View style={styles.footer}>
          {yaEnviado && user?.role === 'entrenador' ? (
            <View style={styles.enviadoInfoBox}>
              <Text style={styles.enviadoInfoText}>
                ✅ Asistencia enviada ({fechaRetroactiva ? 'ayer' : 'hoy'}). Solo puedes visualizarla, no modificarla.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.enviarButton, enviando && styles.enviarButtonDisabled]}
              onPress={handleEnviar}
              disabled={enviando}
            >
              {enviando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.enviarButtonText}>
                  📤 {yaEnviado ? 'Actualizar' : 'Enviar'} asistencia ({Object.keys(asistencia).length}/{jugadores.length})
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a472a',
  },
  backButton: {
    width: 40,
  },
  backIcon: {
    fontSize: 30,
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  controlButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPresente: {
    backgroundColor: '#4CAF50',
  },
  buttonAusente: {
    backgroundColor: '#f44336',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  summary: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  presente: {
    color: '#4CAF50',
  },
  ausente: {
    color: '#f44336',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 10,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  jugadorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  jugadorPresente: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
  },
  jugadorAusente: {
    borderColor: '#f44336',
    backgroundColor: '#fef1f0',
  },
  jugadorInfo: {
    flex: 1,
  },
  nombreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jugadorNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  jugadorRut: {
    fontSize: 12,
    color: '#666',
  },
  bloqueadoIndicador: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f44336',
    marginLeft: 8,
  },
  jugadorEstado: {
    marginLeft: 10,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  estadoBadgeAusente: {
    backgroundColor: '#f44336',
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noMarcado: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  enviadoInfoBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  enviadoInfoText: {
    color: '#2e7d32',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  enviarButton: {
    backgroundColor: '#1a472a',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  enviarButtonDisabled: {
    opacity: 0.6,
  },
  enviarButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerRetroactivo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderBottomWidth: 2,
    borderBottomColor: '#f57c00',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  bannerRetroactivoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerRetroactivoIcon: {
    fontSize: 28,
  },
  bannerRetroactivoTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e65100',
  },
  bannerRetroactivoFecha: {
    fontSize: 13,
    color: '#bf360c',
  },
  bannerRetroactivoBoton: {
    backgroundColor: '#f57c00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerRetroactivoBotonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  buttonAyer: {
    backgroundColor: '#f57c00',
    flex: 0,
    paddingHorizontal: 14,
  },
});

export default AsistenciaScreen;
