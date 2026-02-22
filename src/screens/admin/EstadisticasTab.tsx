import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { Categoria, Jugador } from '../../types/v2';

const { width } = Dimensions.get('window');

const EstadisticasTab: React.FC = () => {
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
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </View>
    );
  }

  if (categorias.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No hay categorías disponibles</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                    categoriaSeleccionada === cat.id && styles.categoriaChipTextActive,
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
            {['mes', 'trimestre', 'semestre', 'todo'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodoButton,
                  periodo === p && styles.periodoButtonActive,
                ]}
                onPress={() => setPeriodo(p as any)}
              >
                <Text
                  style={[
                    styles.periodoButtonText,
                    periodo === p && styles.periodoButtonTextActive,
                  ]}
                >
                  {p === 'mes' && 'Mes'}
                  {p === 'trimestre' && 'Trimestre'}
                  {p === 'semestre' && 'Semestre'}
                  {p === 'todo' && 'Todo'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loadingStats ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1a472a" />
          </View>
        ) : (
          <>
            {/* Estadísticas Generales */}
            {statsGenerales && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resumen</Text>
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
                        { color: getColorPorcentaje(statsGenerales.promedioAsistencia) },
                      ]}
                    >
                      {statsGenerales.promedioAsistencia.toFixed(1)}%
                    </Text>
                    <Text style={styles.statLabel}>Promedio de Asistencia</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Ranking Top 10 */}
            {ranking.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏆 Top 10 Asistencia</Text>
                {ranking.map((item, index) => {
                  const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                  return (
                    <View key={item.jugadorId} style={styles.rankingItem}>
                      <Text style={styles.rankingEmoji}>{emoji}</Text>
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingNombre}>
                          {getNombreJugador(item.jugadorId)}
                        </Text>
                        <Text style={styles.rankingSesiones}>
                          {item.sesionesPresente}/{item.totalSesiones} sesiones
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.rankingPorcentaje,
                          { color: getColorPorcentaje(item.porcentajeAsistencia) },
                        ]}
                      >
                        {item.porcentajeAsistencia.toFixed(1)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Destacados */}
            {statsGenerales?.mejorAsistencia && statsGenerales?.peorAsistencia && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Destacados</Text>
                <View style={styles.destacadosGrid}>
                  <View style={[styles.destacadoCard, { borderLeftColor: '#4caf50' }]}>
                    <Text style={styles.destacadoIcon}>🌟</Text>
                    <Text style={styles.destacadoLabel}>Mejor Asistencia</Text>
                    <Text style={styles.destacadoNombre}>
                      {getNombreJugador(statsGenerales.mejorAsistencia.jugadorId)}
                    </Text>
                    <Text style={[styles.destacadoPorcentaje, { color: '#4caf50' }]}>
                      {statsGenerales.mejorAsistencia.porcentaje.toFixed(1)}%
                    </Text>
                  </View>

                  <View style={[styles.destacadoCard, { borderLeftColor: '#f44336' }]}>
                    <Text style={styles.destacadoIcon}>⚠️</Text>
                    <Text style={styles.destacadoLabel}>Requiere Atención</Text>
                    <Text style={styles.destacadoNombre}>
                      {getNombreJugador(statsGenerales.peorAsistencia.jugadorId)}
                    </Text>
                    <Text style={[styles.destacadoPorcentaje, { color: '#f44336' }]}>
                      {statsGenerales.peorAsistencia.porcentaje.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriaScroll: {
    flexDirection: 'row',
  },
  categoriaChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  categoriaChipActive: {
    backgroundColor: '#1a472a',
    borderColor: '#1a472a',
  },
  categoriaChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoriaChipTextActive: {
    color: '#fff',
  },
  periodoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  periodoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: (width - 50) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardWide: {
    width: width - 40,
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
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rankingEmoji: {
    fontSize: 24,
    marginRight: 15,
    minWidth: 35,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  rankingSesiones: {
    fontSize: 13,
    color: '#999',
  },
  rankingPorcentaje: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  destacadosGrid: {
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
  destacadoIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  destacadoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  destacadoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  destacadoPorcentaje: {
    fontSize: 24,
    fontWeight: 'bold',
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

export default EstadisticasTab;
