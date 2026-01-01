import axios from 'axios';
import { AsistenciaCategoria } from '../types';
import DatabaseService from './DatabaseService';

// ✅ CONFIGURACIÓN HARDCODEADA - DOS URLs DIFERENTES
const CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbx9ja0QQvGCOY8os2yDPlb290bH1naYimIbilHMOZ2j9W29zm_2MThAQMkjVbXOiOW7/exec', // ASISTENCIAS
  scriptUrlBD: 'https://script.google.com/macros/s/AKfycbxmASfJp4y8APYgLzFo72gTXAE0GKr2YFSOZLxRMnQkPAVbh0dkynbzpTeNUwxnMmy6HQ/exec', // BASE DE DATOS
  sheetName: '', // Vacío = usa nombre automático (mes_año)
};

interface SheetsConfig {
  scriptUrl: string;
  scriptUrlBD: string;
  sheetName?: string;
}

class GoogleSheetsService {
  private config: SheetsConfig = CONFIG; // ✅ SIEMPRE usa CONFIG

  async loadConfig(): Promise<boolean> {
    console.log('📊 [SHEETS] Usando configuración HARDCODEADA');
    console.log(`📊 [SHEETS] URL Asistencias: ${CONFIG.scriptUrl.substring(0, 50)}...`);
    console.log(`📊 [SHEETS] URL BD: ${CONFIG.scriptUrlBD.substring(0, 50)}...`);
    this.config = CONFIG;
    return true;
  }

  async saveConfig(config: SheetsConfig): Promise<void> {
    console.log('💾 [SHEETS] Configuración actualizada (solo en memoria)');
    this.config = { ...CONFIG, ...config };
  }

  async sincronizarCategoriasEnHojas(): Promise<boolean> {
    try {
      console.log('🔄 [SHEETS] Sincronizando nombres de categorías en hojas existentes...');

      const categorias = await DatabaseService.obtenerCategorias();
      const categoriasActivas = categorias.filter(c => c.activo !== false);

      console.log(`📥 [SHEETS] Categorías a sincronizar: ${categoriasActivas.length}`);

      const response = await axios.post(this.config.scriptUrl, {
        action: 'actualizarCategorias',
        categorias: categoriasActivas,
      });

      if (response.data.success) {
        console.log(`✅ [SHEETS] Categorías sincronizadas en ${response.data.hojasActualizadas} hojas`);
        
        if (response.data.errores && response.data.errores.length > 0) {
          console.log('⚠️ [SHEETS] Errores en algunas hojas:', response.data.errores);
        }
        
        return true;
      } else {
        console.error('❌ [SHEETS] Error al sincronizar:', response.data.error);
        return false;
      }

    } catch (error: any) {
      console.error('❌ [SHEETS] Error al sincronizar categorías:', error.response?.data || error.message);
      return false;
    }
  }

  async enviarAsistencia(asistencia: AsistenciaCategoria): Promise<boolean> {
    try {
      const fechaObj = new Date(asistencia.fecha);
      const mesActual = this.getNombreMes(fechaObj.getMonth());
      const añoActual = fechaObj.getFullYear();
      const sheetNameAuto = `${mesActual}_${añoActual}`;

      console.log(`📅 [SHEETS] Fecha: ${asistencia.fecha} → Mes detectado: ${sheetNameAuto}`);
      console.log('📤 [SHEETS] Enviando asistencia a Google Sheets:', {
        categoria: asistencia.categoria,
        fecha: asistencia.fecha,
        totalJugadores: asistencia.jugadores.length,
      });
      console.log(`🔗 [SHEETS] Usando URL Asistencias: ${this.config.scriptUrl.substring(0, 50)}...`);

      const dia = this.getDiaDelMes(asistencia.fecha);
      
      const jugadoresBD = await DatabaseService.obtenerJugadores();
      const jugadoresActivos = jugadoresBD.filter(j => j.activo !== false);
      
      const categoriasBD = await DatabaseService.obtenerCategorias();
      const categoriasActivas = categoriasBD.filter(c => c.activo !== false);
      
      console.log(`📥 [SHEETS] Jugadores de BD: ${jugadoresActivos.length}`);
      console.log(`📥 [SHEETS] Categorías de BD: ${categoriasActivas.length}`);
      
      const updates = this.prepararActualizacionesDinamicas(
        asistencia.categoria,
        asistencia.jugadores,
        dia,
        asistencia.fecha,
        jugadoresActivos
      );

      const sheetNameFinal = this.config.sheetName || sheetNameAuto;

      console.log(`📊 [SHEETS] Usando sheet: ${sheetNameFinal} (${this.config.sheetName ? 'manual' : 'automático'})`);

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
        console.log('✅ [SHEETS] Asistencia enviada correctamente');
        if (response.data.autoCreated) {
          console.log('🎉 [SHEETS] Sheet creado automáticamente!');
        }
        return true;
      } else {
        console.error('❌ [SHEETS] Error en script:', response.data.error);
        return false;
      }

    } catch (error: any) {
      console.error('❌ [SHEETS] Error al enviar asistencia:', error.response?.data || error.message);
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

  private prepararActualizacionesDinamicas(
    categoria: number,
    jugadoresAsistencia: { rut: string; asistio: boolean }[],
    dia: number,
    fecha: string,
    jugadoresBD: any[]
  ): any[] {
    const jugadoresCategoria = jugadoresBD.filter(j => j.categoria === categoria);
    
    console.log(`📋 [SHEETS] Jugadores en categoría ${categoria}: ${jugadoresCategoria.length}`);
    
    const updates: any[] = [];
    
    const fechaObj = new Date(fecha);
    const fechaFormateada = `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}/${fechaObj.getFullYear()}`;
    
    jugadoresCategoria.forEach((jugador) => {
      const asistenciaJugador = jugadoresAsistencia.find(a => a.rut === jugador.rut);
      const asistio = asistenciaJugador?.asistio || false;
      
      const valor = asistio ? fechaFormateada : 'AUSENTE';
      const color = asistio ? '#d4edda' : '#f8d7da';
      
      console.log(`📍 [SHEETS] Jugador: ${jugador.nombre}, Día: ${dia}, Asistió: ${asistio}`);
      
      updates.push({
        nombreJugador: jugador.nombre,
        dia: dia,
        value: valor,
        backgroundColor: color,
        fontColor: asistio ? '#155724' : '#721c24'
      });
    });

    console.log('📦 [SHEETS] Total de actualizaciones preparadas:', updates.length);
    return updates;
  }

  async inicializarSheet(mes: string, año: number): Promise<boolean> {
    try {
      console.log(`📊 [SHEETS] Inicializando sheet para ${mes} ${año}`);
      console.log(`🔗 [SHEETS] Usando URL Asistencias: ${this.config.scriptUrl.substring(0, 50)}...`);

      const jugadoresBD = await DatabaseService.obtenerJugadores();
      const jugadoresActivos = jugadoresBD.filter(j => j.activo !== false);

      const categoriasBD = await DatabaseService.obtenerCategorias();
      const categoriasActivas = categoriasBD.filter(c => c.activo !== false);

      console.log(`📥 [SHEETS] Jugadores de BD para inicializar: ${jugadoresActivos.length}`);
      console.log(`📥 [SHEETS] Categorías de BD para inicializar: ${categoriasActivas.length}`);

      const response = await axios.post(this.config.scriptUrl, {
        action: 'inicializar',
        sheetName: this.config.sheetName || `${mes}_${año}`,
        mes: mes,
        año: año,
        jugadores: jugadoresActivos,
        categorias: categoriasActivas
      });

      if (response.data.success) {
        console.log('✅ [SHEETS] Sheet inicializado correctamente');
        return true;
      } else {
        console.error('❌ [SHEETS] Error al inicializar:', response.data.error);
        return false;
      }

    } catch (error: any) {
      console.error('❌ [SHEETS] Error al inicializar sheet:', error.response?.data || error.message);
      return false;
    }
  }

  async obtenerAsistenciaDelDia(
    categoria: number,
    fecha: string
  ): Promise<{ [rut: string]: boolean } | null> {
    try {
      const fechaObj = new Date(fecha);
      const mesActual = this.getNombreMes(fechaObj.getMonth());
      const añoActual = fechaObj.getFullYear();
      const sheetNameAuto = `${mesActual}_${añoActual}`;
      const sheetNameFinal = this.config.sheetName || sheetNameAuto;
      const dia = this.getDiaDelMes(fecha);

      console.log(`📥 [SHEETS] Obteniendo asistencia del día ${dia} de ${sheetNameFinal}, categoría ${categoria}`);
      console.log(`🔗 [SHEETS] Usando URL Asistencias: ${this.config.scriptUrl.substring(0, 50)}...`);

      const response = await axios.post(this.config.scriptUrl, {
        action: 'obtenerAsistencia',
        sheetName: sheetNameFinal,
        categoria: categoria,
        dia: dia,
      });

      if (response.data.success && response.data.asistencias) {
        console.log('✅ [SHEETS] Asistencias obtenidas:', response.data.asistencias.length);
        
        const asistenciasObj: { [rut: string]: boolean } = {};
        response.data.asistencias.forEach((item: any) => {
          asistenciasObj[item.rut] = item.asistio;
        });
        
        return asistenciasObj;
      }

      return null;
    } catch (error: any) {
      console.error('❌ [SHEETS] Error al obtener asistencia:', error.message);
      return null;
    }
  }

  getConfig(): SheetsConfig {
    return this.config;
  }
}

export default new GoogleSheetsService();