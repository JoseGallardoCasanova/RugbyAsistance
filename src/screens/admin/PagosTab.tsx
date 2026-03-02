import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { ConfiguracionPagosClub, Pago, User } from '../../types/v2';

const ESTADO_COLORES: Record<Pago['estado'], string> = {
  pendiente: '#f9a825',
  procesando: '#1565c0',
  pagado: '#2e7d32',
  fallido: '#c62828',
  reembolsado: '#6a1b9a',
};

const ESTADO_EMOJIS: Record<Pago['estado'], string> = {
  pendiente: '⏳',
  procesando: '🔄',
  pagado: '✅',
  fallido: '❌',
  reembolsado: '↩️',
};

const TIPO_LABELS: Record<string, string> = {
  mensualidad: 'Mensualidad',
  matricula: 'Matrícula',
  anual: 'Pago Anual',
};

const METODO_LABELS: Record<string, string> = {
  tarjeta: '💳 Tarjeta',
  transferencia: '🏦 Transferencia',
  efectivo: '💵 Efectivo',
  simulado: '🧪 Simulado',
};

const PagosTab: React.FC = () => {
  const { club } = useClub();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [config, setConfig] = useState<ConfiguracionPagosClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<Pago['estado'] | 'todos'>('todos');
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  // Config modal
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [mensualidad, setMensualidad] = useState('');
  const [matricula, setMatricula] = useState('');
  const [anual, setAnual] = useState('');
  const [anualEditadoManual, setAnualEditadoManual] = useState(false);
  // Descuentos por tipo — estados planos para evitar lag en TextInput
  const [dtoMensActivo, setDtoMensActivo] = useState(false);
  const [dtoMensPct, setDtoMensPct] = useState('0');
  const [dtoMensInicio, setDtoMensInicio] = useState('');
  const [dtoMensFin, setDtoMensFin] = useState('');
  const [dtoMatrActivo, setDtoMatrActivo] = useState(false);
  const [dtoMatrPct, setDtoMatrPct] = useState('0');
  const [dtoMatrInicio, setDtoMatrInicio] = useState('');
  const [dtoMatrFin, setDtoMatrFin] = useState('');
  const [dtoAnualActivo, setDtoAnualActivo] = useState(false);
  const [dtoAnualPct, setDtoAnualPct] = useState('0');
  const [dtoAnualInicio, setDtoAnualInicio] = useState('');
  const [dtoAnualFin, setDtoAnualFin] = useState('');
  const [matriculaActiva, setMatriculaActiva] = useState(true);
  const [mensualidadActiva, setMensualidadActiva] = useState(true);
  const [anualActivo, setAnualActivo] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!club) return;
    try {
      setLoading(true);
      const [pagosData, usuariosData, configData] = await Promise.all([
        SupabaseServiceV2.getPagosByClub(club.id),
        SupabaseServiceV2.getUsuariosByClub(club.id),
        SupabaseServiceV2.getConfigPagosByClub(club.id),
      ]);
      setPagos(pagosData);
      setUsuarios(usuariosData);
      setConfig(configData);
    } finally {
      setLoading(false);
    }
  }, [club]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useFocusEffect(useCallback(() => { cargarDatos(); }, [cargarDatos]));

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const getNombrePagador = (pagadorId: string) => {
    const u = usuarios.find(u => u.id === pagadorId);
    return u ? `${u.nombre} ${u.apellido}` : 'Usuario desconocido';
  };

  const handleCambiarEstado = (pago: Pago, nuevoEstado: Pago['estado']) => {
    Alert.alert(
      'Confirmar',
      `¿Cambiar el estado a "${nuevoEstado}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActualizandoId(pago.id);
            const ok = await SupabaseServiceV2.actualizarEstadoPago(pago.id, nuevoEstado);
            setActualizandoId(null);
            if (ok) {
              setPagos(prev => prev.map(p => p.id === pago.id ? { ...p, estado: nuevoEstado } : p));
            } else {
              Alert.alert('Error', 'No se pudo actualizar el estado.');
            }
          },
        },
      ]
    );
  };

  // Auto-calcular anual = mensualidad × 12 cuando no fue editado manualmente
  const handleMensualidadChange = (v: string) => {
    setMensualidad(v);
    if (!anualEditadoManual) {
      const num = parseFloat(v);
      setAnual(!isNaN(num) && num > 0 ? String(Math.round(num * 12)) : '');
    }
  };

  const abrirModalConfig = () => {
    setMensualidad(config?.precioMensualidad ? String(config.precioMensualidad) : '');
    setMatricula(config?.precioMatricula ? String(config.precioMatricula) : '');
    setAnual(config?.precioAnual ? String(config.precioAnual) : '');
    setAnualEditadoManual(!!config?.precioAnual);
    setDtoMensActivo(config?.descuentoMensualidadActivo ?? false);
    setDtoMensPct(String(config?.descuentoMensualidad ?? 0));
    setDtoMensInicio(config?.descuentoMensualidadInicio ?? '');
    setDtoMensFin(config?.descuentoMensualidadFin ?? '');
    setDtoMatrActivo(config?.descuentoMatriculaActivo ?? false);
    setDtoMatrPct(String(config?.descuentoMatricula ?? 0));
    setDtoMatrInicio(config?.descuentoMatriculaInicio ?? '');
    setDtoMatrFin(config?.descuentoMatriculaFin ?? '');
    setDtoAnualActivo(config?.descuentoAnualActivo ?? false);
    setDtoAnualPct(String(config?.descuentoAnual ?? 0));
    setDtoAnualInicio(config?.descuentoAnualInicio ?? '');
    setDtoAnualFin(config?.descuentoAnualFin ?? '');
    setMatriculaActiva(config?.matriculaActiva ?? true);
    setMensualidadActiva(config?.mensualidadActiva ?? true);
    setAnualActivo(config?.anualActivo ?? false);
    setModalConfigVisible(true);
  };

  const handleGuardarConfig = async () => {
    if (!club) return;
    setGuardandoConfig(true);
    const ok = await SupabaseServiceV2.upsertConfigPagos(club.id, {
      precioMensualidad: mensualidad ? parseFloat(mensualidad) : undefined,
      precioMatricula: matricula ? parseFloat(matricula) : undefined,
      precioAnual: anual ? parseFloat(anual) : undefined,
      descuentoMensualidad: dtoMensPct ? Math.min(100, Math.max(0, parseInt(dtoMensPct))) : 0,
      descuentoMensualidadInicio: dtoMensInicio || undefined,
      descuentoMensualidadFin: dtoMensFin || undefined,
      descuentoMensualidadActivo: dtoMensActivo,
      descuentoMatricula: dtoMatrPct ? Math.min(100, Math.max(0, parseInt(dtoMatrPct))) : 0,
      descuentoMatriculaInicio: dtoMatrInicio || undefined,
      descuentoMatriculaFin: dtoMatrFin || undefined,
      descuentoMatriculaActivo: dtoMatrActivo,
      descuentoAnual: dtoAnualPct ? Math.min(100, Math.max(0, parseInt(dtoAnualPct))) : 0,
      descuentoAnualInicio: dtoAnualInicio || undefined,
      descuentoAnualFin: dtoAnualFin || undefined,
      descuentoAnualActivo: dtoAnualActivo,
      matriculaActiva,
      mensualidadActiva,
      anualActivo,
      proveedor: 'mercadopago',
      moneda: 'CLP',
    });
    setGuardandoConfig(false);
    if (ok) {
      await cargarDatos();
      setModalConfigVisible(false);
      Alert.alert('✅', 'Precios guardados correctamente.');
    } else {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    }
  };

  const formatMonto = (n: number) =>
    n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

  const pagosFiltrados = filtroEstado === 'todos'
    ? pagos
    : pagos.filter(p => p.estado === filtroEstado);

  // Resumen
  const pendientes = pagos.filter(p => p.estado === 'pendiente').length;
  const pagados = pagos.filter(p => p.estado === 'pagado').length;
  const montoPagadoMes = pagos
    .filter(p => p.estado === 'pagado' && p.fechaPago?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((acc, p) => acc + p.monto, 0);

  const renderPago = ({ item }: { item: Pago }) => (
    <View style={styles.pagoCard}>
      <View style={styles.pagoHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pagadorNombre}>{getNombrePagador(item.pagadorId)}</Text>
          <Text style={styles.pagoTipo}>{TIPO_LABELS[item.tipo] ?? item.tipo}</Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: ESTADO_COLORES[item.estado] + '20', borderColor: ESTADO_COLORES[item.estado] }]}>
          <Text style={[styles.estadoText, { color: ESTADO_COLORES[item.estado] }]}>
            {ESTADO_EMOJIS[item.estado]} {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.pagoMeta}>
        <Text style={styles.pagoMonto}>{formatMonto(item.monto)}</Text>
        <Text style={styles.pagoMetodo}>{METODO_LABELS[item.paymentMethod ?? ''] ?? item.paymentMethod ?? '-'}</Text>
      </View>

      {item.transactionId && (
        <Text style={styles.pagoRef}>Ref: {item.transactionId}</Text>
      )}
      <Text style={styles.pagoFecha}>{new Date(item.createdAt).toLocaleDateString('es-CL')}</Text>

      {/* Acciones */}
      {actualizandoId === item.id ? (
        <ActivityIndicator color="#1a472a" style={{ marginTop: 8 }} />
      ) : (
        <View style={styles.accionesRow}>
          {item.estado === 'pendiente' && (
            <>
              <TouchableOpacity
                style={[styles.accionBtn, { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' }]}
                onPress={() => handleCambiarEstado(item, 'pagado')}
              >
                <Text style={[styles.accionText, { color: '#2e7d32' }]}>✅ Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accionBtn, { backgroundColor: '#ffebee', borderColor: '#c62828' }]}
                onPress={() => handleCambiarEstado(item, 'fallido')}
              >
                <Text style={[styles.accionText, { color: '#c62828' }]}>❌ Rechazar</Text>
              </TouchableOpacity>
            </>
          )}
          {item.estado === 'pagado' && (
            <TouchableOpacity
              style={[styles.accionBtn, { backgroundColor: '#f3e5f5', borderColor: '#6a1b9a' }]}
              onPress={() => handleCambiarEstado(item, 'reembolsado')}
            >
              <Text style={[styles.accionText, { color: '#6a1b9a' }]}>↩️ Reembolsar</Text>
            </TouchableOpacity>
          )}
          {item.estado === 'fallido' && (
            <TouchableOpacity
              style={[styles.accionBtn, { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' }]}
              onPress={() => handleCambiarEstado(item, 'pendiente')}
            >
              <Text style={[styles.accionText, { color: '#2e7d32' }]}>🔄 Reactivar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (loading) {
    return <ActivityIndicator color="#1a472a" style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Resumen */}
      <View style={styles.resumenRow}>
        <View style={[styles.resumenCard, { borderLeftColor: '#f9a825' }]}>
          <Text style={styles.resumenNumero}>{pendientes}</Text>
          <Text style={styles.resumenLabel}>Pendientes</Text>
        </View>
        <View style={[styles.resumenCard, { borderLeftColor: '#2e7d32' }]}>
          <Text style={styles.resumenNumero}>{pagados}</Text>
          <Text style={styles.resumenLabel}>Confirmados</Text>
        </View>
        <View style={[styles.resumenCard, { borderLeftColor: '#1565c0' }]}>
          <Text style={styles.resumenNumeroSm}>{montoPagadoMes > 0 ? formatMonto(montoPagadoMes) : '$0'}</Text>
          <Text style={styles.resumenLabel}>Recaudado mes</Text>
        </View>
      </View>

      {/* Config precios */}
      <TouchableOpacity style={styles.configBtn} onPress={abrirModalConfig}>
        <Text style={styles.configBtnText}>⚙️ Configurar precios del club</Text>
        {config?.precioMensualidad && (
          <Text style={styles.configBtnSub}>Mensualidad: {formatMonto(config.precioMensualidad)}</Text>
        )}
        {config?.descuentoMensualidadActivo && (config.descuentoMensualidad ?? 0) > 0 && (
          <Text style={[styles.configBtnSub, { color: '#2e7d32' }]}>🏷️ Mensualidad: -{config.descuentoMensualidad}%{config.descuentoMensualidadFin ? ` (hasta ${config.descuentoMensualidadFin})` : ''}</Text>
        )}
        {config?.descuentoMatriculaActivo && (config.descuentoMatricula ?? 0) > 0 && (
          <Text style={[styles.configBtnSub, { color: '#2e7d32' }]}>🏷️ Matrícula: -{config.descuentoMatricula}%{config.descuentoMatriculaFin ? ` (hasta ${config.descuentoMatriculaFin})` : ''}</Text>
        )}
        {config?.descuentoAnualActivo && (config.descuentoAnual ?? 0) > 0 && (
          <Text style={[styles.configBtnSub, { color: '#2e7d32' }]}>🏷️ Anual: -{config.descuentoAnual}%{config.descuentoAnualFin ? ` (hasta ${config.descuentoAnualFin})` : ''}</Text>
        )}
      </TouchableOpacity>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosContainer} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
        {(['todos', 'pendiente', 'pagado', 'fallido', 'reembolsado'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroChip, filtroEstado === f && styles.filtroChipActivo]}
            onPress={() => setFiltroEstado(f)}
          >
            <Text style={[styles.filtroText, filtroEstado === f && styles.filtroTextActivo]}>
              {f === 'todos' ? '📋 Todos' :
               f === 'pendiente' ? '⏳ Pendientes' :
               f === 'pagado' ? '✅ Confirmados' :
               f === 'fallido' ? '❌ Rechazados' : '↩️ Reembolsados'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista */}
      <FlatList
        data={pagosFiltrados}
        keyExtractor={p => p.id}
        renderItem={renderPago}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a472a']} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>💳</Text>
            <Text style={styles.emptySubtext}>
              {filtroEstado === 'todos' ? 'No hay pagos registrados.' : `No hay pagos con estado "${filtroEstado}".`}
            </Text>
          </View>
        }
      />

      {/* Modal config precios */}
      <Modal visible={modalConfigVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Precios del Club</Text>
              <TouchableOpacity onPress={() => setModalConfigVisible(false)}>
                <Text style={{ fontSize: 22, color: '#fff' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flexShrink: 1, padding: 20 }}>
              <Text style={styles.configLabel}>Mensualidad (CLP)</Text>
              <View style={styles.toggleRow}>
                <Switch value={mensualidadActiva} onValueChange={setMensualidadActiva} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={mensualidadActiva ? '#1a472a' : '#f4f3f4'} />
                <Text style={styles.toggleLabel}>{mensualidadActiva ? 'Activa' : 'Desactivada'}</Text>
              </View>
              <TextInput style={[styles.configInput, !mensualidadActiva && { opacity: 0.4 }]} value={mensualidad} onChangeText={handleMensualidadChange} keyboardType="numeric" placeholder="Ej: 15000" editable={mensualidadActiva} />

              <Text style={styles.configLabel}>Matrícula (CLP)</Text>
              <View style={styles.toggleRow}>
                <Switch value={matriculaActiva} onValueChange={setMatriculaActiva} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={matriculaActiva ? '#1a472a' : '#f4f3f4'} />
                <Text style={styles.toggleLabel}>{matriculaActiva ? 'Activa' : 'Desactivada'}</Text>
              </View>
              <TextInput style={[styles.configInput, !matriculaActiva && { opacity: 0.4 }]} value={matricula} onChangeText={setMatricula} keyboardType="numeric" placeholder="Ej: 30000" editable={matriculaActiva} />

              <Text style={styles.configLabel}>Pago Anual (CLP)</Text>
              <View style={styles.toggleRow}>
                <Switch value={anualActivo} onValueChange={setAnualActivo} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={anualActivo ? '#1a472a' : '#f4f3f4'} />
                <Text style={styles.toggleLabel}>{anualActivo ? 'Activo' : 'Desactivado'}</Text>
              </View>
              {!anualEditadoManual && mensualidad ? (
                <Text style={styles.configHint}>💡 Calculado automáticamente: mensualidad × 12. Edítalo para personalizarlo.</Text>
              ) : null}
              <TextInput
                style={[styles.configInput, !anualActivo && { opacity: 0.4 }]}
                value={anual}
                onChangeText={v => { setAnualEditadoManual(true); setAnual(v); }}
                keyboardType="numeric"
                placeholder="Ej: 150000"
                editable={anualActivo}
              />

              {/* ── Descuentos especiales por tipo ── */}
              <View style={styles.dtoSection}>
                <Text style={styles.configLabel}>🏷️ Descuento Mensualidad</Text>
                <View style={styles.dtoRow}>
                  <Switch value={dtoMensActivo} onValueChange={setDtoMensActivo} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={dtoMensActivo ? '#1a472a' : '#f4f3f4'} />
                  <Text style={styles.toggleLabel}>{dtoMensActivo ? 'Activo' : 'Inactivo'}</Text>
                  {dtoMensActivo && <TextInput style={styles.inputPct} value={dtoMensPct} onChangeText={v => setDtoMensPct(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="%" maxLength={3} />}
                </View>
                {dtoMensActivo && (
                  <View style={styles.dtoFechas}>
                    <TextInput style={styles.inputFecha} value={dtoMensInicio} onChangeText={setDtoMensInicio} placeholder="Desde: AAAA-MM-DD (opcional)" />
                    <TextInput style={styles.inputFecha} value={dtoMensFin} onChangeText={setDtoMensFin} placeholder="Hasta: AAAA-MM-DD (vacío = sin límite)" />
                  </View>
                )}
              </View>

              <View style={styles.dtoSection}>
                <Text style={styles.configLabel}>🏷️ Descuento Matrícula</Text>
                <View style={styles.dtoRow}>
                  <Switch value={dtoMatrActivo} onValueChange={setDtoMatrActivo} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={dtoMatrActivo ? '#1a472a' : '#f4f3f4'} />
                  <Text style={styles.toggleLabel}>{dtoMatrActivo ? 'Activo' : 'Inactivo'}</Text>
                  {dtoMatrActivo && <TextInput style={styles.inputPct} value={dtoMatrPct} onChangeText={v => setDtoMatrPct(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="%" maxLength={3} />}
                </View>
                {dtoMatrActivo && (
                  <View style={styles.dtoFechas}>
                    <TextInput style={styles.inputFecha} value={dtoMatrInicio} onChangeText={setDtoMatrInicio} placeholder="Desde: AAAA-MM-DD (opcional)" />
                    <TextInput style={styles.inputFecha} value={dtoMatrFin} onChangeText={setDtoMatrFin} placeholder="Hasta: AAAA-MM-DD (vacío = sin límite)" />
                  </View>
                )}
              </View>

              <View style={styles.dtoSection}>
                <Text style={styles.configLabel}>🏷️ Descuento Pago Anual</Text>
                <View style={styles.dtoRow}>
                  <Switch value={dtoAnualActivo} onValueChange={setDtoAnualActivo} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={dtoAnualActivo ? '#1a472a' : '#f4f3f4'} />
                  <Text style={styles.toggleLabel}>{dtoAnualActivo ? 'Activo' : 'Inactivo'}</Text>
                  {dtoAnualActivo && <TextInput style={styles.inputPct} value={dtoAnualPct} onChangeText={v => setDtoAnualPct(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="%" maxLength={3} />}
                </View>
                {dtoAnualActivo && (
                  <View style={styles.dtoFechas}>
                    <TextInput style={styles.inputFecha} value={dtoAnualInicio} onChangeText={setDtoAnualInicio} placeholder="Desde: AAAA-MM-DD (opcional)" />
                    <TextInput style={styles.inputFecha} value={dtoAnualFin} onChangeText={setDtoAnualFin} placeholder="Hasta: AAAA-MM-DD (vacío = sin límite)" />
                  </View>
                )}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelar} onPress={() => setModalConfigVisible(false)}>
                  <Text style={styles.cancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.guardar, guardandoConfig && { opacity: 0.5 }]} onPress={handleGuardarConfig} disabled={guardandoConfig}>
                  {guardandoConfig ? <ActivityIndicator color="#fff" /> : <Text style={styles.guardarText}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  resumenRow: { flexDirection: 'row', padding: 12, gap: 8 },
  resumenCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  resumenNumero: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  resumenNumeroSm: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  resumenLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  configBtn: {
    marginHorizontal: 12,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  configBtnText: { fontSize: 14, color: '#1a472a', fontWeight: '600' },
  configBtnSub: { fontSize: 12, color: '#888', marginTop: 2 },
  filtrosContainer: { flexGrow: 0 },
  filtroChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  filtroChipActivo: { backgroundColor: '#1a472a', borderColor: '#1a472a' },
  filtroText: { fontSize: 13, color: '#555' },
  filtroTextActivo: { color: '#fff', fontWeight: '700' },
  pagoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  pagoHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  pagadorNombre: { fontSize: 15, fontWeight: '700', color: '#222' },
  pagoTipo: { fontSize: 12, color: '#888', marginTop: 2 },
  estadoBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  estadoText: { fontSize: 12, fontWeight: '700' },
  pagoMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  pagoMonto: { fontSize: 18, fontWeight: 'bold', color: '#1a472a' },
  pagoMetodo: { fontSize: 13, color: '#666' },
  pagoRef: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  pagoFecha: { fontSize: 12, color: '#999' },
  accionesRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  accionBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  accionText: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 40, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a472a',
    padding: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  configLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6, marginTop: 14 },
  configHint: { fontSize: 12, color: '#888', marginBottom: 6, fontStyle: 'italic' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 13,
    color: '#555',
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 10 },
  cancelar: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center' },
  cancelarText: { color: '#555', fontWeight: '600' },
  guardar: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1a472a', alignItems: 'center' },
  guardarText: { color: '#fff', fontWeight: '700' },
  // Discount per-item styles
  dtoSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  dtoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  dtoFechas: { gap: 8, marginTop: 4 },
  inputPct: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1a472a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f1f8e9',
    marginLeft: 6,
  },
  inputFecha: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#fafafa',
    color: '#333',
  },
});

export default PagosTab;
