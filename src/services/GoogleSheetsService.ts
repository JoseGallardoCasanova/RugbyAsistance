import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsistenciaCategoria } from '../types';
import DatabaseService from './DatabaseService';

const STORAGE_KEY = 'google_sheets_config';

const DEFAULT_CONFIG = {
  scriptUrl: 'TU_URL_DE_ASISTENCIAS_AQUI',
  scriptUrlBD: 'TU_URL_DE_BD_AQUI',
  sheetName: '',
};

interface SheetsConfig {
  scriptUrl: string;
  scriptUrlBD: string;
  sheetName?: string;
}

class GoogleSheetsService {
  private config: SheetsConfig | null = null;

  async loadConfig(): Promise<boolean> {
    try {
      const configJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (configJson) {
        this.config = JSON.parse(configJson);
        console.log('📊 Configuración de Google Sheets cargada desde storage');
        return true;
      }
      
      console.log('📊 Usando configuración DEFAULT hardcodeada');
      this.config = DEFAULT_CONFIG;
      return true;
    } catch (error) {
      console.error('Error al cargar config de Sheets:', error);
      this.config = DEFAULT_CONFIG;
      return true;
    }
  }

  async saveConfig(config: SheetsConfig): Promise<void> {
    this.config = config;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log('💾 Configuración de Google Sheets guardada');
  }

  async sincronizarCategoriasEnHojas(): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.config || !this.config.scriptUrl) {
        console.log('⚠️ No hay configuración de Google Sheets para sincronizar');
        return false;
      }

      console.log('🔄 Sincronizando nombres de categorías en hojas existentes...');

      const categorias = await DatabaseService.obtenerCategorias();
      const categoriasActivas = categorias.filter(c => c.activo !== false);

      console.log(`📥 Categorías a sincronizar: ${categoriasActivas.length}`);

      const response = await axios.post(this.config.scriptUrl, {
        action: 'actualizarCategorias',
        categorias: categoriasActivas,
      });

      if (response.data.success) {
        console.log(`✅ Categorías sincronizadas en ${response.data.hojasActualizadas} hojas`);
        
        if (response.data.errores && response.data.errores.length > 0) {
          console.log('⚠️ Errores en algunas hojas:', response.data.errores);
        }
        
        return true;
      } else {
        console.error('❌ Error al sincronizar:', response.data.error);
        return false;
      }

    } catch (error: any) {
      console.error('❌ Error al sincronizar categorías:', error.response?.data || error.message);
      return false;
    }
  }

  async enviarAsistencia(asistencia: AsistenciaCategoria): Promise<boolean> {
    try {
      await this.loadConfig();

      const fechaObj = new Date(asistencia.fecha);
      const mesActual = this.getNombreMes(fechaObj.getMonth());
      const añoActual = fechaObj.getFullYear();
      const sheetNameAuto = `${mesActual}_${añoActual}`;

      console.log(`📅 Fecha: ${asistencia.fecha} → Mes detectado: ${sheetNameAuto}`);

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

      const dia = this.getDiaDelMes(asistencia.fecha);
      
      const jugadoresBD = await DatabaseService.obtenerJugadores();
      const jugadoresActivos = jugadoresBD.filter(j => j.activo !== false);
      
      const categoriasBD = await DatabaseService.obtenerCategorias();
      const categoriasActivas = categoriasBD.filter(c => c.activo !== false);
      
      console.log(`📥 Jugadores de BD: ${jugadoresActivos.length}`);
      console.log(`📥 Categorías de BD: ${categoriasActivas.length}`);
      
      // ✅ NUEVO: Preparar actualizaciones con NOMBRE de jugador
      const updates = this.prepararActualizacionesDinamicas(
        asistencia.categoria,
        asistencia.jugadores,
        dia,
        asistencia.fecha,
        jugadoresActivos
      );

      const sheetNameFinal = this.config.sheetName || sheetNameAuto;

      console.log(`📊 Usando sheet: ${sheetNameFinal} (${this.config.sheetName ? 'manual' : 'automático'})`);

      const response = await axios.post(this.config.scriptUrl, {
        sheetName: sheetNameFinal,
        autoCreate: true,
        mes: mesActual,
        año: añoActual,
        jugadores: jugadoresActivos,
        categorias: categoriasActivas,
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

  // ✅ NUEVA FUNCIÓN: Preparar actualizaciones con nombre de jugador
  private prepararActualizacionesDinamicas(
    categoria: number,
    jugadoresAsistencia: { rut: string; asistio: boolean }[],
    dia: number,
    fecha: string,
    jugadoresBD: any[]
  ): any[] {
    const jugadoresCategoria = jugadoresBD.filter(j => j.categoria === categoria);
    
    console.log(`📋 Jugadores en categoría ${categoria}: ${jugadoresCategoria.length}`);
    
    const updates: any[] = [];
    
    const fechaObj = new Date(fecha);
    const fechaFormateada = `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}/${fechaObj.getFullYear()}`;
    
    jugadoresCategoria.forEach((jugador) => {
      const asistenciaJugador = jugadoresAsistencia.find(a => a.rut === jugador.rut);
      const asistio = asistenciaJugador?.asistio || false;
      
      const valor = asistio ? fechaFormateada : 'AUSENTE';
      const color = asistio ? '#d4edda' : '#f8d7da';
      
      // ✅ CAMBIO CRÍTICO: En lugar de calcular fila, enviamos el NOMBRE del jugador
      console.log(`📍 Jugador: ${jugador.nombre}, Día: ${dia}, Asistió: ${asistio}`);
      
      updates.push({
        nombreJugador: jugador.nombre, // ✅ NUEVO: Enviar nombre en lugar de calcular fila
        dia: dia,
        value: valor,
        backgroundColor: color,
        fontColor: asistio ? '#155724' : '#721c24'
      });
    });

    console.log('📦 Total de actualizaciones preparadas:', updates.length);
    return updates;
  }

  async inicializarSheet(mes: string, año: number): Promise<boolean> {
    if (!this.config || !this.config.scriptUrl) {
      console.error('❌ No hay configuración de Google Sheets');
      return false;
    }

    try {
      console.log(`📊 Inicializando sheet para ${mes} ${año}`);

      const jugadoresBD = await DatabaseService.obtenerJugadores();
      const jugadoresActivos = jugadoresBD.filter(j => j.activo !== false);

      const categoriasBD = await DatabaseService.obtenerCategorias();
      const categoriasActivas = categoriasBD.filter(c => c.activo !== false);

      console.log(`📥 Jugadores de BD para inicializar: ${jugadoresActivos.length}`);
      console.log(`📥 Categorías de BD para inicializar: ${categoriasActivas.length}`);

      const response = await axios.post(this.config.scriptUrl, {
        action: 'inicializar',
        sheetName: this.config.sheetName || `${mes}_${año}`,
        mes: mes,
        año: año,
        jugadores: jugadoresActivos,
        categorias: categoriasActivas
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

      const fechaObj = new Date(fecha);
      const mesActual = this.getNombreMes(fechaObj.getMonth());
      const añoActual = fechaObj.getFullYear();
      const sheetNameAuto = `${mesActual}_${añoActual}`;
      const sheetNameFinal = this.config.sheetName || sheetNameAuto;
      const dia = this.getDiaDelMes(fecha);

      console.log(`📥 Obteniendo asistencia del día ${dia} de ${sheetNameFinal}, categoría ${categoria}`);

      const response = await axios.post(this.config.scriptUrl, {
        action: 'obtenerAsistencia',
        sheetName: sheetNameFinal,
        categoria: categoria,
        dia: dia,
      });

      if (response.data.success && response.data.asistencias) {
        console.log('✅ Asistencias obtenidas:', response.data.asistencias.length);
        
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
