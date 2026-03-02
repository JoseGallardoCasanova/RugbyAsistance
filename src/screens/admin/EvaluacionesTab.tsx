import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { User, Categoria } from '../../types/v2';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EvalDetalle {
  id: string;
  puntuacion: number;
  comentario?: string;
  createdAt: string;
  evaluador: { id: string; nombre: string; username: string };
}

interface EntrenadorEvals {
  entrenador: User;
  categoria: Categoria;
  resumen: { promedio: number; total: number; distribucion: Record<number, number> };
  evaluaciones: EvalDetalle[];
}

// ─── Stars readonly ────────────────────────────────────────────────────────────
const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 16 }) => (
  <View style={{ flexDirection: 'row' }}>
    {[1, 2, 3, 4, 5].map(n => (
      <Text key={n} style={{ fontSize: size, color: n <= value ? '#f59e0b' : '#d1d5db' }}>★</Text>
    ))}
  </View>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const EvaluacionesTab: React.FC = () => {
  const { user } = useAuth();
  const { club } = useClub();
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<EntrenadorEvals[]>([]);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [eliminando, setEliminando] = useState<string | null>(null);

  const cargar = async () => {
    if (!club) return;
    setLoading(true);
    try {
      const [todosUsuarios, todasCats] = await Promise.all([
        SupabaseServiceV2.getUsuariosByClub(club.id),
        SupabaseServiceV2.getCategoriasByClub(club.id),
      ]);

      const entrenadores = todosUsuarios.filter(u => u.role === 'entrenador');
      const resultado: EntrenadorEvals[] = [];

      for (const entrenador of entrenadores) {
        const categoriaIds = entrenador.categoriasAsignadas ?? [];
        for (const catId of categoriaIds) {
          const cat = todasCats.find(c => c.id === catId);
          if (!cat) continue;

          const [resumenData, detalleData] = await Promise.all([
            SupabaseServiceV2.getEvaluacionesResumen(entrenador.id, catId),
            SupabaseServiceV2.getEvaluacionesDetalle(entrenador.id, catId),
          ]);

          resultado.push({
            entrenador,
            categoria: cat,
            resumen: resumenData ?? { promedio: 0, total: 0, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            evaluaciones: detalleData,
          });
        }
      }

      setGrupos(resultado);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, [club]));

  const toggleExpandido = (key: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleEliminar = (evalId: string, grupoKey: string) => {
    Alert.alert(
      'Eliminar evaluación',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setEliminando(evalId);
            const ok = await SupabaseServiceV2.deleteEvaluacion(evalId);
            setEliminando(null);
            if (ok) {
              cargar();
            } else {
              Alert.alert('Error', 'No se pudo eliminar la evaluación.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a472a" />
      </View>
    );
  }

  if (grupos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={styles.emptyTitle}>Sin evaluaciones aún</Text>
        <Text style={styles.emptyText}>
          Cuando los jugadores evalúen a sus entrenadores, aparecerá aquí el detalle completo.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.body}>
      {/* Aviso a admins */}
      <View style={styles.adminNote}>
        <Text style={styles.adminNoteIcon}>🔍</Text>
        <Text style={styles.adminNoteText}>
          Solo los administradores ven quién envió cada evaluación. Los jugadores solo ven el promedio.
        </Text>
      </View>

      {grupos.map(g => {
        const key = `${g.entrenador.id}_${g.categoria.id}`;
        const abierto = expandidos.has(key);

        return (
          <View key={key} style={styles.card}>
            {/* Encabezado con color de categoría */}
            <TouchableOpacity
              style={[styles.cardHeader, { backgroundColor: g.categoria.color || '#1a472a' }]}
              onPress={() => toggleExpandido(key)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.catLabel}>{g.categoria.nombre}</Text>
                <Text style={styles.entrenadorName}>👨‍🏫 {g.entrenador.nombre}</Text>
              </View>
              <View style={styles.headerRight}>
                {g.resumen.total > 0 ? (
                  <>
                    <Text style={styles.promedio}>{g.resumen.promedio.toFixed(1)} ★</Text>
                    <Text style={styles.totalBadge}>{g.resumen.total} eval.</Text>
                  </>
                ) : (
                  <Text style={styles.sinEvals}>Sin calif.</Text>
                )}
                <Text style={styles.expandIcon}>{abierto ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>

            {/* Distribución siempre visible */}
            {g.resumen.total > 0 && (
              <View style={styles.distribucion}>
                {[5, 4, 3, 2, 1].map(n => {
                  const pct = (g.resumen.distribucion[n] / g.resumen.total) * 100;
                  return (
                    <View key={n} style={styles.distRow}>
                      <Text style={styles.distLabel}>{n}★</Text>
                      <View style={styles.distTrack}>
                        <View style={[styles.distFill, { width: `${pct}%` as any }]} />
                      </View>
                      <Text style={styles.distCount}>{g.resumen.distribucion[n]}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Lista detallada (expandible) */}
            {abierto && (
              <View style={styles.listaEvals}>
                {g.evaluaciones.length === 0 ? (
                  <Text style={styles.sinEvalsInner}>Sin evaluaciones todavía</Text>
                ) : (
                  g.evaluaciones.map(ev => (
                    <View key={ev.id} style={styles.evalRow}>
                      <View style={styles.evalLeft}>
                        <View style={styles.evalUserRow}>
                          <Text style={styles.evalNombre}>{ev.evaluador.nombre}</Text>
                          <Text style={styles.evalUsername}>@{ev.evaluador.username}</Text>
                        </View>
                        <Stars value={ev.puntuacion} size={16} />
                        {ev.comentario ? (
                          <Text style={styles.evalComentario}>"{ev.comentario}"</Text>
                        ) : null}
                        <Text style={styles.evalFecha}>
                          {new Date(ev.createdAt).toLocaleDateString('es-CL', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleEliminar(ev.id, key)}
                        disabled={eliminando === ev.id}
                      >
                        {eliminando === ev.id ? (
                          <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                          <Text style={styles.deleteIcon}>🗑️</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  // Empty
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },

  // Admin note
  adminNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef9c3',
    borderLeftWidth: 3,
    borderLeftColor: '#ca8a04',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  adminNoteIcon: { fontSize: 18 },
  adminNoteText: { flex: 1, fontSize: 13, color: '#713f12', lineHeight: 18 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 18,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  catLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.8, textTransform: 'uppercase' },
  entrenadorName: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 2 },
  promedio: { fontSize: 22, fontWeight: '900', color: '#fde68a' },
  totalBadge: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  sinEvals: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  expandIcon: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  // Distribución
  distribucion: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fafafa' },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  distLabel: { width: 24, fontSize: 12, color: '#666', textAlign: 'right', marginRight: 8 },
  distTrack: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  distFill: { height: 8, backgroundColor: '#f59e0b', borderRadius: 4 },
  distCount: { width: 24, fontSize: 12, color: '#666', marginLeft: 8 },

  // Lista evaluaciones
  listaEvals: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sinEvalsInner: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
  evalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  evalLeft: { flex: 1 },
  evalUserRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  evalNombre: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  evalUsername: { fontSize: 12, color: '#9ca3af' },
  evalComentario: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 6, lineHeight: 18 },
  evalFecha: { fontSize: 11, color: '#aaa', marginTop: 5 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  deleteIcon: { fontSize: 18 },
});

export default EvaluacionesTab;
