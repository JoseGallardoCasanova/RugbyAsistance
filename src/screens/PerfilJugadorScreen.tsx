import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { Jugador, Asistencia, Categoria } from '../types/v2';

interface Props {
  navigation: any;
  route?: { params?: { jugadorId?: string } };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function PerfilJugadorScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { club } = useClub();
  const jugadorIdParam = route?.params?.jugadorId;

  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [stats, setStats] = useState({
    totalSesiones: 0,
    sesionesPresente: 0,
    porcentajeAsistencia: 0,
    rachaActual: 0,
    mejorRacha: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [seccionExpandida, setSeccionExpandida] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [jugadorIdParam, user?.id])
  );

  const cargar = async () => {
    if (!club || !user) return;
    setCargando(true);
    try {
      let j: Jugador | null = null;

      if (jugadorIdParam) {
        j = await SupabaseServiceV2.getJugadorById(jugadorIdParam);
      } else {
        j = await SupabaseServiceV2.getJugadorByUsuarioId(user.id);
      }

      if (!j) {
        setCargando(false);
        return;
      }
      setJugador(j);

      // Cargar categoría
      const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);
      const cat = cats.find(c => c.id === j!.categoriaId) ?? null;
      setCategoria(cat);

      // Cargar estadísticas (últimos 3 meses)
      const hoy = new Date();
      const hace3m = new Date(hoy);
      hace3m.setMonth(hace3m.getMonth() - 3);
      const fechaStr = (d: Date) => d.toISOString().split('T')[0];

      const [statsData, asistData] = await Promise.all([
        SupabaseServiceV2.getEstadisticasJugador(club.id, j.id, fechaStr(hace3m), fechaStr(hoy)),
        SupabaseServiceV2.getAsistenciasByJugador(club.id, j.id, fechaStr(hace3m), fechaStr(hoy)),
      ]);

      setStats(statsData);
      setAsistencias(asistData || []);
    } finally {
      setCargando(false);
    }
  };

  const toggleSeccion = (s: string) =>
    setSeccionExpandida(prev => (prev === s ? null : s));

  const pct = stats.porcentajeAsistencia;
  const colorPct = pct >= 75 ? '#2e7d32' : pct >= 50 ? '#f9a825' : '#c62828';

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil Jugador</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!jugador) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil Jugador</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.noDataIcon}>🏉</Text>
          <Text style={styles.noDataTitle}>Sin ficha de jugador</Text>
          <Text style={styles.noDataSub}>
            Tu cuenta no tiene un jugador vinculado.{'\n'}
            Contacta al administrador del club.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil Jugador</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Avatar y nombre */}
        <View style={styles.avatarCard}>
          <View style={[styles.avatar, { backgroundColor: categoria?.color ?? '#1a472a' }]}>
            <Text style={styles.avatarText}>
              {jugador.nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.nombre}>{jugador.nombre}</Text>
          <Text style={styles.rut}>{jugador.rut}</Text>
          {categoria && (
            <View style={[styles.catBadge, { backgroundColor: categoria.color + '33', borderColor: categoria.color }]}>
              <Text style={[styles.catBadgeText, { color: categoria.color }]}>
                {categoria.icono ?? '🏉'} {categoria.nombre}
              </Text>
            </View>
          )}
          {jugador.numero && (
            <Text style={styles.numero}>N.° {jugador.numero}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colorPct }]}>{pct}%</Text>
            <Text style={styles.statLabel}>Asistencia{'\n'}(3 meses)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.sesionesPresente}</Text>
            <Text style={styles.statLabel}>Sesiones{'\n'}presentes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#1a7a4a' }]}>{stats.rachaActual}</Text>
            <Text style={styles.statLabel}>Racha{'\n'}actual</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.mejorRacha}</Text>
            <Text style={styles.statLabel}>Mejor{'\n'}racha</Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Porcentaje de asistencia</Text>
            <Text style={[styles.progressPct, { color: colorPct }]}>{pct}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: colorPct }]} />
          </View>
          <Text style={styles.progressMeta}>
            {stats.sesionesPresente} presentes · {stats.totalSesiones - stats.sesionesPresente} ausentes · {stats.totalSesiones} sesiones totales
          </Text>
        </View>

        {/* Historial reciente */}
        <TouchableOpacity style={styles.seccionHeader} onPress={() => toggleSeccion('historial')}>
          <Text style={styles.seccionTitulo}>📅 Historial reciente</Text>
          <Text style={styles.seccionChevron}>{seccionExpandida === 'historial' ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {seccionExpandida === 'historial' && (
          <View style={styles.seccionBody}>
            {asistencias.length === 0 ? (
              <Text style={styles.emptyText}>Sin registros en los últimos 3 meses</Text>
            ) : (
              asistencias.slice(0, 30).map(a => {
                const d = new Date(a.fecha + 'T12:00:00');
                return (
                  <View key={a.id} style={styles.asistRow}>
                    <View style={[styles.asistDot, { backgroundColor: a.asistio ? '#2e7d32' : '#c62828' }]} />
                    <Text style={styles.asistFecha}>
                      {d.getDate()} {MESES[d.getMonth()]} {d.getFullYear()}
                    </Text>
                    <Text style={[styles.asistEstado, { color: a.asistio ? '#2e7d32' : '#c62828' }]}>
                      {a.asistio ? '✓ Presente' : '✗ Ausente'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Datos personales */}
        <TouchableOpacity style={styles.seccionHeader} onPress={() => toggleSeccion('personales')}>
          <Text style={styles.seccionTitulo}>👤 Datos personales</Text>
          <Text style={styles.seccionChevron}>{seccionExpandida === 'personales' ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {seccionExpandida === 'personales' && (
          <View style={styles.seccionBody}>
            {renderCampo('Fecha de nacimiento', jugador.fechaNacimiento)}
            {renderCampo('Email', jugador.email)}
            {renderCampo('Teléfono', jugador.telefono)}
            {renderCampo('Actividad', jugador.actividad)}
          </View>
        )}

        {/* Contacto de emergencia */}
        <TouchableOpacity style={styles.seccionHeader} onPress={() => toggleSeccion('emergencia')}>
          <Text style={styles.seccionTitulo}>🚨 Emergencia</Text>
          <Text style={styles.seccionChevron}>{seccionExpandida === 'emergencia' ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {seccionExpandida === 'emergencia' && (
          <View style={styles.seccionBody}>
            {renderCampo('Contacto', jugador.contactoEmergencia)}
            {renderCampo('Teléfono', jugador.telEmergencia)}
            {renderCampo('Relación', jugador.relacionEmergencia)}
          </View>
        )}

        {/* Salud */}
        <TouchableOpacity style={styles.seccionHeader} onPress={() => toggleSeccion('salud')}>
          <Text style={styles.seccionTitulo}>🏥 Salud</Text>
          <Text style={styles.seccionChevron}>{seccionExpandida === 'salud' ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {seccionExpandida === 'salud' && (
          <View style={styles.seccionBody}>
            {renderCampo('Sistema de salud', jugador.sistemaSalud)}
            {renderCampo('Seguro complementario', jugador.seguroComplementario)}
            {renderCampo('Grupo sanguíneo', jugador.grupoSanguineo)}
            {renderCampo('Enfermedades', jugador.enfermedades)}
            {renderCampo('Alergias', jugador.alergias)}
            {renderCampo('Medicamentos', jugador.medicamentos)}
            {renderCampo('Lesiones previas', jugador.lesiones)}
          </View>
        )}

        {/* Tutor */}
        {(jugador.nombreTutor || jugador.rutTutor) && (
          <>
            <TouchableOpacity style={styles.seccionHeader} onPress={() => toggleSeccion('tutor')}>
              <Text style={styles.seccionTitulo}>👨‍👩‍👧 Tutor / Apoderado</Text>
              <Text style={styles.seccionChevron}>{seccionExpandida === 'tutor' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {seccionExpandida === 'tutor' && (
              <View style={styles.seccionBody}>
                {renderCampo('Nombre', jugador.nombreTutor)}
                {renderCampo('RUT', jugador.rutTutor)}
                {renderCampo('Teléfono', jugador.telTutor)}
                {renderCampo('Email', jugador.emailTutor)}
              </View>
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const renderCampo = (label: string, value?: string | null) => {
  if (!value) return null;
  return (
    <View key={label} style={styles.campoRow}>
      <Text style={styles.campoLabel}>{label}</Text>
      <Text style={styles.campoVal}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  header: {
    backgroundColor: '#1a472a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
  },
  backBtn: { width: 40 },
  backText: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  scroll: { padding: 15, paddingBottom: 40 },

  avatarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 3 },
  rut: { fontSize: 14, color: '#888', marginBottom: 8 },
  catBadge: {
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 5, marginBottom: 6,
  },
  catBadgeText: { fontSize: 13, fontWeight: '600' },
  numero: { fontSize: 13, color: '#555', marginTop: 2 },

  statsRow: {
    backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row',
    marginBottom: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 4 },

  progressCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  progressPct: { fontSize: 14, fontWeight: 'bold' },
  progressBg: {
    height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressMeta: { fontSize: 12, color: '#888', textAlign: 'center' },

  seccionHeader: {
    backgroundColor: '#fff', borderRadius: 12, padding: 15,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  seccionTitulo: { fontSize: 15, fontWeight: '600', color: '#222' },
  seccionChevron: { fontSize: 12, color: '#888' },
  seccionBody: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 8,
  },
  emptyText: { color: '#aaa', textAlign: 'center', paddingVertical: 12 },

  asistRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  asistDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  asistFecha: { flex: 1, fontSize: 14, color: '#333' },
  asistEstado: { fontSize: 13, fontWeight: '600' },

  campoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  campoLabel: { fontSize: 13, color: '#888', flex: 1 },
  campoVal: { fontSize: 13, color: '#222', flex: 1.5, textAlign: 'right' },

  noDataIcon: { fontSize: 50 },
  noDataTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  noDataSub: { fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 30, marginTop: 6 },
});
