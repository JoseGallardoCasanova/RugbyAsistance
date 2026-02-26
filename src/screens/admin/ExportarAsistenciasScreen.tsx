import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { useClub } from '../../context/ClubContext';
import { Categoria, Jugador, Asistencia } from '../../types/v2';

type RangoTiempo = '3dias' | '1semana' | '1mes' | '3meses';

interface OpcionRango {
  id: RangoTiempo;
  label: string;
  dias: number;
}

const OPCIONES_RANGO: OpcionRango[] = [
  { id: '3dias',   label: 'Últimos 3 días',  dias: 3  },
  { id: '1semana', label: 'Última semana',    dias: 7  },
  { id: '1mes',    label: 'Último mes',       dias: 30 },
  { id: '3meses',  label: 'Últimos 3 meses',  dias: 90 },
];

export default function ExportarAsistenciasScreen({ navigation }: any) {
  const { club } = useClub();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCats, setCargandoCats] = useState(true);
  const [catSeleccionadas, setCatSeleccionadas] = useState<Set<string>>(new Set());
  const [rango, setRango] = useState<RangoTiempo>('1mes');
  const [exportando, setExportando] = useState(false);

  useEffect(() => { cargarCategorias(); }, []);

  const cargarCategorias = async () => {
    if (!club) return;
    setCargandoCats(true);
    try {
      const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);
      setCategorias(cats);
      setCatSeleccionadas(new Set(cats.map(c => c.id)));
    } finally {
      setCargandoCats(false);
    }
  };

  const toggleCategoria = (id: string) => {
    setCatSeleccionadas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodas = () => {
    if (catSeleccionadas.size === categorias.length) {
      setCatSeleccionadas(new Set());
    } else {
      setCatSeleccionadas(new Set(categorias.map(c => c.id)));
    }
  };

  const calcularFechas = (dias: number) => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - dias + 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { inicio: fmt(inicio), fin: fmt(hoy) };
  };

  const generarFechasRango = (inicio: string, fin: string): string[] => {
    const fechas: string[] = [];
    const cur = new Date(inicio + 'T00:00:00');
    const end = new Date(fin + 'T00:00:00');
    while (cur <= end) {
      fechas.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return fechas;
  };

  const fmtHeader = (fecha: string) => {
    const [, mes, dia] = fecha.split('-');
    return `${dia}/${mes}`;
  };

  const handleExportar = async () => {
    if (!club) { Alert.alert('Error', 'No hay club activo'); return; }
    if (catSeleccionadas.size === 0) {
      Alert.alert('Atención', 'Selecciona al menos una categoría');
      return;
    }

    setExportando(true);
    try {
      const opcion = OPCIONES_RANGO.find(o => o.id === rango)!;
      const { inicio, fin } = calcularFechas(opcion.dias);
      const fechasRango = generarFechasRango(inicio, fin);

      const [todasAsistencias, todosJugadores] = await Promise.all([
        SupabaseServiceV2.getAsistenciasPorRango(club.id, inicio, fin),
        SupabaseServiceV2.getJugadoresByClub(club.id),
      ]);

      const wb = XLSX.utils.book_new();
      const catsFiltradas = categorias.filter(c => catSeleccionadas.has(c.id));

      for (const cat of catsFiltradas) {
        const jugadoresCat = todosJugadores
          .filter(j => j.categoriaId === cat.id)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        if (jugadoresCat.length === 0) continue;

        // índice jugadorId → fecha → asistio
        const idx: Record<string, Record<string, boolean>> = {};
        jugadoresCat.forEach(j => { idx[j.id] = {}; });
        todasAsistencias
          .filter(a => a.categoriaId === cat.id)
          .forEach(a => {
            if (idx[a.jugadorId] !== undefined) idx[a.jugadorId][a.fecha] = a.asistio;
          });

        const header = ['Jugador', ...fechasRango.map(fmtHeader), 'Presencias', 'Ausencias', 'Sin reg.', '% Asist.'];

        const rows = jugadoresCat.map(j => {
          let presencias = 0, ausencias = 0, sinReg = 0;
          const celdas = fechasRango.map(f => {
            const val = idx[j.id][f];
            if (val === true)  { presencias++; return '✓'; }
            if (val === false) { ausencias++;  return '✗'; }
            sinReg++;
            return '-';
          });
          const total = presencias + ausencias;
          const pct = total > 0 ? `${Math.round((presencias / total) * 100)}%` : '-';
          return [j.nombre, ...celdas, presencias, ausencias, sinReg, pct];
        });

        const totalesRow: (string | number)[] = ['TOTAL'];
        fechasRango.forEach(f => {
          const presentes = jugadoresCat.filter(j => idx[j.id][f] === true).length;
          const conReg    = jugadoresCat.filter(j => idx[j.id][f] !== undefined).length;
          totalesRow.push(conReg > 0 ? `${presentes}/${conReg}` : '-');
        });
        totalesRow.push('', '', '', '');

        const ws = XLSX.utils.aoa_to_sheet([header, ...rows, [], totalesRow]);
        ws['!cols'] = [
          { wch: 28 },
          ...fechasRango.map(() => ({ wch: 7 })),
          { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
        ];
        const sheetName = cat.nombre.replace(/[\\\/\?\*\[\]:]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      // Hoja resumen si varias categorías
      if (catsFiltradas.length > 1) {
        const resumenHeader = ['Categoría', 'Jugadores', 'Entrenamientos', 'Registros', '% Asistencia'];
        const resumenRows = catsFiltradas.map(cat => {
          const jugadoresCat = todosJugadores.filter(j => j.categoriaId === cat.id);
          const asistCat     = todasAsistencias.filter(a => a.categoriaId === cat.id);
          const presencias   = asistCat.filter(a => a.asistio).length;
          const total        = asistCat.length;
          const pct          = total > 0 ? `${Math.round((presencias / total) * 100)}%` : '-';
          const fechasUnicas = [...new Set(asistCat.map(a => a.fecha))].length;
          return [cat.nombre, jugadoresCat.length, fechasUnicas, total, pct];
        });
        const wsResumen = XLSX.utils.aoa_to_sheet([resumenHeader, ...resumenRows]);
        wsResumen['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN');
      }

      const base64  = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fechaHoy = new Date().toISOString().split('T')[0];
      const fileName = `asistencias_${club.nombre.replace(/\s+/g, '_')}_${fechaHoy}.xlsx`;
      const fileUri  = (FileSystem.documentDirectory ?? '') + fileName;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const puedeCompartir = await Sharing.isAvailableAsync();
      if (puedeCompartir) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Exportar asistencias',
        });
      } else {
        Alert.alert('✅ Archivo generado', `Guardado en:\n${fileUri}`);
      }
    } catch (error: any) {
      console.error('❌ Error exportando:', error);
      Alert.alert('Error', `No se pudo generar el archivo:\n${error.message}`);
    } finally {
      setExportando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>📊 Exportar Asistencias</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Categorías */}
        <Text style={styles.seccionTitulo}>Categorías</Text>
        <Text style={styles.seccionHint}>Selecciona cuáles incluir en el Excel</Text>

        {cargandoCats ? (
          <ActivityIndicator color="#1a472a" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <TouchableOpacity style={styles.toggleTodas} onPress={toggleTodas}>
              <Text style={styles.toggleTodasText}>
                {catSeleccionadas.size === categorias.length
                  ? '☑ Deseleccionar todas'
                  : '☐ Seleccionar todas'}
              </Text>
            </TouchableOpacity>

            <View style={styles.chipsContainer}>
              {categorias.map(cat => {
                const activa = catSeleccionadas.has(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      activa
                        ? { backgroundColor: cat.color || '#1a472a', borderColor: cat.color || '#1a472a' }
                        : styles.chipInactivo,
                    ]}
                    onPress={() => toggleCategoria(cat.id)}
                  >
                    <Text style={[styles.chipText, activa && styles.chipTextActivo]}>
                      {cat.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Rango */}
        <Text style={[styles.seccionTitulo, { marginTop: 28 }]}>Rango de tiempo</Text>
        <View style={styles.rangoGrid}>
          {OPCIONES_RANGO.map(op => (
            <TouchableOpacity
              key={op.id}
              style={[styles.rangoBtn, rango === op.id && styles.rangoBtnActivo]}
              onPress={() => setRango(op.id)}
            >
              <Text style={[styles.rangoBtnText, rango === op.id && styles.rangoBtnTextActivo]}>
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>📋 Formato del Excel</Text>
          <Text style={styles.infoTexto}>
            {'• Una hoja por categoría seleccionada\n'}
            {'• Columnas: Jugador | DD/MM | ... | Presencias | % Asist.\n'}
            {'• ✓ = asistió   ✗ = ausente   - = sin registro\n'}
            {'• Fila de totales por fecha al final'}
            {categorias.length > 1 ? '\n• Hoja RESUMEN global al final' : ''}
          </Text>
        </View>

        {/* Botón exportar */}
        <TouchableOpacity
          style={[
            styles.exportarBtn,
            (exportando || catSeleccionadas.size === 0) && styles.exportarBtnDisabled,
          ]}
          onPress={handleExportar}
          disabled={exportando || catSeleccionadas.size === 0}
        >
          {exportando ? (
            <View style={styles.exportarBtnContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.exportarBtnText}>  Generando Excel...</Text>
            </View>
          ) : (
            <Text style={styles.exportarBtnText}>
              📥 Exportar Excel ({catSeleccionadas.size}{' '}
              {catSeleccionadas.size === 1 ? 'categoría' : 'categorías'})
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#1a472a',
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  backBtn:  { marginBottom: 8 },
  backText: { color: '#fff', fontSize: 16 },
  titulo:   { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  scroll:   { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  seccionTitulo: { fontSize: 17, fontWeight: 'bold', color: '#1a472a', marginBottom: 4 },
  seccionHint:   { fontSize: 13, color: '#666', marginBottom: 12 },

  toggleTodas:     { marginBottom: 12 },
  toggleTodasText: { fontSize: 14, color: '#1a472a', fontWeight: '600' },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipInactivo:    { borderColor: '#ccc', backgroundColor: '#fff' },
  chipText:        { fontSize: 14, fontWeight: '600', color: '#555' },
  chipTextActivo:  { color: '#fff' },

  rangoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  rangoBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  rangoBtnActivo:      { borderColor: '#1a472a', backgroundColor: '#e8f5e9' },
  rangoBtnText:        { fontSize: 14, fontWeight: '600', color: '#555', textAlign: 'center' },
  rangoBtnTextActivo:  { color: '#1a472a' },

  infoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 15,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1a472a',
  },
  infoTitulo: { fontSize: 15, fontWeight: '600', color: '#1a472a', marginBottom: 8 },
  infoTexto:  { fontSize: 13, color: '#333', lineHeight: 21 },

  exportarBtn: {
    backgroundColor: '#1a472a',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 28,
  },
  exportarBtnDisabled:  { opacity: 0.5 },
  exportarBtnContent:   { flexDirection: 'row', alignItems: 'center' },
  exportarBtnText:      { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
