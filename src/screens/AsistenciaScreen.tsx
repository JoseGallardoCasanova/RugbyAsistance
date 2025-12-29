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
import { useAuth } from '../context/AuthContext';
import DatabaseService from '../services/DatabaseService';
import GoogleSheetsService from '../services/GoogleSheetsService';
import { AsistenciaCategoria, Jugador } from '../types';

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

  useEffect(() => {
    cargarJugadores();
  }, [categoria]);

  const cargarJugadores = async () => {
    try {
      setLoading(true);
      const todosJugadores = await DatabaseService.obtenerJugadores();
      
      // Filtrar por categoría
      const jugadoresCategoria = todosJugadores.filter(j => 
        j.categoria === categoria && j.activo !== false
      );
      
      setJugadores(jugadoresCategoria);
      console.log(`📥 Jugadores de categoría ${categoria}:`, jugadoresCategoria.length);
    } catch (error) {
      console.error('Error al cargar jugadores:', error);
      Alert.alert('Error', 'No se pudieron cargar los jugadores');
    } finally {
      setLoading(false);
    }
  };

  const toggleAsistencia = (rut: string) => {
    console.log('✅ Toggle asistencia:', rut, !asistencia[rut]);
    setAsistencia(prev => ({
      ...prev,
      [rut]: !prev[rut],
    }));
  };

  const marcarTodos = (valor: boolean) => {
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

            // Preparar datos
            const fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const asistenciaData: AsistenciaCategoria = {
              categoria,
              fecha,
              jugadores: jugadores.map(j => ({
                rut: j.rut,
                asistio: asistencia[j.rut] || false,
              })),
              marcadoPor: user.nombre,
              enviado: true,
            };

            console.log('📤 Enviando asistencia:', asistenciaData);

            // Enviar a Google Sheets
            const success = await GoogleSheetsService.enviarAsistencia(asistenciaData);

            setEnviando(false);

            if (success) {
              Alert.alert(
                '✅ Enviado',
                'La asistencia se ha guardado en Google Sheets',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Limpiar asistencia
                      setAsistencia({});
                      navigation.goBack();
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                '❌ Error',
                'No se pudo enviar la asistencia. Verifica tu conexión y la configuración de Google Sheets.',
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
                  <Text style={styles.jugadorNombre}>{jugador.nombre}</Text>
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
          <TouchableOpacity
            style={[styles.enviarButton, enviando && styles.enviarButtonDisabled]}
            onPress={handleEnviar}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.enviarButtonText}>
                📤 Enviar asistencia ({Object.keys(asistencia).length}/{jugadores.length})
              </Text>
            )}
          </TouchableOpacity>
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
