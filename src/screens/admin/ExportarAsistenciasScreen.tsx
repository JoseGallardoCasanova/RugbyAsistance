import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
// import * as XLSX from 'xlsx';
// import { Paths, File } from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
import SupabaseService from '../../services/SupabaseService';
import { Colors } from '../../config/theme';
import { usePreferences } from '../../context/PreferencesContext';

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

export default function ExportarAsistenciasScreen({ navigation }: any) {
  const { currentColors, fontSizes } = usePreferences();
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoTiempo | null>(null);
  const [cargando, setCargando] = useState(false);

  const calcularFechas = (dias: number): { inicio: string; fin: string } => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - dias);

    // Formato: YYYY-MM-DD
    const formatearFecha = (fecha: Date) => {
      return fecha.toISOString().split('T')[0];
    };

    return {
      inicio: formatearFecha(inicio),
      fin: formatearFecha(hoy),
    };
  };

  const generarExcel = async (rango: OpcionRango) => {
    setCargando(true);
    setRangoSeleccionado(rango.id);

    try {
      Alert.alert('🚧 En desarrollo', 'La funcionalidad de exportación se está implementando. Estamos trabajando en resolver un problema de compatibilidad con las librerías.');
    } catch (error: any) {
      console.error('❌ Error:', error);
      Alert.alert('Error', `Ocurrió un error: ${error.message}`);
    } finally {
      setCargando(false);
      setRangoSeleccionado(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>📊 Exportar Asistencias</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitulo}>
          Selecciona el rango de tiempo para generar el informe en Excel:
        </Text>

        {OPCIONES_RANGO.map((opcion) => (
          <TouchableOpacity
            key={opcion.id}
            style={[
              styles.opcionCard,
              rangoSeleccionado === opcion.id && styles.opcionSeleccionada,
            ]}
            onPress={() => generarExcel(opcion)}
            disabled={cargando}
          >
            <View style={styles.opcionContent}>
              <Text style={styles.opcionTitulo}>{opcion.titulo}</Text>
              <Text style={styles.opcionSubtitulo}>({opcion.dias} días)</Text>
            </View>
            {cargando && rangoSeleccionado === opcion.id ? (
              <ActivityIndicator color={currentColors.primary} />
            ) : (
              <Text style={styles.opcionFlecha}>→</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Información */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>📋 Formato del Excel:</Text>
          <Text style={styles.infoTexto}>
            • Organizado por categorías{'\n'}
            • Muestra asistencias día a día{'\n'}
            • Incluye totales y porcentajes{'\n'}
            • Fechas en formato día/mes{'\n'}
            • Resumen general al final
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>💡 Cómo leer el Excel:</Text>
          <Text style={styles.infoTexto}>
            ✓ = Asistió al entrenamiento{'\n'}
            ✗ = No asistió{'\n'}
            - = Sin registro para ese día
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb', // Colors.primary
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
    borderColor: '#2563eb', // Colors.primary
    backgroundColor: '#f0f7f4',
  },
  opcionContent: {
    flex: 1,
  },
  opcionTitulo: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb', // Colors.primary
    marginBottom: 4,
  },
  opcionSubtitulo: {
    fontSize: 14,
    color: '#666',
  },
  opcionFlecha: {
    fontSize: 24,
    color: '#2563eb', // Colors.primary
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb', // Colors.primary
  },
  infoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb', // Colors.primary
    marginBottom: 8,
  },
  infoTexto: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
