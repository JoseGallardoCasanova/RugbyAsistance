import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { Categoria, Jugador } from '../types/v2';

interface EstadisticasScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

const EstadisticasScreen: React.FC<EstadisticasScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { club } = useClub();
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Estados para estadísticas
  const [statsGenerales, setStatsGenerales] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<Map<string, Jugador>>(new Map());
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'semestre' | 'todo'>('mes');

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    if (categoriaSeleccionada) {
      cargarEstadisticas();
    }
  }, [categoriaSeleccionada, periodo]);

  const cargarCategorias = async () => {
    if (!club) return;
    
    try {
      setLoading(true);
      const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);
      
      // Filtrar según permisos
      let categoriasPermitidas = cats;
      if (user?.role === 'entrenador') {
        categoriasPermitidas = cats.filter(c => 
          user.categoriasAsignadas?.includes(c.id)
        );
      }
      
      const ordenadas = categoriasPermitidas.sort((a, b) => a.orden - b.orden);
      setCategorias(ordenadas);
      
      if (ordenadas.length > 0 && !categoriaSeleccionada) {
        setCategoriaSeleccionada(ordenadas[0].id);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!club || !categoriaSeleccionada) return;
    
    try {
      setLoadingStats(true);
      
      // Calcular rango de fechas según periodo
      const hoy = new Date();
      let fechaInicio: string | undefined;
      
      switch (periodo) {
        case 'mes':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
          break;
        case 'trimestre':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1).toISOString().split('T')[0];
          break;
        case 'semestre':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1).toISOString().split('T')[0];
          break;
        case 'todo':
          fechaInicio = undefined; // Sin límite
          break;
      }

      const fechaFin = hoy.toISOString().split('T')[0];
      
      // Cargar estadísticas
      const [stats, rankingData, jugadoresData] = await Promise.all([
        SupabaseServiceV2.getEstadisticasCategoria(
          club.id,
          categoriaSeleccionada,
          fechaInicio,
          fechaFin
        ),
        SupabaseServiceV2.getRankingAsistencia(
          club.id,
          categoriaSeleccionada,
          fechaInicio,
          fechaFin,
          10
        ),
        SupabaseServiceV2.getJugadoresByCategoria(categoriaSeleccionada),
      ]);
      
      // Crear mapa de jugadores
      const jugadoresMap = new Map<string, Jugador>();
      jugadoresData.forEach(j => jugadoresMap.set(j.id, j));
      
      setStatsGenerales(stats);
      setRanking(rankingData);
      setJugadores(jugadoresMap);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const getNombreJugador = (jugadorId: string): string => {
    const jugador = jugadores.get(jugadorId);
    if (!jugador) return 'Desconocido';
    return jugador.nombre;
  };

  const getColorPorcentaje = (porcentaje: number): string => {
    if (porcentaje >= 80) return '#4caf50';
    if (porcentaje >= 60) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (categorias.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📊 Estadísticas</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No hay categorías disponibles</Text>
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
        <Text style={styles.title}>📊 Estadísticas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selector de Categoría */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriaScroll}>
            {categorias.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoriaChip,
                  categoriaSeleccionada === cat.id && styles.categoriaChipActive,
                  { borderColor: cat.color },
                ]}
                onPress={() => setCategoriaSeleccionada(cat.id)}
              >
                <Text
                  style={[
                    styles.categoriaChipText,
                    categoriaSeleccionada === cat.id && { color: cat.color },
                  ]}
                >
                  {cat.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selector de Periodo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Periodo</Text>
          <View style={styles.periodoContainer}>
            {(['mes', 'trimestre', 'semestre', 'todo'] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodoButton,
                  periodo === p && styles.periodoButtonActive,
                ]}
                onPress={() => setPeriodo(p)}
              >
                <Text style={[
                  styles.periodoButtonText,
                  periodo === p && styles.periodoButtonTextActive,
                ]}>
                  {p === 'mes' && 'Mes'}
                  {p === 'trimestre' && '3 Meses'}
                  {p === 'semestre' && '6 Meses'}
                  {p === 'todo' && 'Todo'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loadingStats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a472a" />
          </View>
        ) : statsGenerales ? (
          <>
            {/* Estadísticas Generales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumen General</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{statsGenerales.totalJugadores}</Text>
                  <Text style={styles.statLabel}>Jugadores</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{statsGenerales.totalSesiones}</Text>
                  <Text style={styles.statLabel}>Sesiones</Text>
                </View>
                
                <View style={[styles.statCard, styles.statCardWide]}>
                  <Text 
                    style={[
                      styles.statValue, 
                      { color: getColorPorcentaje(statsGenerales.promedioAsistencia) }
                    ]}
                  >
                    {statsGenerales.promedioAsistencia}%
                  </Text>
                  <Text style={styles.statLabel}>Promedio de Asistencia</Text>
                </View>
              </View>
            </View>

            {/* Ranking de Asistencia */}
            {ranking.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏆 Top 10 Asistencia</Text>
                
                {ranking.map((item, index) => {
                  const nombreJugador = getNombreJugador(item.jugadorId);
                  const porcentaje = item.porcentajeAsistencia;
                  
                  return (
                    <View key={item.jugadorId} style={styles.rankingItem}>
                      <View style={styles.rankingLeft}>
                        <Text style={[
                          styles.rankingPosition,
                          index < 3 && styles.rankingPositionTop,
                        ]}>
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `${index + 1}°`}
                        </Text>
                        <View style={styles.rankingInfo}>
                          <Text style={styles.rankingNombre}>{nombreJugador}</Text>
                          <Text style={styles.rankingSesiones}>
                            {item.sesionesPresente} / {item.totalSesiones} sesiones
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.rankingRight}>
                        <Text style={[
                          styles.rankingPorcentaje,
                          { color: getColorPorcentaje(porcentaje) }
                        ]}>
                          {porcentaje}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Mejores y Peores */}
            {statsGenerales.mejorAsistencia && statsGenerales.peorAsistencia && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Destacados</Text>
                
                <View style={styles.destacadosContainer}>
                  <View style={[styles.destacadoCard, { borderLeftColor: '#4caf50' }]}>
                    <Text style={styles.destacadoEmoji}>🌟</Text>
                    <Text style={styles.destacadoLabel}>Mejor Asistencia</Text>
                    <Text style={styles.destacadoNombre}>
                      {getNombreJugador(statsGenerales.mejorAsistencia.jugadorId)}
                    </Text>
                    <Text style={[styles.destacadoPorcentaje, { color: '#4caf50' }]}>
                      {Math.round(statsGenerales.mejorAsistencia.porcentaje * 10) / 10}%
                    </Text>
                  </View>
                  
                  <View style={[styles.destacadoCard, { borderLeftColor: '#f44336' }]}>
                    <Text style={styles.destacadoEmoji}>⚠️</Text>
                    <Text style={styles.destacadoLabel}>Necesita Atención</Text>
                    <Text style={styles.destacadoNombre}>
                      {getNombreJugador(statsGenerales.peorAsistencia.jugadorId)}
                    </Text>
                    <Text style={[styles.destacadoPorcentaje, { color: '#f44336' }]}>
                      {Math.round(statsGenerales.peorAsistencia.porcentaje * 10) / 10}%
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No hay datos de asistencia para este periodo</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriaScroll: {
    marginBottom: 10,
  },
  categoriaChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  categoriaChipActive: {
    backgroundColor: '#f0f8f0',
  },
  categoriaChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  periodoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodoButtonActive: {
    backgroundColor: '#1a472a',
    borderColor: '#1a472a',
  },
  periodoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodoButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 50) / 2 - 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardWide: {
    minWidth: width - 40,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankingPosition: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 15,
    minWidth: 35,
    textAlign: 'center',
  },
  rankingPositionTop: {
    fontSize: 24,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  rankingSesiones: {
    fontSize: 13,
    color: '#999',
  },
  rankingRight: {
    alignItems: 'flex-end',
  },
  rankingPorcentaje: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  destacadosContainer: {
    gap: 15,
  },
  destacadoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  destacadoEmoji: {
    fontSize: 30,
    marginBottom: 10,
  },
  destacadoLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  destacadoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  destacadoPorcentaje: {
    fontSize: 24,
    fontWeight: 'bold',
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
  loadingContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default EstadisticasScreen;
