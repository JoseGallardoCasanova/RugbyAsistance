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
import { useAuth } from '../context/AuthContext';
import SupabaseService from '../services/SupabaseService';
import { Jugador } from '../types';

interface AsistenciaScreenProps {
  navigation: any;
  route: any;
}

const AsistenciaScreen: React.FC<AsistenciaScreenProps> = ({ navigation, route }) => {
  const { categoria } = route.params;
  const { user } = useAuth();
  
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [asistencia, setAsistencia] = useState<{ [rut: string]: boolean }>({});
  const [enviando, setEnviando] = useState(false);
  const [yaEnviado, setYaEnviado] = useState(false); // Nuevo estado

  useEffect(() => {
    cargarJugadores();
  }, [categoria]);

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

  const cargarAsistenciaDelDia = async () => {
    try {
      const fecha = getFechaLocalHoy();
      console.log(`📥 [ASISTENCIA] Cargando asistencia del día ${fecha} para categoría ${categoria}`);
      
      const data = await SupabaseService.obtenerAsistenciaDelDia(categoria, fecha);
      
      if (data && Object.keys(data).length > 0) {
        setAsistencia(data);
        setYaEnviado(true); // Marcar que ya hay asistencia enviada
        console.log(`✅ [ASISTENCIA] Asistencia cargada: ${Object.keys(data).length} jugadores marcados`);
        console.log('📋 [ASISTENCIA] Datos:', data);
      } else {
        console.log('ℹ️ [ASISTENCIA] No hay asistencia guardada para hoy, iniciando en blanco');
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
    try {
      setLoading(true);
      const todosJugadores = await SupabaseService.obtenerJugadores();
      
      // Filtrar por categoría
      const jugadoresCategoria = todosJugadores.filter(j => 
        j.categoria === categoria && j.activo !== false
      );
      
      setJugadores(jugadoresCategoria);
      console.log(`📥 Jugadores de categoría ${categoria}:`, jugadoresCategoria.length);
      
      // ✅ Cargar asistencia DESPUÉS de tener los jugadores
      await cargarAsistenciaDelDia();
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
      Alert.alert('Asistencia enviada', 'Ya enviaste la asistencia de hoy. No puedes modificarla.');
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
      Alert.alert('Asistencia enviada', 'Ya enviaste la asistencia de hoy. No puedes modificarla.');
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

    Alert.alert(
      'Confirmar envío',
      `¿Enviar asistencia de Categoría ${categoria}?\n\n` +
      `Jugadores marcados: ${totalMarcados}/${jugadores.length}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setEnviando(true);

            const fecha = getFechaLocalHoy();
            
            console.log('📅 Fecha local:', fecha);
            console.log('🕐 Hora local completa:', new Date().toLocaleString('es-CL'));
            
            // Preparar registros de asistencia para Supabase
            const registros = jugadores.map(j => ({
              categoria,
              fecha,
              rut_jugador: j.rut,
              asistio: asistencia[j.rut] || false,
              marcado_por: user.nombre,
            }));

            console.log('📤 Enviando asistencia a Supabase:', registros.length, 'registros');

            // Enviar a Supabase
            const success = await SupabaseService.guardarAsistencia(registros);

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
          <Text style={styles.title}>Categoría {categoria}</Text>
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
        <Text style={styles.title}>Categoría {categoria}</Text>
        <View style={{ width: 40 }} />
      </View>

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
                      <View style={styles.bloqueadoIndicador}>
                        <Text style={styles.bloqueadoIcon}>\u26a0\ufe0f</Text>
                      </View>
                    )}
                  </View>
                  {jugador.bloqueado && (
                    <Text style={styles.bloqueadoTexto}>Jugador bloqueado</Text>
                  )}
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
                ✅ Asistencia enviada hoy. Solo puedes visualizarla, no modificarla.
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloqueadoIcon: {
    fontSize: 14,
    color: '#fff',
  },
  bloqueadoTexto: {
    fontSize: 11,
    color: '#f44336',
    fontStyle: 'italic',
    marginTop: 2,
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
});

export default AsistenciaScreen;
