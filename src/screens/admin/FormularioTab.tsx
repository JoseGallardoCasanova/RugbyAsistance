import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { FormularioCampo } from '../../types/v2';

const TIPOS_CAMPO: { key: FormularioCampo['tipo']; label: string; icon: string }[] = [
  { key: 'text',     label: 'Texto corto',     icon: '📝' },
  { key: 'textarea', label: 'Texto largo',      icon: '📄' },
  { key: 'email',    label: 'Email',            icon: '📧' },
  { key: 'tel',      label: 'Teléfono',         icon: '📞' },
  { key: 'number',   label: 'Número',           icon: '🔢' },
  { key: 'date',     label: 'Fecha',            icon: '📅' },
  { key: 'rut',      label: 'RUT',              icon: '🪪' },
  { key: 'select',   label: 'Lista de opciones', icon: '📋' },
  { key: 'checkbox', label: 'Casilla Sí/No',    icon: '☑️' },
];

const generarId = () => Math.random().toString(36).substring(2, 10);

const CAMPOS_DEFAULT: FormularioCampo[] = [
  { id: generarId(), tipo: 'text',  label: 'Nombre completo',       obligatorio: true,  orden: 1 },
  { id: generarId(), tipo: 'rut',   label: 'RUT',                   obligatorio: true,  orden: 2 },
  { id: generarId(), tipo: 'date',  label: 'Fecha de nacimiento',   obligatorio: true,  orden: 3 },
  { id: generarId(), tipo: 'email', label: 'Email',                  obligatorio: false, orden: 4 },
  { id: generarId(), tipo: 'tel',   label: 'Teléfono',              obligatorio: false, orden: 5 },
];

export default function FormularioTab() {
  const { club } = useClub();

  const [campos, setCampos] = useState<FormularioCampo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Modal edición
  const [modalVisible, setModalVisible] = useState(false);
  const [campoEditando, setCampoEditando] = useState<FormularioCampo | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editTipo, setEditTipo] = useState<FormularioCampo['tipo']>('text');
  const [editObligatorio, setEditObligatorio] = useState(false);
  const [editSeccion, setEditSeccion] = useState('');
  const [editOpciones, setEditOpciones] = useState('');  // CSV

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    if (!club) return;
    setCargando(true);
    try {
      const form = await SupabaseServiceV2.getFormularioByClub(club.id);
      if (form && form.campos.length > 0) {
        setCampos(form.campos.sort((a, b) => a.orden - b.orden));
      } else {
        setCampos(CAMPOS_DEFAULT);
      }
    } finally {
      setCargando(false);
    }
  };

  const abrirNuevoCampo = () => {
    setCampoEditando(null);
    setEditLabel('');
    setEditPlaceholder('');
    setEditTipo('text');
    setEditObligatorio(false);
    setEditSeccion('');
    setEditOpciones('');
    setModalVisible(true);
  };

  const abrirEditarCampo = (campo: FormularioCampo) => {
    setCampoEditando(campo);
    setEditLabel(campo.label);
    setEditPlaceholder(campo.placeholder || '');
    setEditTipo(campo.tipo);
    setEditObligatorio(campo.obligatorio);
    setEditSeccion(campo.seccion || '');
    setEditOpciones((campo.opciones || []).join('\n'));
    setModalVisible(true);
  };

  const guardarCampoModal = () => {
    if (!editLabel.trim()) {
      Alert.alert('Error', 'El nombre del campo es requerido');
      return;
    }
    if (editTipo === 'select' && !editOpciones.trim()) {
      Alert.alert('Error', 'Debes ingresar al menos una opción para la lista');
      return;
    }

    const opciones = editTipo === 'select'
      ? editOpciones.split('\n').map(o => o.trim()).filter(Boolean)
      : undefined;

    if (campoEditando) {
      // Editar existente
      setCampos(prev => prev.map(c =>
        c.id === campoEditando.id
          ? { ...c, label: editLabel.trim(), placeholder: editPlaceholder.trim() || undefined,
              tipo: editTipo, obligatorio: editObligatorio,
              seccion: editSeccion.trim() || undefined, opciones }
          : c
      ));
    } else {
      // Nuevo
      const nuevo: FormularioCampo = {
        id: generarId(),
        tipo: editTipo,
        label: editLabel.trim(),
        placeholder: editPlaceholder.trim() || undefined,
        obligatorio: editObligatorio,
        orden: campos.length + 1,
        seccion: editSeccion.trim() || undefined,
        opciones,
      };
      setCampos(prev => [...prev, nuevo]);
    }
    setModalVisible(false);
  };

  const eliminarCampo = (id: string) => {
    Alert.alert('Eliminar campo', '¿Eliminar este campo del formulario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => {
          setCampos(prev => {
            const filtrados = prev.filter(c => c.id !== id);
            return filtrados.map((c, i) => ({ ...c, orden: i + 1 }));
          });
        },
      },
    ]);
  };

  const moverCampo = (id: string, direccion: 'arriba' | 'abajo') => {
    setCampos(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = direccion === 'arriba' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((c, i) => ({ ...c, orden: i + 1 }));
    });
  };

  const guardarEnBD = async () => {
    if (!club) return;
    if (campos.length === 0) {
      Alert.alert('Error', 'Agrega al menos un campo al formulario');
      return;
    }
    setGuardando(true);
    const ok = await SupabaseServiceV2.guardarFormulario(club.id, campos);
    setGuardando(false);
    if (ok) {
      Alert.alert('✅ Guardado', 'El formulario de inscripción fue actualizado');
    } else {
      Alert.alert('❌ Error', 'No se pudo guardar el formulario');
    }
  };

  const tipoInfo = (tipo: FormularioCampo['tipo']) =>
    TIPOS_CAMPO.find(t => t.key === tipo) ?? { label: tipo, icon: '📝' };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a472a" />
        <Text style={styles.cargandoText}>Cargando formulario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>📋 Formulario de auto-inscripción</Text>
          <Text style={styles.infoTexto}>
            Define los campos que verán los jugadores al registrarse.
            Arrastra para reordenar usando las flechas ↑↓.
          </Text>
        </View>

        {/* Lista campos */}
        {campos.map((campo, idx) => {
          const ti = tipoInfo(campo.tipo);
          return (
            <View key={campo.id} style={styles.campoCard}>
              <View style={styles.campoLeft}>
                <Text style={styles.campoIcon}>{ti.icon}</Text>
                <View style={styles.campoInfo}>
                  <Text style={styles.campoLabel}>
                    {campo.label}
                    {campo.obligatorio ? <Text style={styles.requerido}> *</Text> : ''}
                  </Text>
                  <Text style={styles.campoTipo}>{ti.label}</Text>
                  {campo.seccion ? (
                    <Text style={styles.campoSeccion}>Sección: {campo.seccion}</Text>
                  ) : null}
                  {campo.tipo === 'select' && campo.opciones ? (
                    <Text style={styles.campoOpciones}>
                      Opciones: {campo.opciones.join(', ')}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.campoActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, idx === 0 && styles.actionBtnDisabled]}
                  onPress={() => moverCampo(campo.id, 'arriba')}
                  disabled={idx === 0}
                >
                  <Text style={styles.actionBtnText}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, idx === campos.length - 1 && styles.actionBtnDisabled]}
                  onPress={() => moverCampo(campo.id, 'abajo')}
                  disabled={idx === campos.length - 1}
                >
                  <Text style={styles.actionBtnText}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnEdit]}
                  onPress={() => abrirEditarCampo(campo)}
                >
                  <Text style={styles.actionBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDelete]}
                  onPress={() => eliminarCampo(campo.id)}
                >
                  <Text style={styles.actionBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {campos.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sin campos. Agrega el primero ↓</Text>
          </View>
        )}

        {/* Botón agregar */}
        <TouchableOpacity style={styles.agregarBtn} onPress={abrirNuevoCampo}>
          <Text style={styles.agregarBtnText}>＋ Agregar campo</Text>
        </TouchableOpacity>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.guardarBtn, guardando && styles.guardarBtnDisabled]}
          onPress={guardarEnBD}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.guardarBtnText}>💾 Guardar formulario</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* ── Modal editor de campo ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {campoEditando ? '✏️ Editar campo' : '➕ Nuevo campo'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>

              {/* Nombre */}
              <Text style={styles.modalLabel}>Nombre del campo *</Text>
              <TextInput
                style={styles.modalInput}
                value={editLabel}
                onChangeText={setEditLabel}
                placeholder="Ej: Nombre completo, Teléfono emergencia..."
                maxLength={60}
              />

              {/* Tipo */}
              <Text style={styles.modalLabel}>Tipo de campo</Text>
              <View style={styles.tiposGrid}>
                {TIPOS_CAMPO.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tipoChip, editTipo === t.key && styles.tipoChipActivo]}
                    onPress={() => setEditTipo(t.key)}
                  >
                    <Text style={styles.tipoChipIcon}>{t.icon}</Text>
                    <Text style={[styles.tipoChipText, editTipo === t.key && styles.tipoChipTextActivo]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Opciones (solo para select) */}
              {editTipo === 'select' && (
                <>
                  <Text style={styles.modalLabel}>Opciones (una por línea) *</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextarea]}
                    value={editOpciones}
                    onChangeText={setEditOpciones}
                    placeholder={'Fonasa\nIsapre\nNinguno'}
                    multiline
                    numberOfLines={4}
                  />
                </>
              )}

              {/* Placeholder */}
              <Text style={styles.modalLabel}>Texto de ejemplo (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                value={editPlaceholder}
                onChangeText={setEditPlaceholder}
                placeholder="Ej: Ingresa tu nombre completo..."
                maxLength={80}
              />

              {/* Sección */}
              <Text style={styles.modalLabel}>Sección (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                value={editSeccion}
                onChangeText={setEditSeccion}
                placeholder="Ej: Datos personales, Información médica..."
                maxLength={40}
              />

              {/* Obligatorio */}
              <View style={styles.switchRow}>
                <Text style={styles.modalLabel}>Campo obligatorio</Text>
                <Switch
                  value={editObligatorio}
                  onValueChange={setEditObligatorio}
                  trackColor={{ true: '#1a472a' }}
                />
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelarBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalGuardarBtn}
                onPress={guardarCampoModal}
              >
                <Text style={styles.modalGuardarText}>Guardar campo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cargandoText: { marginTop: 10, color: '#666' },
  scroll: { padding: 15, paddingBottom: 40 },

  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1a472a',
  },
  infoTitulo: { fontSize: 15, fontWeight: 'bold', color: '#1a472a', marginBottom: 4 },
  infoTexto: { fontSize: 13, color: '#444', lineHeight: 19 },

  campoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  campoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  campoIcon: { fontSize: 22, marginRight: 10 },
  campoInfo: { flex: 1 },
  campoLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
  requerido: { color: '#f44336', fontWeight: 'bold' },
  campoTipo: { fontSize: 12, color: '#888', marginTop: 2 },
  campoSeccion: { fontSize: 12, color: '#1a472a', marginTop: 2 },
  campoOpciones: { fontSize: 11, color: '#666', marginTop: 2 },

  campoActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 6,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.3 },
  actionBtnEdit: { backgroundColor: '#e3f2fd' },
  actionBtnDelete: { backgroundColor: '#ffeaea' },
  actionBtnText: { fontSize: 14 },

  emptyBox: {
    padding: 30, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, marginBottom: 12,
  },
  emptyText: { color: '#aaa', fontSize: 15 },

  agregarBtn: {
    borderWidth: 2, borderColor: '#1a472a', borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16,
  },
  agregarBtnText: { color: '#1a472a', fontWeight: 'bold', fontSize: 15 },

  guardarBtn: {
    backgroundColor: '#1a472a', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  guardarBtnDisabled: { opacity: 0.5 },
  guardarBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 18, borderBottomWidth: 1, borderBottomColor: '#eee',
    backgroundColor: '#1a472a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalClose: { fontSize: 22, color: '#fff' },
  modalBody: { padding: 18 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
  modalInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15, backgroundColor: '#fafafa',
  },
  modalTextarea: { minHeight: 90, textAlignVertical: 'top' },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tipoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#f8f8f8',
  },
  tipoChipActivo: { borderColor: '#1a472a', backgroundColor: '#e8f5e9' },
  tipoChipIcon: { fontSize: 14 },
  tipoChipText: { fontSize: 12, color: '#555', fontWeight: '500' },
  tipoChipTextActivo: { color: '#1a472a', fontWeight: 'bold' },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8,
  },

  modalFooter: {
    flexDirection: 'row', padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  modalCancelarBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  modalCancelarText: { fontSize: 15, color: '#666', fontWeight: '600' },
  modalGuardarBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    backgroundColor: '#1a472a', alignItems: 'center',
  },
  modalGuardarText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
});
