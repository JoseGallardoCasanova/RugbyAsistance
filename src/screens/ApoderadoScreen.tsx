import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { Jugador, RelacionApoderado, Categoria } from '../types/v2';
import { formatearRUT } from '../utils/rutUtils';

interface HijoInfo {
  relacion: RelacionApoderado;
  jugador: Jugador;
  categoria?: Categoria;
  stats: {
    porcentajeAsistencia: number;
    sesionesPresente: number;
    totalSesiones: number;
    rachaActual: number;
  };
}

interface Props {
  navigation: any;
}

const TIPOS_RELACION: { key: RelacionApoderado['tipoRelacion']; label: string }[] = [
  { key: 'padre',    label: 'Padre' },
  { key: 'madre',    label: 'Madre' },
  { key: 'tutor',    label: 'Tutor/a legal' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'otro',     label: 'Otro' },
];

export default function ApoderadoScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { club } = useClub();

  const [hijos, setHijos] = useState<HijoInfo[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal vincular
  const [modalVisible, setModalVisible] = useState(false);
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [tipoRelacion, setTipoRelacion] = useState<RelacionApoderado['tipoRelacion']>('padre');
  const [vinculando, setVinculando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [user?.id])
  );

  const cargar = async () => {
    if (!user || !club) return;
    setCargando(true);
    try {
      const relaciones = await SupabaseServiceV2.getRelacionesByApoderado(user.id);
      const categorias = await SupabaseServiceV2.getCategoriasByClub(club.id);

      const hoy = new Date();
      const hace3m = new Date(hoy);
      hace3m.setMonth(hace3m.getMonth() - 3);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const hijosData: HijoInfo[] = await Promise.all(
        relaciones.map(async ({ relacion, jugador }) => {
          const cat = categorias.find(c => c.id === jugador.categoriaId);
          const stats = await SupabaseServiceV2.getEstadisticasJugador(
            club.id, jugador.id, fmt(hace3m), fmt(hoy)
          );
          return { relacion, jugador, categoria: cat, stats };
        })
      );

      setHijos(hijosData);
    } finally {
      setCargando(false);
    }
  };

  const handleVincular = async () => {
    if (!user || !club) return;
    if (!rutBusqueda.trim()) {
      Alert.alert('Error', 'Ingresa el RUT del jugador');
      return;
    }

    setVinculando(true);
    try {
      const jugador = await SupabaseServiceV2.findJugadorByRUT(club.id, rutBusqueda.trim());
      if (!jugador) {
        Alert.alert('No encontrado', 'No se encontró ningún jugador con ese RUT en este club.');
        return;
      }

      // Verificar que no esté ya vinculado
      const yaVinculado = hijos.some(h => h.jugador.id === jugador.id);
      if (yaVinculado) {
        Alert.alert('Ya vinculado', 'Este jugador ya está en tu lista.');
        return;
      }

      Alert.alert(
        'Confirmar vínculo',
        `¿Vincularte como ${TIPOS_RELACION.find(t => t.key === tipoRelacion)?.label} de ${jugador.nombre}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Vincular',
            onPress: async () => {
              const ok = await SupabaseServiceV2.vincularApoderadoJugador(
                club.id, user.id, jugador.id, tipoRelacion
              );
              if (ok) {
                setModalVisible(false);
                setRutBusqueda('');
                Alert.alert('✅ Vinculado', `Ahora puedes ver la información de ${jugador.nombre}`);
                cargar();
              } else {
                Alert.alert('Error', 'No se pudo crear el vínculo. Intenta nuevamente.');
              }
            },
          },
        ]
      );
    } finally {
      setVinculando(false);
    }
  };

  const handleDesvincular = (hijo: HijoInfo) => {
    if (!user) return;
    Alert.alert(
      'Desvincular',
      `¿Eliminar el vínculo con ${hijo.jugador.nombre}? Ya no verás su información.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular', style: 'destructive',
          onPress: async () => {
            await SupabaseServiceV2.desvincularApoderadoJugador(user.id, hijo.jugador.id);
            cargar();
          },
        },
      ]
    );
  };

  const colorPct = (pct: number) =>
    pct >= 75 ? '#2e7d32' : pct >= 50 ? '#f9a825' : '#c62828';

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderBar navigation={navigation} onAdd={() => setModalVisible(true)} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a472a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar navigation={navigation} onAdd={() => setModalVisible(true)} />

      <ScrollView contentContainerStyle={styles.scroll}>

        {hijos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👨‍👩‍👧</Text>
            <Text style={styles.emptyTitle}>Sin jugadores vinculados</Text>
            <Text style={styles.emptySub}>
              Vincula a tus hijos para ver su asistencia y datos del club.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.emptyBtnText}>+ Vincular jugador</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.seccionHeader}>
              <Text style={styles.seccionTitulo}>Mis jugadores vinculados</Text>
              {hijos.length > 1 && (
                <TouchableOpacity
                  style={styles.pagarTodosBtn}
                  onPress={() => navigation.navigate('Pago', { jugadorIds: hijos.map(h => h.jugador.id) })}
                >
                  <Text style={styles.pagarTodosBtnText}>💳 Pagar todos ({hijos.length})</Text>
                </TouchableOpacity>
              )}
            </View>

            {hijos.map(hijo => {
              const pct = hijo.stats.porcentajeAsistencia;
              const col = colorPct(pct);
              return (
                <TouchableOpacity
                  key={hijo.jugador.id}
                  style={styles.hijoCard}
                  onPress={() => navigation.navigate('PerfilJugador', { jugadorId: hijo.jugador.id })}
                  activeOpacity={0.85}
                >
                  {/* Avatar + info */}
                  <View style={styles.hijoTop}>
                    <View style={[styles.avatar, { backgroundColor: hijo.categoria?.color ?? '#1a472a' }]}>
                      <Text style={styles.avatarText}>
                        {hijo.jugador.nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.hijoInfo}>
                      <Text style={styles.hijoNombre}>{hijo.jugador.nombre}</Text>
                      <Text style={styles.hijoRut}>{hijo.jugador.rut}</Text>
                      <View style={styles.hijoBadgeRow}>
                        {hijo.categoria && (
                          <View style={[styles.catBadge, { borderColor: hijo.categoria.color, backgroundColor: hijo.categoria.color + '22' }]}>
                            <Text style={[styles.catBadgeText, { color: hijo.categoria.color }]}>
                              {hijo.categoria.nombre}
                            </Text>
                          </View>
                        )}
                        <View style={styles.relBadge}>
                          <Text style={styles.relBadgeText}>
                            {TIPOS_RELACION.find(t => t.key === hijo.relacion.tipoRelacion)?.label ?? hijo.relacion.tipoRelacion}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.desvincularBtn}
                      onPress={() => handleDesvincular(hijo)}
                    >
                      <Text style={styles.desvincularText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Stats strip */}
                  <View style={styles.statsStrip}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: col }]}>{pct}%</Text>
                      <Text style={styles.statLbl}>Asistencia</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNum}>{hijo.stats.sesionesPresente}</Text>
                      <Text style={styles.statLbl}>Presentes</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNum}>{hijo.stats.totalSesiones}</Text>
                      <Text style={styles.statLbl}>Total</Text>
                    </View>
                    <View style={styles.statDiv} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: '#1a7a4a' }]}>{hijo.stats.rachaActual}</Text>
                      <Text style={styles.statLbl}>Racha</Text>
                    </View>
                  </View>

                  {/* Barra progreso */}
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: col }]} />
                  </View>

                  {/* Botón ver perfil + pago */}
                  <View style={styles.hijoActions}>
                    <TouchableOpacity
                      style={styles.verPerfilBtn}
                      onPress={() => navigation.navigate('PerfilJugador', { jugadorId: hijo.jugador.id })}
                    >
                      <Text style={styles.verPerfilText}>👤 Ver perfil completo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pagarBtn}
                      onPress={() =>
                        navigation.navigate('Pago', { jugadorIds: [hijo.jugador.id] })
                      }
                    >
                      <Text style={styles.pagarText}>💳 Pagar</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.agregarHijoBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.agregarHijoBtnText}>+ Vincular otro jugador</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal vincular */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>🔗 Vincular jugador</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setRutBusqueda(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalInfo}>
                Ingresa el RUT del jugador (tu hijo/a u otro familiar) inscrito en el club para vincularlo a tu cuenta.
              </Text>

              <Text style={styles.modalLabel}>RUT del jugador *</Text>
              <TextInput
                style={styles.modalInput}
                value={rutBusqueda}
                onChangeText={text => setRutBusqueda(formatearRUT(text))}
                placeholder="12345678-9"
                maxLength={10}
                autoCapitalize="characters"
                keyboardType="default"
              />

              <Text style={styles.modalLabel}>Tipo de relación</Text>
              <View style={styles.tiposGrid}>
                {TIPOS_RELACION.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tipoChip, tipoRelacion === t.key && styles.tipoChipActivo]}
                    onPress={() => setTipoRelacion(t.key)}
                  >
                    <Text style={[styles.tipoChipText, tipoRelacion === t.key && styles.tipoChipTextActivo]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelarBtn}
                onPress={() => { setModalVisible(false); setRutBusqueda(''); }}
              >
                <Text style={styles.modalCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBuscarBtn, vinculando && { opacity: 0.5 }]}
                onPress={handleVincular}
                disabled={vinculando}
              >
                {vinculando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBuscarText}>Vincular</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HeaderBar({ navigation, onAdd }: { navigation: any; onAdd: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Portal Apoderado</Text>
      <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
        <Text style={styles.addText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1a472a',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16, paddingTop: 20,
  },
  backBtn: { width: 40 },
  backText: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  addBtn: { width: 40, alignItems: 'flex-end' },
  addText: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  scroll: { padding: 15, paddingBottom: 40 },
  seccionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: '#333' },
  pagarTodosBtn: {
    backgroundColor: '#1a472a', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  pagarTodosBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', marginTop: 20,
  },
  emptyIcon: { fontSize: 50 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
  emptyBtn: {
    marginTop: 20, backgroundColor: '#1a472a',
    borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  hijoCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, overflow: 'hidden',
  },
  hijoTop: { flexDirection: 'row', padding: 16, alignItems: 'flex-start' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  hijoInfo: { flex: 1 },
  hijoNombre: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  hijoRut: { fontSize: 13, color: '#888', marginTop: 2 },
  hijoBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  catBadge: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 3 },
  catBadgeText: { fontSize: 12, fontWeight: '600' },
  relBadge: { backgroundColor: '#e8f5e9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  relBadgeText: { fontSize: 12, color: '#2e7d32', fontWeight: '500' },
  desvincularBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ffeaea', justifyContent: 'center', alignItems: 'center',
  },
  desvincularText: { fontSize: 12, color: '#c62828', fontWeight: 'bold' },

  statsStrip: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  statLbl: { fontSize: 11, color: '#888', marginTop: 2 },
  statDiv: { width: 1, backgroundColor: '#eee', marginHorizontal: 4 },

  progressBg: {
    height: 6, backgroundColor: '#f0f0f0',
    marginHorizontal: 16, marginBottom: 12, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  hijoActions: {
    flexDirection: 'row', padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  verPerfilBtn: {
    flex: 2, backgroundColor: '#e8f5e9', borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  verPerfilText: { color: '#1a472a', fontWeight: '600', fontSize: 13 },
  pagarBtn: {
    flex: 1, backgroundColor: '#fff3e0', borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  pagarText: { color: '#e65100', fontWeight: '600', fontSize: 13 },

  agregarHijoBtn: {
    borderWidth: 2, borderColor: '#1a472a', borderStyle: 'dashed',
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4,
  },
  agregarHijoBtnText: { color: '#1a472a', fontWeight: 'bold', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 18, backgroundColor: '#1a472a',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalClose: { fontSize: 22, color: '#fff' },
  modalBody: { flexShrink: 1, padding: 18 },
  modalInfo: {
    fontSize: 14, color: '#555', backgroundColor: '#f5f9f5',
    borderRadius: 8, padding: 12, marginBottom: 6, lineHeight: 20,
  },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 14, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 16, backgroundColor: '#fafafa', letterSpacing: 1,
  },
  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f8f8f8',
  },
  tipoChipActivo: { borderColor: '#1a472a', backgroundColor: '#e8f5e9' },
  tipoChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  tipoChipTextActivo: { color: '#1a472a', fontWeight: 'bold' },
  modalFooter: {
    flexDirection: 'row', padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  modalCancelarBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  modalCancelarText: { fontSize: 15, color: '#666', fontWeight: '600' },
  modalBuscarBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    backgroundColor: '#1a472a', alignItems: 'center',
  },
  modalBuscarText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
});
