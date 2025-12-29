import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsistenciaCategoria } from '../types';
import DatabaseService from './DatabaseService';

// CONFIGURACIÓN
const STORAGE_KEY = 'google_sheets_config';

interface SheetsConfig {
  scriptUrl: string; // URL para ASISTENCIAS (spreadsheet público)
  scriptUrlBD: string; // URL para BASE DE DATOS (spreadsheet privado)
  sheetName?: string; // Nombre de hoja (opcional - modo automático si vacío)
}

class GoogleSheetsService {
  private config: SheetsConfig | null = null;

  async loadConfig(): Promise<boolean> {
    try {
      const configJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (configJson) {
        this.config = JSON.parse(configJson);
        console.log('📊 Configuración de Google Sheets cargada');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al cargar config de Sheets:', error);
      return false;
    }
  }

  async saveConfig(config: SheetsConfig): Promise<void> {
    this.config = config;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log('💾 Configuración de Google Sheets guardada');
  }

  async enviarAsistencia(asistencia: AsistenciaCategoria): Promise<boolean> {
    try {
      // Cargar config si existe
      await this.loadConfig();

      // ✅ ARREGLADO: Obtener mes y año correctamente
      const fechaObj = new Date(asistencia.fecha);
      const mesActual = this.getNombreMes(fechaObj.getMonth());
      const añoActual = fechaObj.getFullYear();
      const sheetNameAuto = `${mesActual}_${añoActual}`;

      console.log(`📅 Fecha: ${asistencia.fecha} → Mes detectado: ${sheetNameAuto}`);

      // Si no hay config, mostrar error amigable
      if (!this.config || !this.config.scriptUrl) {
        console.error('❌ No hay configuración de Google Sheets');
        console.log('💡 Ve a Configuración (admin) y agrega la URL del script de asistencias');
        return false;
      }

      console.log('📤 Enviando asistencia a Google Sheets:', {
        categoria: asistencia.categoria,
        fecha: asistencia.fecha,
        totalJugadores: asistencia.jugadores.length,
      });

      // Obtener el día del mes
      const dia = this.getDiaDelMes(asistencia.fecha);
      
      // ✅ OBTENER JUGADORES DE LA BASE DE DATOS REAL
      const jugadoresBD = await DatabaseService.obtenerJugadores();
      const jugadoresActivos = jugadoresBD.filter(j => j.activo !== false);
      
      console.log(`📥 Jugadores de BD: ${jugadoresActivos.length}`);
      
      // Preparar actualizaciones con FECHAS en lugar de SÍ/NO
      const updates = this.prepararActualizaciones(
        asistencia.categoria,
        asistencia.jugadores,
        dia,
        asistencia.fecha,
        jugadoresActivos // ✅ Pasar jugadores reales
      );

      // Usar el sheetName de config si existe, sino usar el automático
      const sheetNameFinal = this.config.sheetName || sheetNameAuto;

      console.log(`📊 Usando sheet: ${sheetNameFinal} (${this.config.sheetName ? 'manual' : 'automático'})`);

      // Enviar al Google Apps Script de ASISTENCIAS (scriptUrl)
      const response = await axios.post(this.config.scriptUrl, {
        sheetName: sheetNameFinal,
        autoCreate: true, // SIEMPRE crear automáticamente si no existe
        mes: mesActual,
        año: añoActual,
        jugadores: jugadoresActivos, // ✅ Enviar jugadores reales
        updates: updates
      });

      if (response.data.success) {
        console.log('✅ Asistencia enviada correctamente');
        if (response.data.autoCreated) {
          console.log('🎉 Sheet creado automáticamente!');
        }
        return true;
      } else {
        console.error('❌ Error en script:', response.data.error);
        return false;
      }

    } catch (error: any) {
      console.error('❌ Error al enviar asistencia:', error.response?.data || error.message);
      return false;
    }
  }

  private getDiaDelMes(fecha: string): number {
    const date = new Date(fecha);
    return date.getDate();
  }

  private getNombreMes(mesNumero: number): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mesNumero];
  }

  private prepararActualizaciones(
    categoria: number,
    jugadoresAsistencia: { rut: string; asistio: boolean }[],
    dia: number,
    fecha: string,
    jugadoresBD: any[] // ✅ Recibir jugadores de BD
  ): any[] {
    // ✅ Filtrar jugadores de la categoría desde BD
    const jugadoresCategoria = jugadoresBD.filter(j => j.categoria === categoria);
    
    console.log(`📋 Jugadores en categoría ${categoria}: ${jugadoresCategoria.length}`);
    
    const updates: any[] = [];
    
    // Convertir fecha a formato dd/mm/aaaa
    const fechaObj = new Date(fecha);
    const fechaFormateada = `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}/${fechaObj.getFullYear()}`;
    
    jugadoresCategoria.forEach((jugador, index) => {
      const asistenciaJugador = jugadoresAsistencia.find(a => a.rut === jugador.rut);
      const asistio = asistenciaJugador?.asistio || false;
      
      // Si asistió: fecha con fondo verde
      // Si no asistió: "AUSENTE" con fondo rojo
      const valor = asistio ? fechaFormateada : 'AUSENTE';
      const color = asistio ? '#d4edda' : '#f8d7da'; // Verde pálido : Rojo pálido
      
      // Calcular fila y columna
      const fila = this.getFilaParaJugador(categoria, index);
      const columna = this.getColumnaParaDia(dia);
      const range = `${columna}${fila}`;
      
      console.log(`📍 Jugador: ${jugador.nombre}, Día: ${dia}, Range: ${range}, Valor: ${valor}`);
      
      updates.push({
        range: range,
        value: valor,
        backgroundColor: color,
        fontColor: asistio ? '#155724' : '#721c24' // Verde oscuro : Rojo oscuro
      });
    });

    console.log('📦 Total de actualizaciones preparadas:', updates.length);
    return updates;
  }

  private getFilaParaJugador(categoria: number, indexEnCategoria: number): number {
    const jugadoresPorCategoria = 10;
    const filasExtraPorCategoria = 2;
    const offset = 2 + (categoria - 1) * (jugadoresPorCategoria + filasExtraPorCategoria);
    return offset + 1 + indexEnCategoria + 1;
  }

  private getColumnaParaDia(dia: number): string {
    const columnIndex = dia + 1;
    let columnLetter = '';
    let temp = columnIndex;
    
    while (temp > 0) {
      temp--;
      columnLetter = String.fromCharCode(65 + (temp % 26)) + columnLetter;
      temp = Math.floor(temp / 26);
    }
    
    console.log(`📍 Día ${dia} → Columna ${columnLetter} (índice ${columnIndex})`);
    return columnLetter;
  }

  async inicializarSheet(mes: string, año: number): Promise<boolean> {
    if (!this.config || !this.config.scriptUrl) {
      console.error('❌ No hay configuración de Google Sheets');
      return false;
    }

    try {
      console.log(`📊 Inicializando sheet para ${mes} ${año}`);

      // ✅ OBTENER JUGADORES DE LA BASE DE DATOS REAL
      const jugadoresBD = await DatabaseService.obtenerJugadores();
      const jugadoresActivos = jugadoresBD.filter(j => j.activo !== false);

      console.log(`📥 Jugadores de BD para inicializar: ${jugadoresActivos.length}`);

      // Enviar solicitud de inicialización al script de ASISTENCIAS
      const response = await axios.post(this.config.scriptUrl, {
        action: 'inicializar',
        sheetName: this.config.sheetName || `${mes}_${año}`,
        mes: mes,
        año: año,
        jugadores: jugadoresActivos // ✅ Enviar jugadores reales
      });

      if (response.data.success) {
        console.log('✅ Sheet inicializado correctamente');
        return true;
      } else {
        console.error('❌ Error al inicializar:', response.data.error);
        return false;
      }

    } catch (error: any) {
      console.error('❌ Error al inicializar sheet:', error.response?.data || error.message);
      return false;
    }
  }

  async obtenerAsistenciaDelDia(
    categoria: number,
    fecha: string
  ): Promise<{ [rut: string]: boolean } | null> {
    try {
      await this.loadConfig();

      if (!this.config || !this.config.scriptUrl) {
        console.log('⚠️ No hay configuración de Google Sheets');
        return null;
      }

      // Obtener mes y año
      const fechaObj = new Date(fecha);
      const mesActual = this.getNombreMes(fechaObj.getMonth());
      const añoActual = fechaObj.getFullYear();
      const sheetNameAuto = `${mesActual}_${añoActual}`;
      const sheetNameFinal = this.config.sheetName || sheetNameAuto;
      const dia = this.getDiaDelMes(fecha);

      console.log(`📥 Obteniendo asistencia del día ${dia} de ${sheetNameFinal}, categoría ${categoria}`);

      // Llamar al script de ASISTENCIAS para obtener datos
      const response = await axios.post(this.config.scriptUrl, {
        action: 'obtenerAsistencia',
        sheetName: sheetNameFinal,
        categoria: categoria,
        dia: dia,
      });

      if (response.data.success && response.data.asistencias) {
        console.log('✅ Asistencias obtenidas:', response.data.asistencias.length);
        
        // Convertir array a objeto { rut: asistio }
        const asistenciasObj: { [rut: string]: boolean } = {};
        response.data.asistencias.forEach((item: any) => {
          asistenciasObj[item.rut] = item.asistio;
        });
        
        return asistenciasObj;
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error al obtener asistencia:', error.message);
      return null;
    }
  }
}

export default new GoogleSheetsService();
