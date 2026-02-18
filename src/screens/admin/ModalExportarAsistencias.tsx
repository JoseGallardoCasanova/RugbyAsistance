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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { useClub } from '../../context/ClubContext';

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
  const { clubActual } = useClub();
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
      if (!clubActual?.id) {
        Alert.alert('Error', 'No se pudo identificar el club');
        return;
      }

      const { inicio, fin } = calcularFechas(rango.dias);
      console.log(`📊 [V2] Generando reporte desde ${inicio} hasta ${fin}`);

      // Obtener datos por separado en V2
      const asistencias = await SupabaseServiceV2.getAsistenciasPorRango(clubActual.id, inicio, fin);
      const jugadores = await SupabaseServiceV2.getJugadoresByClub(clubActual.id);
      const categorias = await SupabaseServiceV2.getCategoriasByClub(clubActual.id);

      if (asistencias.length === 0) {
        Alert.alert(
          'Sin datos',
          `No hay asistencias registradas en ${rango.titulo.toLowerCase()}`
        );
        return;
      }

      // Generar Excel
      await generarExcel(asistencias, jugadores, categorias, inicio, fin, rango.titulo);
      
      Alert.alert('✅ Excel Generado', 'El archivo se ha exportado correctamente');
      onClose();
      
    } catch (error: any) {
      console.error('❌ Error al generar reporte:', error);
      Alert.alert('Error', `No se pudo generar el reporte: ${error.message}`);
    } finally {
      setCargando(false);
      setRangoSeleccionado(null);
    }
  };

  const generarExcel = async (
    asistencias: any[],
    jugadores: any[],
    categorias: any[],
    fechaInicio: string,
    fechaFin: string,
    rangoTitulo: string
  ) => {
    // Obtener todas las fechas únicas ordenadas
    const fechasUnicas = [...new Set(asistencias.map(a => a.fecha))].sort();

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // Crear UNA sola hoja con todas las categorías
    const data: any[][] = [];

    // Header principal
    const header = ['Jugador', 'Categoría', ...fechasUnicas.map(f => formatearFechaCorta(f)), 'Total', '%'];
    data.push(header);

    // Ordenar categorías por orden (V2 usa 'orden' en lugar de 'numero')
    const categoriasOrdenadas = [...categorias].sort((a, b) => a.orden - b.orden);

    // Procesar cada categoría
    categoriasOrdenadas.forEach(categoria => {
      const jugadoresCategoria = jugadores
        .filter(j => j.categoriaId === categoria.id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      if (jugadoresCategoria.length === 0) return;

      // Agregar fila de separación con nombre de categoría
      data.push([`📋 ${categoria.nombre}`, '', ...fechasUnicas.map(() => ''), '', '']);

      // Filas de jugadores de esta categoría
      jugadoresCategoria.forEach(jugador => {
        const fila: any[] = [jugador.nombre, categoria.nombre];

        let totalPresentes = 0;
        let totalRegistros = 0;

        // Para cada fecha, buscar asistencia (V2 usa jugadorId en lugar de rut_jugador)
        fechasUnicas.forEach(fecha => {
          const asistencia = asistencias.find(
            a => a.jugadorId === jugador.id && a.fecha === fecha
          );

          if (asistencia) {
            totalRegistros++;
            if (asistencia.asistio) {
              fila.push('✓');
              totalPresentes++;
            } else {
              fila.push('✗');
            }
          } else {
            fila.push('-');
          }
        });

        // Total y porcentaje
        fila.push(totalPresentes);
        const porcentaje = totalRegistros > 0 ? Math.round((totalPresentes / totalRegistros) * 100) : 0;
        fila.push(`${porcentaje}%`);

        data.push(fila);
      });

      // Fila vacía entre categorías para mejor legibilidad
      data.push(['', '', ...fechasUnicas.map(() => ''), '', '']);
    });

    // Crear sheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Ajustar anchos de columna
    const columnWidths = [
      { wch: 25 }, // Jugador
      { wch: 15 }, // Categoría
      ...fechasUnicas.map(() => ({ wch: 10 })), // Fechas
      { wch: 8 },  // Total
      { wch: 8 }   // %
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar sheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');

    // Convertir a base64
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // Guardar archivo
    const filename = `Asistencias_${rangoTitulo.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Compartir archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar Asistencias',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      Alert.alert('Error', 'No se puede compartir archivos en este dispositivo');
    }
  };

  const formatearFechaCorta = (fechaISO: string): string => {
    const [año, mes, dia] = fechaISO.split('-');
    return `${dia}/${mes}`;
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
            <Text style={styles.infoTitulo}>ℹ️ Formato del Excel</Text>
            <Text style={styles.infoTexto}>
              El archivo Excel contendrá:{'\n\n'}
              • Todas las categorías en una sola hoja{'\n'}
              • Columnas: Jugador | Categoría | Fechas | Total | %{'\n'}
              • Agrupado por categoría{'\n'}
              • Fechas en columnas{'\n'}
              • ✓ = Presente | ✗ = Ausente | - = Sin registro{'\n'}
              • Total de asistencias y porcentaje
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
