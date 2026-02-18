// ============================================
// ⚠️ DEPRECATED - NO USAR
// ============================================
// Este archivo usa Google Sheets como base de datos
// Solo lo usa GoogleSheetsService (deprecated)
// USAR: SupabaseServiceV2.ts en su lugar
// Deprecated: 2026-02-15
// ============================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ URL HARDCODEADA - BASE DE DATOS
const CONFIG = {
  scriptUrlBD: 'https://script.google.com/macros/s/AKfycbxmASfJp4y8APYgLzFo72gTXAE0GKr2YFSOZLxRMnQkPAVbh0dkynbzpTeNUwxnMmy6HQ/exec',
};

// Cache keys
const CACHE_KEYS = {
  USUARIOS: '@usuarios_cache',
  JUGADORES: '@jugadores_cache',
  CATEGORIAS: '@categorias_cache',
};

// Mock data para desarrollo (solo se usa si falla la conexión)
const MOCK_DATA = {
  usuarios: [
    {
      id: 1,
      email: 'admin@rugby.cl',
      password: 'admin123',
      nombre: 'Administrador',
      role: 'admin',
      activo: true
    },
  ],
  jugadores: [],
  categorias: [],
};

// ✅ NUEVO: Helper para normalizar campos de BD (Nombre → nombre)
function normalizarCampos(obj: any): any {
  if (!obj) return obj;
  
  const normalizado: any = {};
  
  for (const key in obj) {
    // Convertir primera letra a minúscula
    const keyNormalizada = key.charAt(0).toLowerCase() + key.slice(1);
    normalizado[keyNormalizada] = obj[key];
    
    // Mapeos específicos
    if (key === 'Rol') {
      normalizado['role'] = obj[key]; // Rol → role
    }
    if (key === 'Numero') {
      normalizado['numero'] = obj[key]; // Numero → numero
    }
  }

  // Normalizaciones de tipos comunes (Sheets suele devolver strings)
  if (typeof normalizado.numero === 'string') {
    const n = Number(normalizado.numero);
    if (Number.isFinite(n)) normalizado.numero = n;
  }
  if (typeof normalizado.categoria === 'string') {
    const n = Number(normalizado.categoria);
    if (Number.isFinite(n)) normalizado.categoria = n;
  }
  if (typeof normalizado.categoriaAsignada === 'string') {
    const n = Number(normalizado.categoriaAsignada);
    if (Number.isFinite(n)) normalizado.categoriaAsignada = n;
  }

  // categoriasAsignadas puede venir como: "1,2,3" o "[1,2,3]" o "1"
  if (typeof normalizado.categoriasAsignadas === 'string') {
    const raw = normalizado.categoriasAsignadas.trim();
    let arr: number[] = [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        arr = parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
      } else if (parsed != null) {
        const n = Number(parsed);
        if (Number.isFinite(n)) arr = [n];
      }
    } catch {
      arr = raw
        .split(',')
        .map((s: string) => Number(s.trim()))
        .filter((x: number) => Number.isFinite(x));
    }

    normalizado.categoriasAsignadas = arr;
  }

  if (Array.isArray(normalizado.categoriasAsignadas)) {
    normalizado.categoriasAsignadas = normalizado.categoriasAsignadas
      .map((x: any) => Number(x))
      .filter((x: any) => Number.isFinite(x));
  }
  
  return normalizado;
}

class DatabaseService {
  private scriptUrlBD: string = CONFIG.scriptUrlBD;

  async initialize(): Promise<void> {
    console.log('🚀 [BD] Inicializando DatabaseService con URL hardcodeada...');
    this.scriptUrlBD = CONFIG.scriptUrlBD;
    console.log(`✅ [BD] URL BD configurada: ${this.scriptUrlBD.substring(0, 50)}...`);
  }

  setScriptUrl(url: string): void {
    console.log('💾 [BD] URL actualizada (solo en memoria)');
    this.scriptUrlBD = url || CONFIG.scriptUrlBD;
  }

  private async makeRequest(action: string, data: any = {}): Promise<any> {
    try {
      console.log(`📤 [BD] Haciendo request: ${action}`);
      console.log(`🔗 [BD] URL: ${this.scriptUrlBD.substring(0, 50)}...`);
      console.log(`📦 [BD] Datos:`, JSON.stringify(data, null, 2));
      
      const response = await axios.post(this.scriptUrlBD, {
        action,
        ...data,
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`✅ [BD] Response exitoso:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error(`❌ [BD] Error en request ${action}:`);
      console.error(`❌ [BD] Error message:`, error.message);
      if (error.response) {
        console.error(`❌ [BD] Error response:`, error.response.data);
        console.error(`❌ [BD] Error status:`, error.response.status);
      }
      throw error;
    }
  }

  // ============================================
  // USUARIOS
  // ============================================

  async verificarCredenciales(email: string, password: string): Promise<any> {
    try {
      console.log(`🔐 [BD] Verificando credenciales para: ${email}`);
      console.log(`🔗 [BD] Usando URL BD: ${this.scriptUrlBD.substring(0, 50)}...`);

      const response = await this.makeRequest('verificarCredenciales', {
        email,
        password,
      });

      console.log(`📥 [BD] Response recibido:`, response);

      if (response.success && response.usuario) {
        // ✅ NUEVO: Normalizar campos antes de retornar
        const usuarioNormalizado = normalizarCampos(response.usuario);
        
        console.log(`✅ [BD] Login exitoso desde GOOGLE SHEETS: ${usuarioNormalizado.nombre}`);
        console.log(`👤 [BD] Usuario normalizado:`, usuarioNormalizado);
        return usuarioNormalizado;
      } else {
        console.log(`❌ [BD] Login falló: ${response.error || 'Credenciales inválidas'}`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ [BD] Error al verificar credenciales:`);
      console.error(`❌ [BD] Error completo:`, error);
      
      console.log('⚠️ [BD] Intentando con datos MOCK...');
      const usuario = MOCK_DATA.usuarios.find(
        u => u.email === email && u.password === password && u.activo
      );
      
      if (usuario) {
        console.log(`✅ [MOCK] Login exitoso con usuario MOCK: ${usuario.nombre}`);
        return usuario;
      }
      
      console.log('❌ [MOCK] Usuario no encontrado en MOCK');
      return null;
    }
  }

  async obtenerUsuarios(): Promise<any[]> {
    try {
      console.log('📥 [BD] Obteniendo usuarios...');
      
      const response = await this.makeRequest('obtenerUsuarios');

      if (response.success && response.usuarios) {
        // ✅ NUEVO: Normalizar cada usuario
        const usuariosNormalizados = response.usuarios.map(normalizarCampos);
        
        console.log(`✅ [BD] ${usuariosNormalizados.length} usuarios obtenidos de GOOGLE SHEETS`);
        await AsyncStorage.setItem(CACHE_KEYS.USUARIOS, JSON.stringify(usuariosNormalizados));
        return usuariosNormalizados;
      }

      const cached = await AsyncStorage.getItem(CACHE_KEYS.USUARIOS);
      if (cached) {
        console.log('📦 [CACHE] Usando usuarios de cache');
        return JSON.parse(cached);
      }

      return [];
    } catch (error: any) {
      console.error('❌ [BD] Error al obtener usuarios:', error.message);
      
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.USUARIOS);
        if (cached) {
          console.log('📦 [CACHE] Usando usuarios de cache (error en BD)');
          return JSON.parse(cached);
        }
      } catch {}

      return [];
    }
  }

  async crearUsuario(usuario: any): Promise<boolean> {
    try {
      console.log('➕ [BD] Creando usuario:', usuario.email);

      const response = await this.makeRequest('crearUsuario', { usuario });

      if (response.success) {
        console.log('✅ [BD] Usuario creado exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.USUARIOS);
        return true;
      }

      console.error('❌ [BD] Error al crear usuario:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al crear usuario:', error.message);
      return false;
    }
  }

  async actualizarUsuario(id: number, cambios: any): Promise<boolean> {
    try {
      console.log(`✏️ [BD] Actualizando usuario ${id}`);

      const response = await this.makeRequest('actualizarUsuario', {
        id,
        cambios,
      });

      if (response.success) {
        console.log('✅ [BD] Usuario actualizado exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.USUARIOS);
        return true;
      }

      console.error('❌ [BD] Error al actualizar usuario:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al actualizar usuario:', error.message);
      return false;
    }
  }

  async eliminarUsuario(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ [BD] Eliminando usuario ${id}`);

      const response = await this.makeRequest('eliminarUsuario', { id });

      if (response.success) {
        console.log('✅ [BD] Usuario eliminado exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.USUARIOS);
        return true;
      }

      console.error('❌ [BD] Error al eliminar usuario:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al eliminar usuario:', error.message);
      return false;
    }
  }

  // ============================================
  // JUGADORES
  // ============================================

  async obtenerJugadores(): Promise<any[]> {
    try {
      console.log('📥 [BD] Obteniendo jugadores...');

      const response = await this.makeRequest('obtenerJugadores');

      if (response.success && response.jugadores) {
        // ✅ NUEVO: Normalizar cada jugador
        const jugadoresNormalizados = response.jugadores.map(normalizarCampos);
        
        console.log(`✅ [BD] ${jugadoresNormalizados.length} jugadores obtenidos`);
        await AsyncStorage.setItem(CACHE_KEYS.JUGADORES, JSON.stringify(jugadoresNormalizados));
        return jugadoresNormalizados;
      }

      const cached = await AsyncStorage.getItem(CACHE_KEYS.JUGADORES);
      if (cached) {
        console.log('📦 [CACHE] Usando jugadores de cache');
        return JSON.parse(cached);
      }

      return [];
    } catch (error: any) {
      console.error('❌ [BD] Error al obtener jugadores:', error.message);
      
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.JUGADORES);
        if (cached) {
          console.log('📦 [CACHE] Usando jugadores de cache (error en BD)');
          return JSON.parse(cached);
        }
      } catch {}

      return [];
    }
  }

  async crearJugador(jugador: any): Promise<boolean> {
    try {
      console.log('➕ [BD] Creando jugador:', jugador.nombre);

      const response = await this.makeRequest('crearJugador', { jugador });

      if (response.success) {
        console.log('✅ [BD] Jugador creado exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.JUGADORES);
        return true;
      }

      console.error('❌ [BD] Error al crear jugador:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al crear jugador:', error.message);
      return false;
    }
  }

  async actualizarJugador(rut: string, cambios: any): Promise<boolean> {
    try {
      console.log(`✏️ [BD] Actualizando jugador ${rut}`);

      const response = await this.makeRequest('actualizarJugador', {
        rut,
        cambios,
      });

      if (response.success) {
        console.log('✅ [BD] Jugador actualizado exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.JUGADORES);
        return true;
      }

      console.error('❌ [BD] Error al actualizar jugador:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al actualizar jugador:', error.message);
      return false;
    }
  }

  async eliminarJugador(rut: string): Promise<boolean> {
    try {
      console.log(`🗑️ [BD] Eliminando jugador ${rut}`);

      const response = await this.makeRequest('eliminarJugador', { rut });

      if (response.success) {
        console.log('✅ [BD] Jugador eliminado exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.JUGADORES);
        return true;
      }

      console.error('❌ [BD] Error al eliminar jugador:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al eliminar jugador:', error.message);
      return false;
    }
  }

  // ============================================
  // CATEGORÍAS
  // ============================================

  async obtenerCategorias(): Promise<any[]> {
    try {
      console.log('📥 [BD] Obteniendo categorías...');

      const response = await this.makeRequest('obtenerCategorias');

      if (response.success && response.categorias) {
        // ✅ NUEVO: Normalizar cada categoría
        const categoriasNormalizadas = response.categorias.map(normalizarCampos);
        
        console.log(`✅ [BD] ${categoriasNormalizadas.length} categorías obtenidas`);
        await AsyncStorage.setItem(CACHE_KEYS.CATEGORIAS, JSON.stringify(categoriasNormalizadas));
        return categoriasNormalizadas;
      }

      const cached = await AsyncStorage.getItem(CACHE_KEYS.CATEGORIAS);
      if (cached) {
        console.log('📦 [CACHE] Usando categorías de cache');
        return JSON.parse(cached);
      }

      return [];
    } catch (error: any) {
      console.error('❌ [BD] Error al obtener categorías:', error.message);
      
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.CATEGORIAS);
        if (cached) {
          console.log('📦 [CACHE] Usando categorías de cache (error en BD)');
          return JSON.parse(cached);
        }
      } catch {}

      return [];
    }
  }

  async crearCategoria(categoria: any): Promise<boolean> {
    try {
      console.log('➕ [BD] Creando categoría:', categoria.nombre);

      const response = await this.makeRequest('crearCategoria', { categoria });

      if (response.success) {
        console.log('✅ [BD] Categoría creada exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.CATEGORIAS);
        return true;
      }

      console.error('❌ [BD] Error al crear categoría:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al crear categoría:', error.message);
      return false;
    }
  }

  async actualizarCategoria(numero: number, cambios: any): Promise<boolean> {
    try {
      console.log(`✏️ [BD] Actualizando categoría ${numero}`);

      const response = await this.makeRequest('actualizarCategoria', {
        numero,
        cambios,
      });

      if (response.success) {
        console.log('✅ [BD] Categoría actualizada exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.CATEGORIAS);
        return true;
      }

      console.error('❌ [BD] Error al actualizar categoría:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al actualizar categoría:', error.message);
      return false;
    }
  }

  async eliminarCategoria(numero: number): Promise<boolean> {
    try {
      console.log(`🗑️ [BD] Eliminando categoría ${numero}`);

      const response = await this.makeRequest('eliminarCategoria', { numero });

      if (response.success) {
        console.log('✅ [BD] Categoría eliminada exitosamente');
        await AsyncStorage.removeItem(CACHE_KEYS.CATEGORIAS);
        return true;
      }

      console.error('❌ [BD] Error al eliminar categoría:', response.error);
      return false;
    } catch (error: any) {
      console.error('❌ [BD] Error al eliminar categoría:', error.message);
      return false;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  async limpiarCache(): Promise<void> {
    console.log('🧹 Limpiando cache...');
    await AsyncStorage.multiRemove([
      CACHE_KEYS.USUARIOS,
      CACHE_KEYS.JUGADORES,
      CACHE_KEYS.CATEGORIAS,
    ]);
    console.log('✅ Cache limpiado');
  }

  getScriptUrl(): string {
    return this.scriptUrlBD;
  }
}

export default new DatabaseService();
