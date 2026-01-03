import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import SupabaseService from '../../services/SupabaseService';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type RangoTiempo = '3dias' | '1semana' | '1mes' | '3meses';

interface OpcionRango {
  id: RangoTiempo;
  titulo: string;
  dias: number;
}

const OPCIONES_RANGO: OpcionRango[] = [
  { id: '3dias', titulo: 'Últimos 3 días', dias: 3 },
  { id: '1semana', titulo: 'Última semana', dias: 7 },
  { id: '1mes', titulo: 'Último mes', dias: 30 },
  { id: '3meses', titulo: 'Últimos 3 meses', dias: 90 },
];

export default function ModalExportarAsistencias({ visible, onClose }: Props) {
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoTiempo | null>(null);
  const [cargando, setCargando] = useState(false);

  const calcularFechas = (dias: number): { inicio: string; fin: string } => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - dias);

    const formatearFecha = (fecha: Date) => {
      return fecha.toISOString().split('T')[0];
    };

    return {
      inicio: formatearFecha(inicio),
      fin: formatearFecha(hoy),
    };
  };

  const generarReporte = async (rango: OpcionRango) => {
    setCargando(true);
    setRangoSeleccionado(rango.id);

    try {
      const { inicio, fin } = calcularFechas(rango.dias);
      console.log(`📊 Generando reporte desde ${inicio} hasta ${fin}`);

      const datos = await SupabaseService.obtenerAsistenciasPorRango(inicio, fin);

      if (!datos) {
        Alert.alert('Error', 'No se pudieron obtener los datos de asistencia');
        return;
      }

      const { asistencias, jugadores, categorias } = datos;

      if (asistencias.length === 0) {
        Alert.alert(
          'Sin datos',
          `No hay asistencias registradas en ${rango.titulo.toLowerCase()}`
        );
        return;
      }

      // Por ahora solo mostramos resumen
      const resumen = `
📊 REPORTE DE ASISTENCIAS

📅 Período: ${inicio} al ${fin}
📋 Categorías: ${categorias.length}
👥 Jugadores: ${jugadores.length}
✅ Asistencias registradas: ${asistencias.length}

La funcionalidad de exportación a Excel estará lista pronto.
Por ahora puedes revisar estos datos en Supabase.
      `.trim();

      Alert.alert('📊 Resumen Generado', resumen);
      
    } catch (error: any) {
      console.error('❌ Error al generar reporte:', error);
      Alert.alert('Error', `No se pudo generar el reporte: ${error.message}`);
    } finally {
      setCargando(false);
      setRangoSeleccionado(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.backButton}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>📊 Exportar Asistencias</Text>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.subtitulo}>
            Selecciona el rango de tiempo para generar el informe:
          </Text>

          {OPCIONES_RANGO.map((opcion) => (
            <TouchableOpacity
              key={opcion.id}
              style={[
                styles.opcionCard,
                rangoSeleccionado === opcion.id && styles.opcionSeleccionada,
              ]}
              onPress={() => generarReporte(opcion)}
              disabled={cargando}
            >
              <View style={styles.opcionContent}>
                <Text style={styles.opcionTitulo}>{opcion.titulo}</Text>
                <Text style={styles.opcionSubtitulo}>({opcion.dias} días)</Text>
              </View>
              {cargando && rangoSeleccionado === opcion.id ? (
                <ActivityIndicator color="#1a472a" />
              ) : (
                <Text style={styles.opcionFlecha}>→</Text>
              )}
            </TouchableOpacity>
          ))}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitulo}>ℹ️ Próximamente</Text>
            <Text style={styles.infoTexto}>
              La exportación a Excel se está implementando.{'\n\n'}
              Por ahora puedes ver un resumen de las asistencias y acceder a los datos completos en Supabase.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a472a',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitulo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 22,
  },
  opcionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  opcionSeleccionada: {
    borderColor: '#1a472a',
    backgroundColor: '#f0f7f4',
  },
  opcionContent: {
    flex: 1,
  },
  opcionTitulo: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a472a',
    marginBottom: 4,
  },
  opcionSubtitulo: {
    fontSize: 14,
    color: '#666',
  },
  opcionFlecha: {
    fontSize: 24,
    color: '#1a472a',
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  infoTexto: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});
