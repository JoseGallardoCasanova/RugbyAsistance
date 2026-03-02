import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { Aviso, TipoAviso } from '../../types/v2';

const TIPOS: { key: TipoAviso; label: string; color: string; bg: string; icon: string }[] = [
  { key: 'info',     label: 'Información', color: '#1565c0', bg: '#e3f2fd', icon: 'ℹ️' },
  { key: 'warning',  label: 'Advertencia', color: '#e65100', bg: '#fff3e0', icon: '⚠️' },
  { key: 'urgente',  label: 'Urgente',     color: '#b71c1c', bg: '#ffebee', icon: '🚨' },
];

const tipoConfig = (tipo: TipoAviso) => TIPOS.find(t => t.key === tipo) ?? TIPOS[0];

const AvisosTab: React.FC = () => {
  const { user } = useAuth();
  const { club } = useClub();

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Formulario modal
  const [editando, setEditando] = useState<Aviso | null>(null);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tipo, setTipo] = useState<TipoAviso>('info');

  const cargar = async () => {
    if (!club) return;
    setLoading(true);
    const data = await SupabaseServiceV2.getAvisosByClub(club.id, false); // todos, activos e inactivos
    setAvisos(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { cargar(); }, [club]));

  const abrirNuevo = () => {
    setEditando(null);
    setTitulo('');
    setContenido('');
    setTipo('info');
    setModalVisible(true);
  };

  const abrirEditar = (aviso: Aviso) => {
    setEditando(aviso);
    setTitulo(aviso.titulo);
    setContenido(aviso.contenido);
    setTipo(aviso.tipo);
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!titulo.trim()) { Alert.alert('Error', 'El título es obligatorio.'); return; }
    if (!contenido.trim()) { Alert.alert('Error', 'El contenido es obligatorio.'); return; }
    if (!club || !user) return;

    setGuardando(true);
    let ok = false;
    if (editando) {
      ok = await SupabaseServiceV2.actualizarAviso(editando.id, titulo.trim(), contenido.trim(), tipo, editando.activo);
    } else {
      const nuevo = await SupabaseServiceV2.crearAviso(club.id, user.id, titulo.trim(), contenido.trim(), tipo);
      ok = !!nuevo;
    }
    setGuardando(false);

    if (ok) {
      setModalVisible(false);
      cargar();
    } else {
      Alert.alert('Error', 'No se pudo guardar el aviso.');
    }
  };

  const handleToggleActivo = async (aviso: Aviso) => {
    const nuevoEstado = !aviso.activo;
    const ok = await SupabaseServiceV2.actualizarAviso(aviso.id, aviso.titulo, aviso.contenido, aviso.tipo, nuevoEstado);
    if (ok) cargar();
  };

  const handleEliminar = (aviso: Aviso) => {
    Alert.alert(
      'Eliminar aviso',
      `¿Eliminar "${aviso.titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const ok = await SupabaseServiceV2.eliminarAviso(aviso.id);
            if (ok) cargar();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Aviso }) => {
    const cfg = tipoConfig(item.tipo);
    const fecha = new Date(item.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return (
      <View style={[styles.card, !item.activo && styles.cardInactivo]}>
        <View style={[styles.cardBadge, { backgroundColor: cfg.bg }]}>
          <Text style={styles.cardBadgeIcon}>{cfg.icon}</Text>
          <Text style={[styles.cardBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          {!item.activo && <Text style={styles.ocultoBadge}>  OCULTO</Text>}
        </View>

        <Text style={[styles.cardTitulo, !item.activo && styles.textoApagado]}>{item.titulo}</Text>
        <Text style={[styles.cardContenido, !item.activo && styles.textoApagado]} numberOfLines={2}>
          {item.contenido}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.fechaText}>📅 {fecha}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleToggleActivo(item)}>
              <Text style={styles.iconBtnText}>{item.activo ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => abrirEditar(item)}>
              <Text style={styles.iconBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleEliminar(item)}>
              <Text style={styles.iconBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const activos = avisos.filter(a => a.activo).length;

  return (
    <View style={styles.container}>
      {/* Resumen */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
          <Text style={styles.summaryNum}>{activos}</Text>
          <Text style={styles.summaryLbl}>Activos</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#f5f5f5' }]}>
          <Text style={styles.summaryNum}>{avisos.length - activos}</Text>
          <Text style={styles.summaryLbl}>Ocultos</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
          <Text style={styles.summaryNum}>{avisos.length}</Text>
          <Text style={styles.summaryLbl}>Total</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={abrirNuevo}>
        <Text style={styles.addBtnText}>➕ Nuevo aviso</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#1a472a" size="large" />
      ) : (
        <FlatList
          data={avisos}
          keyExtractor={a => a.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📢</Text>
              <Text style={styles.emptyText}>No hay avisos aún</Text>
              <Text style={styles.emptySubText}>Crea un aviso para informar a los miembros del club.</Text>
            </View>
          }
        />
      )}

      {/* Modal crear/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editando ? 'Editar aviso' : 'Nuevo aviso'}</Text>

            {/* Tipo */}
            <Text style={styles.fieldLabel}>Tipo de aviso</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tiposRow}>
              {TIPOS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tipoChip, { backgroundColor: t.bg, borderColor: tipo === t.key ? t.color : 'transparent', borderWidth: 2 }]}
                  onPress={() => setTipo(t.key)}
                >
                  <Text>{t.icon}</Text>
                  <Text style={[styles.tipoChipText, { color: t.color }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Título *</Text>
            <TextInput
              style={styles.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ej: Entrenamiento cancelado"
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>Mensaje *</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={contenido}
              onChangeText={setContenido}
              placeholder="Escribe el mensaje completo aquí..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{contenido.length}/500</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
                disabled={guardando}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, guardando && { opacity: 0.6 }]}
                onPress={handleGuardar}
                disabled={guardando}
              >
                {guardando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnConfirmText}>{editando ? 'Guardar' : 'Publicar'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: 'bold', color: '#1a472a' },
  summaryLbl: { fontSize: 12, color: '#555', marginTop: 2 },
  addBtn: { backgroundColor: '#1a472a', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 14 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  listContent: { gap: 12, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  cardInactivo: { opacity: 0.55 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8, gap: 4 },
  cardBadgeIcon: { fontSize: 13 },
  cardBadgeText: { fontSize: 12, fontWeight: '700' },
  ocultoBadge: { fontSize: 11, color: '#999', fontWeight: '600' },
  cardTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1a2a1a', marginBottom: 4 },
  cardContenido: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 10 },
  textoApagado: { color: '#aaa' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fechaText: { fontSize: 12, color: '#999' },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 6, backgroundColor: '#f5f5f5', borderRadius: 8 },
  iconBtnText: { fontSize: 16 },
  empty: { alignItems: 'center', marginTop: 50, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySubText: { fontSize: 14, color: '#888', textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a472a', marginBottom: 16, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  tiposRow: { flexDirection: 'row', marginBottom: 4 },
  tipoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  tipoChipText: { fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: '#f8f8f8', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 13, fontSize: 15 },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', fontSize: 12, color: '#aaa', marginTop: 4 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#eee' },
  modalBtnConfirm: { backgroundColor: '#1a472a' },
  modalBtnCancelText: { fontSize: 15, fontWeight: '600', color: '#555' },
  modalBtnConfirmText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
});

export default AvisosTab;
