/**
 * IMPORTANTE: Antes de usar este componente, ejecuta este SQL en Supabase:
 *
 * CREATE TABLE IF NOT EXISTS entrenamientos (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
 *   categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
 *   fecha DATE NOT NULL,
 *   hora_inicio VARCHAR(5),
 *   hora_fin VARCHAR(5),
 *   ubicacion TEXT,
 *   descripcion TEXT,
 *   estado VARCHAR(20) DEFAULT 'programado',
 *   creado_por UUID,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX idx_entrenamientos_club ON entrenamientos(club_id);
 * CREATE INDEX idx_entrenamientos_categoria ON entrenamientos(categoria_id);
 * CREATE INDEX idx_entrenamientos_fecha ON entrenamientos(fecha);
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import NotificacionesService from '../../services/NotificacionesService';
import { Categoria, Entrenamiento } from '../../types/v2';

const { width } = Dimensions.get('window');
const DIA_SIZE = Math.floor((width - 40) / 7);

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADOS: { valor: Entrenamiento['estado']; label: string; color: string }[] = [
  { valor: 'programado', label: 'Programado', color: '#1a472a' },
  { valor: 'completado', label: 'Completado', color: '#4caf50' },
  { valor: 'cancelado', label: 'Cancelado', color: '#f44336' },
];

interface FormData {
  categoriaId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  ubicacion: string;
  descripcion: string;
  estado: Entrenamiento['estado'];
}

const FORM_VACIO: FormData = {
  categoriaId: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
  ubicacion: '',
  descripcion: '',
  estado: 'programado',
};

const CalendarioTab: React.FC = () => {
  const { user } = useAuth();
  const { club } = useClub();

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1); // 1-12
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [entrenamientos, setEntrenamientos] = useState<Entrenamiento[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEntrenamientos, setLoadingEntrenamientos] = useState(false);

  // Modal crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Entrenamiento | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const puedeEditar =
    user?.role === 'super_admin' || user?.role === 'admin_club' || user?.role === 'entrenador';

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    if (categoriaSeleccionada) {
      cargarEntrenamientos();
    }
  }, [categoriaSeleccionada, mes, anio]);

  const cargarCategorias = async () => {
    if (!club) return;
    try {
      setLoading(true);
      const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);
      let filtradas = cats;
      if (user?.role === 'entrenador') {
        filtradas = cats.filter(c => user.categoriasAsignadas?.includes(c.id));
      }
      const ordenadas = filtradas.sort((a, b) => a.orden - b.orden);
      setCategorias(ordenadas);
      if (ordenadas.length > 0) {
        setCategoriaSeleccionada(ordenadas[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const cargarEntrenamientos = async () => {
    if (!club || !categoriaSeleccionada) return;
    try {
      setLoadingEntrenamientos(true);
      const datos = await SupabaseServiceV2.getEntrenamientosByMes(
        club.id,
        categoriaSeleccionada,
        anio,
        mes
      );
      setEntrenamientos(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEntrenamientos(false);
    }
  };

  // ─── Calendario ───────────────────────────────────────────────

  const cambiarMes = (delta: number) => {
    setDiaSeleccionado(null);
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    if (nuevoMes < 1)  { nuevoMes = 12; nuevoAnio--; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const construirCalendario = () => {
    const primerDia = new Date(anio, mes - 1, 1);
    // JS: 0=Dom…6=Sab. Convertir a 0=Lu…6=Do
    const inicioSemana = (primerDia.getDay() + 6) % 7;
    const diasEnMes = new Date(anio, mes, 0).getDate();

    const celdas: (number | null)[] = [];
    for (let i = 0; i < inicioSemana; i++) celdas.push(null);
    for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
    // Completar última fila
    while (celdas.length % 7 !== 0) celdas.push(null);
    return celdas;
  };

  const fechaStr = (dia: number) =>
    `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  const entrenamientosDia = useCallback(
    (dia: number) => entrenamientos.filter(e => e.fecha === fechaStr(dia)),
    [entrenamientos, anio, mes]
  );

  const colorEstado = (estado: Entrenamiento['estado']) =>
    ESTADOS.find(e => e.valor === estado)?.color ?? '#1a472a';

  // ─── Modal crear/editar ────────────────────────────────────────

  const abrirCrear = (fecha?: string) => {
    setEditando(null);
    setForm({
      ...FORM_VACIO,
      categoriaId: categoriaSeleccionada ?? '',
      fecha: fecha ?? diaSeleccionado ?? '',
    });
    setModalVisible(true);
  };

  const abrirEditar = (e: Entrenamiento) => {
    setEditando(e);
    setForm({
      categoriaId: e.categoriaId,
      fecha: e.fecha,
      horaInicio: e.horaInicio ?? '',
      horaFin: e.horaFin ?? '',
      ubicacion: e.ubicacion ?? '',
      descripcion: e.descripcion ?? '',
      estado: e.estado,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    if (!club) return;
    if (!form.fecha) {
      Alert.alert('Error', 'La fecha es obligatoria');
      return;
    }
    // Validar formato hora
    const regHora = /^([0-1]\d|2[0-3]):[0-5]\d$/;
    if (form.horaInicio && !regHora.test(form.horaInicio)) {
      Alert.alert('Error', 'Hora inicio inválida (usa HH:MM, ej: 18:00)');
      return;
    }
    if (form.horaFin && !regHora.test(form.horaFin)) {
      Alert.alert('Error', 'Hora fin inválida (usa HH:MM, ej: 20:00)');
      return;
    }

    try {
      setGuardando(true);
      if (editando) {
        await SupabaseServiceV2.actualizarEntrenamiento(editando.id, {
          fecha: form.fecha,
          horaInicio: form.horaInicio || undefined,
          horaFin: form.horaFin || undefined,
          ubicacion: form.ubicacion || undefined,
          descripcion: form.descripcion || undefined,
          estado: form.estado,
        });
      } else {
        await SupabaseServiceV2.crearEntrenamiento(club.id, {
          categoriaId: form.categoriaId || categoriaSeleccionada!,
          fecha: form.fecha,
          horaInicio: form.horaInicio || undefined,
          horaFin: form.horaFin || undefined,
          ubicacion: form.ubicacion || undefined,
          descripcion: form.descripcion || undefined,
          creadoPor: user?.id,
        });
      }
      setModalVisible(false);
      await cargarEntrenamientos();

      // Programar/reprogramar notificación
      const catNombre = categorias.find(c => c.id === (form.categoriaId || categoriaSeleccionada))?.nombre;
      if (editando) {
        // Reprogramar con los nuevos datos (el servicio cancela el anterior internamente)
        await NotificacionesService.programarRecordatorio(
          { ...editando, fecha: form.fecha, horaInicio: form.horaInicio || undefined, horaFin: form.horaFin || undefined, ubicacion: form.ubicacion || undefined },
          catNombre
        );
      } else {
        // Buscar el entrenamiento recién creado para tener su id
        const lista = await SupabaseServiceV2.getEntrenamientosByMes(club!.id, categoriaSeleccionada!, anio, mes);
        const nuevo = lista.find(e => e.fecha === form.fecha && e.horaInicio === (form.horaInicio || undefined));
        if (nuevo) await NotificacionesService.programarRecordatorio(nuevo, catNombre);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el entrenamiento');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = (e: Entrenamiento) => {
    Alert.alert(
      'Eliminar entrenamiento',
      `¿Eliminar el entrenamiento del ${e.fecha}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await SupabaseServiceV2.eliminarEntrenamiento(e.id);
            await NotificacionesService.cancelarRecordatorio(e.id);
            await cargarEntrenamientos();
            if (entrenamientosDia(Number(e.fecha.split('-')[2])).length <= 1) {
              setDiaSeleccionado(null);
            }
          },
        },
      ]
    );
  };

  // ─── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a472a" />
      </View>
    );
  }

  if (categorias.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>Sin categorías disponibles</Text>
      </View>
    );
  }

  const celdas = construirCalendario();
  const entrenamientosDiaSeleccionado = diaSeleccionado
    ? entrenamientos.filter(e => e.fecha === diaSeleccionado)
    : [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Selector de categoría ─────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catScrollContent}
        >
          {categorias.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => { setCategoriaSeleccionada(cat.id); setDiaSeleccionado(null); }}
              style={[
                styles.catChip,
                { borderColor: cat.color },
                categoriaSeleccionada === cat.id && { backgroundColor: cat.color },
              ]}
            >
              <Text style={[
                styles.catChipText,
                categoriaSeleccionada === cat.id && { color: '#fff' },
              ]}>
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Navegación del mes ────────────────────────── */}
        <View style={styles.mesNav}>
          <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.mesNavBtn}>
            <Text style={styles.mesNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.mesTitulo}>{MESES[mes - 1]} {anio}</Text>
          <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.mesNavBtn}>
            <Text style={styles.mesNavArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cabecera días ─────────────────────────────── */}
        <View style={styles.semanaHeader}>
          {DIAS_SEMANA.map(d => (
            <Text key={d} style={styles.semanaHeaderText}>{d}</Text>
          ))}
        </View>

        {/* ── Grilla del mes ───────────────────────────── */}
        {loadingEntrenamientos ? (
          <View style={styles.center}>
            <ActivityIndicator color="#1a472a" />
          </View>
        ) : (
          <View style={styles.grilla}>
            {celdas.map((dia, i) => {
              if (!dia) return <View key={`empty-${i}`} style={styles.celda} />;

              const fechaDia = fechaStr(dia);
              const trns = entrenamientosDia(dia);
              const esHoy =
                dia === hoy.getDate() &&
                mes === hoy.getMonth() + 1 &&
                anio === hoy.getFullYear();
              const seleccionado = diaSeleccionado === fechaDia;

              return (
                <TouchableOpacity
                  key={`dia-${dia}`}
                  style={[
                    styles.celda,
                    esHoy && styles.celdaHoy,
                    seleccionado && styles.celdaSeleccionada,
                  ]}
                  onPress={() =>
                    setDiaSeleccionado(seleccionado ? null : fechaDia)
                  }
                >
                  <Text style={[
                    styles.celdaNum,
                    esHoy && styles.celdaNumHoy,
                    seleccionado && styles.celdaNumSeleccionada,
                  ]}>
                    {dia}
                  </Text>
                  {/* Puntos de entrenamientos */}
                  <View style={styles.puntosRow}>
                    {trns.slice(0, 3).map(t => (
                      <View
                        key={t.id}
                        style={[styles.punto, { backgroundColor: colorEstado(t.estado) }]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Leyenda estados ──────────────────────────── */}
        <View style={styles.leyenda}>
          {ESTADOS.map(e => (
            <View key={e.valor} style={styles.leyendaItem}>
              <View style={[styles.leyendaPunto, { backgroundColor: e.color }]} />
              <Text style={styles.leyendaTexto}>{e.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Detalle del día seleccionado ─────────────── */}
        {diaSeleccionado && (
          <View style={styles.detalleContainer}>
            <View style={styles.detalleTituloRow}>
              <Text style={styles.detalleTitulo}>
                {diaSeleccionado.split('-').reverse().join('/')}
              </Text>
              {puedeEditar && (
                <TouchableOpacity
                  style={styles.btnAgregar}
                  onPress={() => abrirCrear(diaSeleccionado)}
                >
                  <Text style={styles.btnAgregarText}>+ Agregar</Text>
                </TouchableOpacity>
              )}
            </View>

            {entrenamientosDiaSeleccionado.length === 0 ? (
              <Text style={styles.sinEntrenamientos}>
                No hay entrenamientos este día.
              </Text>
            ) : (
              entrenamientosDiaSeleccionado.map(t => (
                <View key={t.id} style={[styles.tarjeta, { borderLeftColor: colorEstado(t.estado) }]}>
                  <View style={styles.tarjetaHeader}>
                    <View>
                      {(t.horaInicio || t.horaFin) && (
                        <Text style={styles.tarjetaHora}>
                          🕐 {t.horaInicio ?? '--:--'} – {t.horaFin ?? '--:--'}
                        </Text>
                      )}
                      {t.ubicacion && (
                        <Text style={styles.tarjetaUbicacion}>📍 {t.ubicacion}</Text>
                      )}
                      {t.descripcion && (
                        <Text style={styles.tarjetaDesc}>{t.descripcion}</Text>
                      )}
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: colorEstado(t.estado) }]}>
                      <Text style={styles.estadoBadgeText}>
                        {ESTADOS.find(e => e.valor === t.estado)?.label}
                      </Text>
                    </View>
                  </View>
                  {puedeEditar && (
                    <View style={styles.tarjetaAcciones}>
                      <TouchableOpacity
                        style={styles.btnEditar}
                        onPress={() => abrirEditar(t)}
                      >
                        <Text style={styles.btnEditarText}>✏️ Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.btnEliminar}
                        onPress={() => confirmarEliminar(t)}
                      >
                        <Text style={styles.btnEliminarText}>🗑️ Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Resumen del mes ──────────────────────────── */}
        {!diaSeleccionado && (
          <View style={styles.resumenContainer}>
            <Text style={styles.resumenTitulo}>Resumen del mes</Text>
            <View style={styles.resumenGrid}>
              <View style={styles.resumenCard}>
                <Text style={styles.resumenNum}>{entrenamientos.length}</Text>
                <Text style={styles.resumenLabel}>Total</Text>
              </View>
              <View style={styles.resumenCard}>
                <Text style={[styles.resumenNum, { color: '#4caf50' }]}>
                  {entrenamientos.filter(e => e.estado === 'completado').length}
                </Text>
                <Text style={styles.resumenLabel}>Completados</Text>
              </View>
              <View style={styles.resumenCard}>
                <Text style={[styles.resumenNum, { color: '#f44336' }]}>
                  {entrenamientos.filter(e => e.estado === 'cancelado').length}
                </Text>
                <Text style={styles.resumenLabel}>Cancelados</Text>
              </View>
            </View>

            {puedeEditar && (
              <TouchableOpacity
                style={styles.btnNuevo}
                onPress={() => abrirCrear()}
              >
                <Text style={styles.btnNuevoText}>+ Nuevo Entrenamiento</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>

      {/* ── Modal crear/editar ─────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {editando ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCerrar}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Fecha *</Text>
              <TextInput
                style={styles.input}
                value={form.fecha}
                onChangeText={v => setForm(f => ({ ...f, fecha: v }))}
                placeholder="YYYY-MM-DD  (ej: 2026-03-15)"
                placeholderTextColor="#aaa"
              />

              <View style={styles.horaRow}>
                <View style={styles.horaCol}>
                  <Text style={styles.label}>Hora inicio</Text>
                  <TextInput
                    style={styles.input}
                    value={form.horaInicio}
                    onChangeText={v => setForm(f => ({ ...f, horaInicio: v }))}
                    placeholder="18:00"
                    placeholderTextColor="#aaa"
                    maxLength={5}
                  />
                </View>
                <View style={styles.horaCol}>
                  <Text style={styles.label}>Hora fin</Text>
                  <TextInput
                    style={styles.input}
                    value={form.horaFin}
                    onChangeText={v => setForm(f => ({ ...f, horaFin: v }))}
                    placeholder="20:00"
                    placeholderTextColor="#aaa"
                    maxLength={5}
                  />
                </View>
              </View>

              <Text style={styles.label}>Ubicación</Text>
              <TextInput
                style={styles.input}
                value={form.ubicacion}
                onChangeText={v => setForm(f => ({ ...f, ubicacion: v }))}
                placeholder="Ej: Cancha principal"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.descripcion}
                onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
                placeholder="Notas o detalles del entrenamiento..."
                placeholderTextColor="#aaa"
                multiline
              />

              {editando && (
                <>
                  <Text style={styles.label}>Estado</Text>
                  <View style={styles.estadosRow}>
                    {ESTADOS.map(e => (
                      <TouchableOpacity
                        key={e.valor}
                        style={[
                          styles.estadoBtn,
                          { borderColor: e.color },
                          form.estado === e.valor && { backgroundColor: e.color },
                        ]}
                        onPress={() => setForm(f => ({ ...f, estado: e.valor }))}
                      >
                        <Text style={[
                          styles.estadoBtnText,
                          form.estado === e.valor && { color: '#fff' },
                        ]}>
                          {e.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.modalBotones}>
                <TouchableOpacity
                  style={styles.btnCancelar}
                  onPress={() => setModalVisible(false)}
                  disabled={guardando}
                >
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnGuardar}
                  onPress={guardar}
                  disabled={guardando}
                >
                  {guardando
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnGuardarText}>Guardar</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Estilos ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },

  // Categorías
  catScroll: { marginTop: 16 },
  catScrollContent: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, borderWidth: 2,
    backgroundColor: '#fff', marginRight: 8,
  },
  catChipText: { fontSize: 14, fontWeight: '600', color: '#555' },

  // Navegación mes
  mesNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  mesNavBtn: { padding: 8 },
  mesNavArrow: { fontSize: 28, color: '#1a472a', fontWeight: 'bold' },
  mesTitulo: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  // Cabecera semana
  semanaHeader: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4,
  },
  semanaHeaderText: {
    width: DIA_SIZE, textAlign: 'center',
    fontSize: 12, fontWeight: '600', color: '#999',
  },

  // Grilla
  grilla: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  celda: {
    width: DIA_SIZE, height: DIA_SIZE + 8,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, marginBottom: 2,
  },
  celdaHoy: { backgroundColor: '#e8f5e9' },
  celdaSeleccionada: { backgroundColor: '#1a472a' },
  celdaNum: { fontSize: 14, color: '#333', fontWeight: '500' },
  celdaNumHoy: { color: '#1a472a', fontWeight: 'bold' },
  celdaNumSeleccionada: { color: '#fff', fontWeight: 'bold' },
  puntosRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  punto: { width: 5, height: 5, borderRadius: 3 },

  // Leyenda
  leyenda: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 16, paddingVertical: 10,
  },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leyendaPunto: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { fontSize: 11, color: '#666' },

  // Detalle día
  detalleContainer: { margin: 16, marginTop: 8 },
  detalleTituloRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  detalleTitulo: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  btnAgregar: {
    backgroundColor: '#1a472a', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 8,
  },
  btnAgregarText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sinEntrenamientos: { color: '#999', textAlign: 'center', padding: 20 },

  // Tarjeta entrenamiento
  tarjeta: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  tarjetaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tarjetaHora: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 3 },
  tarjetaUbicacion: { fontSize: 13, color: '#666', marginBottom: 2 },
  tarjetaDesc: { fontSize: 13, color: '#888', marginTop: 4 },
  estadoBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  estadoBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  tarjetaAcciones: {
    flexDirection: 'row', gap: 10, marginTop: 12,
    borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10,
  },
  btnEditar: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#e8f5e9', alignItems: 'center',
  },
  btnEditarText: { color: '#1a472a', fontWeight: '600', fontSize: 13 },
  btnEliminar: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#fdecea', alignItems: 'center',
  },
  btnEliminarText: { color: '#f44336', fontWeight: '600', fontSize: 13 },

  // Resumen mes
  resumenContainer: { margin: 16, marginTop: 8 },
  resumenTitulo: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  resumenGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  resumenCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  resumenNum: { fontSize: 28, fontWeight: 'bold', color: '#1a472a' },
  resumenLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  btnNuevo: {
    backgroundColor: '#1a472a', padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  btnNuevoText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalCerrar: { fontSize: 20, color: '#999' },
  modalScroll: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#333',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  horaRow: { flexDirection: 'row', gap: 12 },
  horaCol: { flex: 1 },
  estadosRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  estadoBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 2, backgroundColor: '#fff',
  },
  estadoBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  modalBotones: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 10 },
  btnCancelar: {
    flex: 1, padding: 15, borderRadius: 10,
    backgroundColor: '#e0e0e0', alignItems: 'center',
  },
  btnCancelarText: { fontSize: 15, fontWeight: '600', color: '#555' },
  btnGuardar: {
    flex: 1, padding: 15, borderRadius: 10,
    backgroundColor: '#1a472a', alignItems: 'center',
  },
  btnGuardarText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});

export default CalendarioTab;
