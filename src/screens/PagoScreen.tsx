import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { ConfiguracionPagosClub, Jugador, Pago } from '../types/v2';

interface PagoScreenProps {
  navigation: any;
  route: any;
}

type TipoPago = 'mensualidad' | 'matricula' | 'anual';
type MetodoPago = 'tarjeta' | 'transferencia' | 'efectivo';

const METODOS: { key: MetodoPago; label: string; icon: string }[] = [
  { key: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { key: 'transferencia', label: 'Transferencia', icon: '🏦' },
  { key: 'efectivo', label: 'Efectivo', icon: '💵' },
];

const TIPOS: { key: TipoPago; label: string; icon: string }[] = [
  { key: 'mensualidad', label: 'Mensualidad', icon: '📅' },
  { key: 'matricula', label: 'Matrícula', icon: '📝' },
  { key: 'anual', label: 'Pago Anual', icon: '🗓️' },
];

const PagoScreen: React.FC<PagoScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { club } = useClub();

  // Params: jugadorIds (array) y opcionalmente tipo prefijado
  const jugadorIds: string[] = route?.params?.jugadorIds ?? [];
  const tipoInicial: TipoPago = route?.params?.tipo ?? 'mensualidad';

  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [config, setConfig] = useState<ConfiguracionPagosClub | null>(null);
  const [tipo, setTipo] = useState<TipoPago>(tipoInicial);
  const [metodo, setMetodo] = useState<MetodoPago>('transferencia');
  const [montoStr, setMontoStr] = useState('');
  const [detalle, setDetalle] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [comprobante, setComprobante] = useState<Pago | null>(null);

  // Tipos de pago disponibles según configuración del club
  const tiposDisponibles = React.useMemo(() => {
    if (!config) return TIPOS;
    return TIPOS.filter(t => {
      if (t.key === 'mensualidad') return config.mensualidadActiva !== false;
      if (t.key === 'matricula')   return config.matriculaActiva !== false;
      if (t.key === 'anual')       return config.anualActivo === true;
      return true;
    });
  }, [config]);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Auto-seleccionar primer tipo disponible si el actual ya no está activo
  useEffect(() => {
    if (!config) return;
    const disponibles = TIPOS.filter(t => {
      if (t.key === 'mensualidad') return config.mensualidadActiva !== false;
      if (t.key === 'matricula')   return config.matriculaActiva !== false;
      if (t.key === 'anual')       return config.anualActivo === true;
      return true;
    });
    if (disponibles.length > 0 && !disponibles.find(t => t.key === tipo)) {
      setTipo(disponibles[0].key);
    }
  }, [config]);

  // Helper: comprueba si el descuento de un item está vigente hoy según sus fechas
  const getDescuentoItem = React.useCallback((pct: number, activo: boolean, inicio?: string, fin?: string): number => {
    if (!activo || !pct) return 0;
    const hoy = new Date().toISOString().slice(0, 10);
    if (inicio && hoy < inicio) return 0;
    if (fin && hoy > fin) return 0;
    return pct;
  }, []);

  // Descuento del tipo de pago seleccionado (si está activo y dentro de su rango)
  const descuentoGlobalTipo = React.useMemo(() => {
    if (!config) return 0;
    if (tipo === 'mensualidad') return getDescuentoItem(config.descuentoMensualidad, config.descuentoMensualidadActivo, config.descuentoMensualidadInicio, config.descuentoMensualidadFin);
    if (tipo === 'matricula') return getDescuentoItem(config.descuentoMatricula, config.descuentoMatriculaActivo, config.descuentoMatriculaInicio, config.descuentoMatriculaFin);
    if (tipo === 'anual') return getDescuentoItem(config.descuentoAnual, config.descuentoAnualActivo, config.descuentoAnualInicio, config.descuentoAnualFin);
    return 0;
  }, [config, tipo, getDescuentoItem]);

  // Descuento efectivo: 1 jugador = max(tipo, personal); varios = solo tipo
  const descuentoEfectivo = React.useMemo(() => {
    if (jugadores.length === 1) {
      return Math.max(descuentoGlobalTipo, jugadores[0].descuentoPersonal ?? 0);
    }
    return descuentoGlobalTipo;
  }, [descuentoGlobalTipo, jugadores]);

  // Actualizar monto sugerido cuando cambia tipo, config, jugadores o descuento
  useEffect(() => {
    if (!config) return;
    const base =
      tipo === 'mensualidad' ? config.precioMensualidad :
      tipo === 'matricula' ? config.precioMatricula :
      tipo === 'anual' ? config.precioAnual : undefined;
    if (!base) return;
    const total = base * (jugadores.length || 1);
    const conDescuento = descuentoEfectivo > 0
      ? Math.round(total * (1 - descuentoEfectivo / 100))
      : total;
    setMontoStr(String(conDescuento));
  }, [tipo, config, jugadores, descuentoEfectivo]);

  const cargarDatos = async () => {
    if (!club) return;
    try {
      setCargando(true);
      const [cfg, ...jugs] = await Promise.all([
        SupabaseServiceV2.getConfigPagosByClub(club.id),
        ...jugadorIds.map(id => SupabaseServiceV2.getJugadorById(id)),
      ]);
      setConfig(cfg as ConfiguracionPagosClub | null);
      setJugadores((jugs as (Jugador | null)[]).filter(Boolean) as Jugador[]);
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!club || !user) return;
    const monto = parseFloat(montoStr.replace(/\./g, '').replace(',', '.'));
    if (!montoStr || isNaN(monto) || monto <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido.');
      return;
    }
    if (jugadores.length === 0) {
      Alert.alert('Error', 'No hay jugadores seleccionados.');
      return;
    }

    setProcesando(true);
    try {
      // Número de referencia simulado
      const refNum = `SIM-${Date.now().toString(36).toUpperCase()}`;

      const pago = await SupabaseServiceV2.crearPago({
        clubId: club.id,
        pagadorId: user.id,
        beneficiarios: jugadores.map(j => j.id),
        tipo,
        monto,
        moneda: config?.moneda ?? 'CLP',
        estado: 'pendiente',
        proveedorPago: 'simulado',
        transactionId: refNum,
        paymentMethod: metodo,
        metadataPago: { detalle, simulado: true, referencia: refNum },
      });

      if (!pago) throw new Error('No se pudo crear el pago.');
      setComprobante(pago);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo procesar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  const formatMonto = (n: number) =>
    n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

  // ─── Comprobante ────────────────────────────────────────────────────────────
  if (comprobante) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comprobante</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.comprobanteContent}>
          <View style={styles.comprobanteCard}>
            <Text style={styles.comprobanteEmoji}>✅</Text>
            <Text style={styles.comprobanteTitulo}>¡Solicitud enviada!</Text>
            <Text style={styles.comprobanteSubtitulo}>
              Tu pago está en estado <Text style={styles.estadoBadge}>Pendiente</Text> hasta que el administrador lo confirme.
            </Text>

            <View style={styles.separador} />

            <View style={styles.comprobanteRow}>
              <Text style={styles.comprobanteLabel}>N° referencia</Text>
              <Text style={styles.comprobanteValor}>{comprobante.transactionId}</Text>
            </View>
            <View style={styles.comprobanteRow}>
              <Text style={styles.comprobanteLabel}>Concepto</Text>
              <Text style={styles.comprobanteValor}>{TIPOS.find(t => t.key === comprobante.tipo)?.label}</Text>
            </View>
            <View style={styles.comprobanteRow}>
              <Text style={styles.comprobanteLabel}>Monto</Text>
              <Text style={[styles.comprobanteValor, { color: '#1a472a', fontWeight: 'bold' }]}>
                {formatMonto(comprobante.monto)}
              </Text>
            </View>
            <View style={styles.comprobanteRow}>
              <Text style={styles.comprobanteLabel}>Método</Text>
              <Text style={styles.comprobanteValor}>
                {METODOS.find(m => m.key === comprobante.paymentMethod)?.icon}{' '}
                {METODOS.find(m => m.key === comprobante.paymentMethod)?.label}
              </Text>
            </View>
            <View style={styles.comprobanteRow}>
              <Text style={styles.comprobanteLabel}>Jugador(es)</Text>
              <Text style={styles.comprobanteValor}>{jugadores.map(j => j.nombre).join(', ')}</Text>
            </View>
            <View style={styles.comprobanteRow}>
              <Text style={styles.comprobanteLabel}>Fecha</Text>
              <Text style={styles.comprobanteValor}>{new Date().toLocaleDateString('es-CL')}</Text>
            </View>

            <View style={styles.separador} />
            <Text style={styles.comprobanteNota}>
              ⏳ El administrador del club recibirá esta solicitud y confirmará el pago. Te notificaremos cuando sea procesado.
            </Text>
          </View>

          <TouchableOpacity style={styles.volverBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.volverBtnText}>Volver al Portal</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Formulario ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Realizar Pago</Text>
        <View style={{ width: 40 }} />
      </View>

      {cargando ? (
        <ActivityIndicator color="#1a472a" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.formContent}>
          {/* Jugadores */}
          <Text style={styles.seccion}>👥 Jugadores</Text>
          {jugadores.length === 0 ? (
            <Text style={styles.sinDatos}>No se encontraron jugadores.</Text>
          ) : (
            jugadores.map(j => (
              <View key={j.id} style={styles.jugadorChip}>
                <Text style={styles.jugadorChipText}>🏉 {j.nombre}</Text>
              </View>
            ))
          )}

          {/* Tipo de pago */}
          <Text style={styles.seccion}>📂 Tipo de pago</Text>
          {tiposDisponibles.length === 0 ? (
            <Text style={styles.sinDatos}>No hay modalidades de pago activas en este club.</Text>
          ) : (
            <View style={styles.chipRow}>
              {tiposDisponibles.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.chip, tipo === t.key && styles.chipActivo]}
                  onPress={() => setTipo(t.key)}
                >
                  <Text style={[styles.chipText, tipo === t.key && styles.chipTextoActivo]}>
                    {t.icon} {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Monto */}
          <Text style={styles.seccion}>💰 Monto (CLP)</Text>
          <TextInput
            style={styles.input}
            value={montoStr}
            onChangeText={setMontoStr}
            keyboardType="numeric"
            placeholder="Ej: 15000"
          />
          {config && (
            <Text style={styles.hint}>
              Precio base:{' '}
              {tipo === 'mensualidad' && config.precioMensualidad ? formatMonto(config.precioMensualidad) :
               tipo === 'matricula' && config.precioMatricula ? formatMonto(config.precioMatricula) :
               tipo === 'anual' && config.precioAnual ? formatMonto(config.precioAnual) :
               'No configurado'}
              {jugadores.length > 1 ? ` × ${jugadores.length} jugadores` : ''}
            </Text>
          )}
          {descuentoEfectivo > 0 && (
            <View style={styles.descuentoTag}>
              <Text style={styles.descuentoTagText}>
                🏷️ Descuento especial aplicado: {descuentoEfectivo}%
                {jugadores.length === 1 && (jugadores[0].descuentoPersonal ?? 0) > descuentoGlobalTipo
                  ? ' (personal)' : ' (descuento especial del club)'}
              </Text>
            </View>
          )}

          {/* Método de pago */}
          <Text style={styles.seccion}>💳 Método de pago</Text>
          <View style={styles.chipRow}>
            {METODOS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.metodoCard, metodo === m.key && styles.metodoCardActivo]}
                onPress={() => setMetodo(m.key)}
              >
                <Text style={styles.metodoIcon}>{m.icon}</Text>
                <Text style={[styles.metodoLabel, metodo === m.key && styles.metodoLabelActivo]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Detalle opcional */}
          <Text style={styles.seccion}>📝 Notas (opcional)</Text>
          <TextInput
            style={[styles.input, { height: 70 }]}
            value={detalle}
            onChangeText={setDetalle}
            placeholder="Ej: Mensualidad febrero 2026"
            multiline
          />

          {/* Aviso simulación */}
          <View style={styles.avisoBox}>
            <Text style={styles.avisoText}>
              🧪 <Text style={{ fontWeight: 'bold' }}>Modo simulación:</Text> Este pago quedará registrado como "Pendiente" y el administrador deberá confirmarlo manualmente. No se realizará ningún cobro real.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmarBtn, (procesando || jugadores.length === 0) && styles.btnDisabled]}
            onPress={handleConfirmar}
            disabled={procesando || jugadores.length === 0}
          >
            {procesando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmarBtnText}>💳 Confirmar Pago</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a472a',
    padding: 16,
    paddingTop: 20,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  formContent: { padding: 16, paddingBottom: 40 },
  seccion: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  jugadorChip: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  jugadorChipText: { fontSize: 15, color: '#1a472a', fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  chipActivo: { borderColor: '#1a472a', backgroundColor: '#e8f5e9' },
  chipText: { fontSize: 14, color: '#666' },
  chipTextoActivo: { color: '#1a472a', fontWeight: '700' },
  metodoCard: {
    flex: 1,
    minWidth: 90,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginHorizontal: 4,
  },
  metodoCardActivo: { borderColor: '#1a472a', backgroundColor: '#e8f5e9' },
  metodoIcon: { fontSize: 26, marginBottom: 4 },
  metodoLabel: { fontSize: 13, color: '#666' },
  metodoLabelActivo: { color: '#1a472a', fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  descuentoTag: {
    marginTop: 8, backgroundColor: '#fff3e0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderLeftWidth: 3, borderLeftColor: '#e65100',
  },
  descuentoTagText: { fontSize: 13, color: '#e65100', fontWeight: '600' },
  avisoBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f9a825',
  },
  avisoText: { fontSize: 13, color: '#665c00', lineHeight: 19 },
  confirmarBtn: {
    marginTop: 24,
    backgroundColor: '#1a472a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmarBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
  sinDatos: { color: '#999', fontStyle: 'italic' },

  // Comprobante
  comprobanteContent: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  comprobanteCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  comprobanteEmoji: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  comprobanteTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a472a', textAlign: 'center' },
  comprobanteSubtitulo: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  estadoBadge: { color: '#f9a825', fontWeight: 'bold' },
  separador: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  comprobanteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  comprobanteLabel: { fontSize: 14, color: '#888' },
  comprobanteValor: { fontSize: 14, color: '#333', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 12 },
  comprobanteNota: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 19, marginTop: 4 },
  volverBtn: {
    marginTop: 20,
    backgroundColor: '#1a472a',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  volverBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  comprobanteSubtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 6 },
  comprobanteTitulo: { fontSize: 22, fontWeight: 'bold', color: '#1a472a', textAlign: 'center' },
});

export default PagoScreen;
