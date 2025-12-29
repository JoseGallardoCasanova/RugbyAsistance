import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Jugador, Categoria } from '../types';

const CACHE_KEY_USUARIOS = 'usuarios_cache';
const CACHE_KEY_JUGADORES = 'jugadores_cache';
const CACHE_KEY_CATEGORIAS = 'categorias_cache';
const CONFIG_KEY = 'google_sheets_config';
const CATEGORIAS_INITIALIZED_KEY = 'categorias_initialized';

// ✅ CATEGORÍAS POR DEFECTO (primera vez)
const CATEGORIAS_DEFAULT: Omit<Categoria, 'id' | 'creadoEn' | 'modificadoEn'>[] = [
  { numero: 1, nombre: 'Categoría 1', color: '#1a472a', activo: true },
  { numero: 2, nombre: 'Categoría 2', color: '#2d5a3d', activo: true },
  { numero: 3, nombre: 'Categoría 3', color: '#3f6d50', activo: true },
  { numero: 4, nombre: 'Categoría 4', color: '#518063', activo: true },
  { numero: 5, nombre: 'Categoría 5', color: '#639376', activo: true },
  { numero: 6, nombre: 'Categoría 6', color: '#75a689', activo: true },
  { numero: 7, nombre: 'Categoría 7', color: '#87b99c', activo: true },
];

class DatabaseService {
  private scriptUrlBD: string | null = null;

  async loadConfig(): Promise<boolean> {
    try {
      const configJson = await AsyncStorage.getItem(CONFIG_KEY);
      if (configJson) {
        const config = JSON.parse(configJson);
        this.scriptUrlBD = config.scriptUrlBD || null;
        console.log('📊 URL de BD cargada:', this.scriptUrlBD ? 'Configurado' : 'No configurado');
        return !!this.scriptUrlBD;
      }
      return false;
    } catch (error) {
      console.error('Error al cargar config de BD:', error);
      return false;
    }
  }

  // ==================== INICIALIZACIÓN DE CATEGORÍAS ====================

  async inicializarCategoriasDefault(): Promise<void> {
    try {
      // Verificar si ya se inicializaron
      const initialized = await AsyncStorage.getItem(CATEGORIAS_INITIALIZED_KEY);
      if (initialized === 'true') {
        console.log('✅ Categorías ya inicializadas previamente');
        return;
      }

      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.log('⚠️ No hay URL de BD, guardando categorías en cache solamente');
        await AsyncStorage.setItem(CACHE_KEY_CATEGORIAS, JSON.stringify(CATEGORIAS_DEFAULT));
        await AsyncStorage.setItem(CATEGORIAS_INITIALIZED_KEY, 'true');
        return;
      }

      console.log('🚀 Inicializando categorías por defecto...');

      // Crear cada categoría
      for (const cat of CATEGORIAS_DEFAULT) {
        await this.crearCategoria(cat);
      }

      // Marcar como inicializado
      await AsyncStorage.setItem(CATEGORIAS_INITIALIZED_KEY, 'true');
      console.log('✅ Categorías inicializadas correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar categorías:', error);
    }
  }

  // ==================== USUARIOS ====================

  async obtenerUsuarios(): Promise<User[]> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.log('⚠️ No hay URL de BD configurada, usando cache');
        return await this.obtenerDatosCache<User[]>(CACHE_KEY_USUARIOS) || [];
      }

      console.log('📥 Obteniendo usuarios de BD...');

      const response = await axios.post(this.scriptUrlBD, {
        action: 'getUsuarios'
      });

      if (response.data.success && response.data.usuarios) {
        await AsyncStorage.setItem(CACHE_KEY_USUARIOS, JSON.stringify(response.data.usuarios));
        console.log(`✅ ${response.data.usuarios.length} usuarios obtenidos`);
        return response.data.usuarios;
      }

      return [];
    } catch (error: any) {
      console.error('❌ Error al obtener usuarios:', error.message);
      return await this.obtenerDatosCache<User[]>(CACHE_KEY_USUARIOS) || [];
    }
  }

  async crearUsuario(usuario: Omit<User, 'id' | 'creadoEn' | 'modificadoEn'>): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('➕ Creando usuario:', usuario.nombre);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'crearUsuario',
        usuario: usuario
      });

      if (response.data.success) {
        console.log('✅ Usuario creado');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al crear usuario:', error.message);
      return false;
    }
  }

  async actualizarUsuario(id: string, datos: Partial<User>): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('✏️ Actualizando usuario:', id);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'actualizarUsuario',
        id: id,
        datos: datos
      });

      if (response.data.success) {
        console.log('✅ Usuario actualizado');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al actualizar usuario:', error.message);
      return false;
    }
  }

  async eliminarUsuario(id: string): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('🗑️ Eliminando usuario:', id);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'eliminarUsuario',
        id: id
      });

      if (response.data.success) {
        console.log('✅ Usuario eliminado');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al eliminar usuario:', error.message);
      return false;
    }
  }

  // ==================== JUGADORES ====================

  async obtenerJugadores(): Promise<Jugador[]> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.log('⚠️ No hay URL de BD configurada, usando cache');
        return await this.obtenerDatosCache<Jugador[]>(CACHE_KEY_JUGADORES) || [];
      }

      console.log('📥 Obteniendo jugadores de BD...');

      const response = await axios.post(this.scriptUrlBD, {
        action: 'getJugadores'
      });

      if (response.data.success && response.data.jugadores) {
        await AsyncStorage.setItem(CACHE_KEY_JUGADORES, JSON.stringify(response.data.jugadores));
        console.log(`✅ ${response.data.jugadores.length} jugadores obtenidos`);
        return response.data.jugadores;
      }

      return [];
    } catch (error: any) {
      console.error('❌ Error al obtener jugadores:', error.message);
      return await this.obtenerDatosCache<Jugador[]>(CACHE_KEY_JUGADORES) || [];
    }
  }

  async crearJugador(jugador: Omit<Jugador, 'id' | 'creadoEn' | 'modificadoEn'>): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('➕ Creando jugador:', jugador.nombre);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'crearJugador',
        jugador: jugador
      });

      if (response.data.success) {
        console.log('✅ Jugador creado');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al crear jugador:', error.message);
      return false;
    }
  }

  async actualizarJugador(id: string, datos: Partial<Jugador>): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('✏️ Actualizando jugador:', id);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'actualizarJugador',
        id: id,
        datos: datos
      });

      if (response.data.success) {
        console.log('✅ Jugador actualizado');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al actualizar jugador:', error.message);
      return false;
    }
  }

  async eliminarJugador(id: string): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('🗑️ Eliminando jugador:', id);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'eliminarJugador',
        id: id
      });

      if (response.data.success) {
        console.log('✅ Jugador eliminado');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al eliminar jugador:', error.message);
      return false;
    }
  }

  // ==================== CATEGORÍAS ====================

  async obtenerCategorias(): Promise<Categoria[]> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.log('⚠️ No hay URL de BD configurada, usando cache');
        const cached = await this.obtenerDatosCache<Categoria[]>(CACHE_KEY_CATEGORIAS);
        if (cached && cached.length > 0) return cached;
        // Si no hay cache, inicializar
        await this.inicializarCategoriasDefault();
        return await this.obtenerDatosCache<Categoria[]>(CACHE_KEY_CATEGORIAS) || [];
      }

      console.log('📥 Obteniendo categorías de BD...');

      const response = await axios.post(this.scriptUrlBD, {
        action: 'getCategorias'
      });

      if (response.data.success && response.data.categorias) {
        await AsyncStorage.setItem(CACHE_KEY_CATEGORIAS, JSON.stringify(response.data.categorias));
        console.log(`✅ ${response.data.categorias.length} categorías obtenidas`);
        return response.data.categorias;
      }

      // Si no hay categorías en BD, inicializar
      await this.inicializarCategoriasDefault();
      return await this.obtenerDatosCache<Categoria[]>(CACHE_KEY_CATEGORIAS) || [];
    } catch (error: any) {
      console.error('❌ Error al obtener categorías:', error.message);
      const cached = await this.obtenerDatosCache<Categoria[]>(CACHE_KEY_CATEGORIAS);
      if (cached && cached.length > 0) return cached;
      // Si falla todo, inicializar
      await this.inicializarCategoriasDefault();
      return await this.obtenerDatosCache<Categoria[]>(CACHE_KEY_CATEGORIAS) || [];
    }
  }

  async crearCategoria(categoria: Omit<Categoria, 'id' | 'creadoEn' | 'modificadoEn'>): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('➕ Creando categoría:', categoria.nombre);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'crearCategoria',
        categoria: categoria
      });

      if (response.data.success) {
        console.log('✅ Categoría creada');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al crear categoría:', error.message);
      return false;
    }
  }

  async actualizarCategoria(id: string, datos: Partial<Categoria>): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('✏️ Actualizando categoría:', id);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'actualizarCategoria',
        id: id,
        datos: datos
      });

      if (response.data.success) {
        console.log('✅ Categoría actualizada');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al actualizar categoría:', error.message);
      return false;
    }
  }

  async eliminarCategoria(id: string): Promise<boolean> {
    try {
      await this.loadConfig();

      if (!this.scriptUrlBD) {
        console.error('❌ No hay URL de BD configurada');
        return false;
      }

      console.log('🗑️ Eliminando categoría:', id);

      const response = await axios.post(this.scriptUrlBD, {
        action: 'eliminarCategoria',
        id: id
      });

      if (response.data.success) {
        console.log('✅ Categoría eliminada');
        await this.sincronizarDatos();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error al eliminar categoría:', error.message);
      return false;
    }
  }

  // ==================== SINCRONIZACIÓN ====================

  async sincronizarDatos(): Promise<void> {
    console.log('🔄 Sincronizando datos...');
    await this.obtenerUsuarios();
    await this.obtenerJugadores();
    await this.obtenerCategorias();
    console.log('✅ Sincronización completa');
  }

  async obtenerDatosCache<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error al obtener cache ${key}:`, error);
      return null;
    }
  }
}

export default new DatabaseService();
