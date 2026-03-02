import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { User, Categoria } from '../types/v2';

interface EvaluacionesScreenProps {
  navigation: any;
}

interface EntrenadorConCategoria {
  entrenador: User;
  categoria: Categoria;
  yaEvalue: boolean;
  miEvaluacionId?: string;
  miPuntuacion?: number;
  miComentarioPrevio?: string;
  resumen?: { promedio: number; total: number };
}

// ─── Componente de estrellas ─────────────────────────────────────────────────
const Stars: React.FC<{
  value: number;
  max?: number;
  onPress?: (v: number) => void;
  size?: number;
  readonly?: boolean;
}> = ({ value, max = 5, onPress, size = 36, readonly = false }) => (
  <View style={{ flexDirection: 'row', gap: 4 }}>
    {Array.from({ length: max }, (_, i) => i + 1).map(n => (
      <TouchableOpacity
        key={n}
        disabled={readonly}
        onPress={() => onPress?.(n)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: size, color: n <= value ? '#f59e0b' : '#d1d5db' }}>
          ★
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Barra de distribución mini ──────────────────────────────────────────────
const DistribucionBarra: React.FC<{ label: string; valor: number; total: number }> = ({
  label,
  valor,
  total,
}) => {
  const pct = total > 0 ? (valor / total) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}★</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={barStyles.count}>{valor}</Text>
    </View>
  );
};

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { width: 22, fontSize: 12, color: '#666', textAlign: 'right', marginRight: 6 },
  track: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#f59e0b', borderRadius: 4 },
  count: { width: 22, fontSize: 12, color: '#666', marginLeft: 6 },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────
const EvaluacionesScreen: React.FC<EvaluacionesScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { club } = useClub();

  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<EntrenadorConCategoria[]>([]);

  // Estado de formulario activo
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = async () => {
    if (!user || !club) return;
    setLoading(true);
    try {
      // 1. Obtener todos los usuarios del club para encontrar entrenadores
      const todosUsuarios = await SupabaseServiceV2.getUsuariosByClub(club.id);
      const entrenadores = todosUsuarios.filter(u => u.role === 'entrenador');

      // 2. Obtener todas las categorías del club
      const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);

      // 3. Determinar qué categorías son relevantes para este usuario
      let categoriaIds: string[] = [];

      if (user.role === 'jugador') {
        // Jugador: buscar su registro en la tabla jugadores para obtener categoriaId
        const jugador = await SupabaseServiceV2.getJugadorByUsuarioId(user.id);
        if (jugador?.categoriaId) categoriaIds = [jugador.categoriaId];
      } else if (user.role === 'apoderado') {
        // Apoderado: categorías de sus hijos
        const relaciones = await SupabaseServiceV2.getRelacionesByApoderado(user.id);
        const jugHijos = relaciones.map(r => r.jugador);
        categoriaIds = [...new Set(jugHijos.map(j => j.categoriaId).filter(Boolean))];
      }

      if (categoriaIds.length === 0) {
        setTargets([]);
        setLoading(false);
        return;
      }

      // 4. Para cada categoría, encontrar el entrenador asignado
      const resultado: EntrenadorConCategoria[] = [];

      for (const catId of categoriaIds) {
        const cat = cats.find(c => c.id === catId);
        if (!cat) continue;

        const entrenador = entrenadores.find(e => e.categoriasAsignadas?.includes(catId));
        if (!entrenador) continue;

        // 5. ¿Ya evalué a este entrenador en esta categoría?
        const miEval = await SupabaseServiceV2.getMyEvaluacion(user.id, entrenador.id, catId);

        // 6. Resumen agregado (anónimo)
        const resumen = await SupabaseServiceV2.getEvaluacionesResumen(entrenador.id, catId);

        resultado.push({
          entrenador,
          categoria: cat,
          yaEvalue: !!miEval,
          miEvaluacionId: miEval?.id,
          miPuntuacion: miEval?.puntuacion,
          miComentarioPrevio: miEval?.comentario,
          resumen: resumen
            ? { promedio: resumen.promedio, total: resumen.total }
            : undefined,
        });
      }

      setTargets(resultado);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, [user, club]));

  const abrirFormulario = (idx: number) => {
    const t = targets[idx];
    setPuntuacion(t.miPuntuacion ?? 0);
    setComentario(t.miComentarioPrevio ?? '');
    setEditandoIdx(idx);
  };

  const cerrarFormulario = () => {
    setEditandoIdx(null);
    setPuntuacion(0);
    setComentario('');
  };

  const handleEnviar = async () => {
    if (editandoIdx === null || !user || !club) return;
    if (puntuacion === 0) {
      Alert.alert('Selecciona una calificación', 'Por favor elige entre 1 y 5 estrellas antes de enviar.');
      return;
    }

    const t = targets[editandoIdx];
    setEnviando(true);
    try {
      const ok = await SupabaseServiceV2.crearEvaluacion({
        clubId: club.id,
        categoriaId: t.categoria.id,
        evaluadorId: user.id,
        evaluadoId: t.entrenador.id,
        puntuacion,
        comentario: comentario.trim() || undefined,
      });

      if (ok) {
        cerrarFormulario();
        Alert.alert('¡Gracias!', 'Tu evaluación fue enviada de forma anónima.');
        cargar();
      } else {
        Alert.alert('Error', 'No se pudo enviar la evaluación. Intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  const promedioLabel = (p: number) => {
    if (p === 0) return 'Sin calificaciones aún';
    return `${p.toFixed(1)} / 5`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Evaluar Entrenador</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
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
        <Text style={styles.title}>Evaluar Entrenador</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.anonimoNote}>
          🔒 Tus evaluaciones son completamente <Text style={{ fontWeight: 'bold' }}>anónimas</Text>.
          La dirección del club solo verá los promedios generales.
        </Text>

        {targets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏉</Text>
            <Text style={styles.emptyTitle}>Sin entrenador asignado</Text>
            <Text style={styles.emptyText}>
              No hay un entrenador asignado a tu categoría todavía.
              Cuando se asigne uno, podrás evaluarlo aquí.
            </Text>
          </View>
        ) : (
          targets.map((t, idx) => (
            <View key={`${t.entrenador.id}_${t.categoria.id}`} style={styles.card}>
              {/* Encabezado de la tarjeta */}
              <View style={[styles.cardHeader, { backgroundColor: t.categoria.color || '#1a472a' }]}>
                <Text style={styles.cardCategoria}>{t.categoria.nombre}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardEntrenador}>👨‍🏫 {t.entrenador.nombre}</Text>

                {/* Resumen agregado (público / anónimo) */}
                {t.resumen && t.resumen.total > 0 ? (
                  <View style={styles.resumen}>
                    <Stars value={Math.round(t.resumen.promedio)} size={20} readonly />
                    <Text style={styles.resumenText}>
                      {promedioLabel(t.resumen.promedio)} · {t.resumen.total}{' '}
                      {t.resumen.total === 1 ? 'evaluación' : 'evaluaciones'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.sinEvals}>Sé el primero en evaluar</Text>
                )}

                {/* Formulario inline o estado ya-evaluado */}
                {editandoIdx === idx ? (
                  <View style={styles.form}>
                    <Text style={styles.formLabel}>Tu calificación</Text>
                    <Stars value={puntuacion} onPress={setPuntuacion} size={40} />

                    <Text style={[styles.formLabel, { marginTop: 16 }]}>
                      Comentario <Text style={styles.opcional}>(opcional)</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={comentario}
                      onChangeText={setComentario}
                      placeholder="¿Qué mejorarías? ¿Qué destacas?"
                      multiline
                      numberOfLines={3}
                      maxLength={400}
                    />
                    <Text style={styles.charCount}>{comentario.length}/400</Text>

                    <View style={styles.formBtns}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={cerrarFormulario} disabled={enviando}>
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.submitBtn} onPress={handleEnviar} disabled={enviando || puntuacion === 0}>
                        {enviando ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.submitBtnText}>Enviar ✓</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : t.yaEvalue ? (
                  <View style={styles.yaEvaluado}>
                    <Stars value={t.miPuntuacion ?? 0} size={28} readonly />
                    <Text style={styles.yaEvaluadoText}>Ya enviaste tu evaluación 🎉</Text>
                    {t.miComentarioPrevio ? (
                      <Text style={styles.comentarioPrevio}>"{t.miComentarioPrevio}"</Text>
                    ) : null}
                  </View>
                ) : (
                  <TouchableOpacity style={styles.evaluarBtn} onPress={() => abrirFormulario(idx)}>
                    <Text style={styles.evaluarBtnText}>⭐ Calificar entrenador</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a472a',
  },
  backButton: { width: 40 },
  backIcon: { fontSize: 30, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, paddingBottom: 40 },
  anonimoNote: {
    fontSize: 13,
    color: '#555',
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 3,
    borderLeftColor: '#1a472a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 19,
  },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardCategoria: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  cardBody: { padding: 18 },
  cardEntrenador: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },

  // Resumen
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  resumenText: { fontSize: 13, color: '#666' },
  sinEvals: { fontSize: 13, color: '#999', fontStyle: 'italic', marginBottom: 16 },

  // Ya evaluado
  yaEvaluado: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 4,
  },
  yaEvaluadoText: { fontSize: 13, color: '#16a34a', marginTop: 8, fontWeight: '600' },
  comentarioPrevio: { fontSize: 13, color: '#555', fontStyle: 'italic', marginTop: 6 },

  // Botón evaluar
  evaluarBtn: {
    backgroundColor: '#1a472a',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  evaluarBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Formulario inline
  form: { marginTop: 8 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  opcional: { fontWeight: '400', color: '#999' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  charCount: { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 4 },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600', fontSize: 14 },
  submitBtn: {
    flex: 2,
    backgroundColor: '#1a472a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default EvaluacionesScreen;
