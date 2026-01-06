import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

// Tipos
export interface Usuario {
  id: number;
  email: string;
  password?: string;
  nombre: string;
  role: 'admin' | 'entrenador' | 'ayudante';
  categoriaAsignada?: number;
  categoriasAsignadas?: number[];
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Jugador {
  rut: string;
  nombre: string;
  categoria: number;
  numero?: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Categoria {
  numero: number;
  nombre: string;
  color: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Asistencia {
  id?: number;
  categoria: number;
  fecha: string;
  rut_jugador: string;
  asistio: boolean;
  marcado_por: string;
  created_at?: string;
  updated_at?: string;
}

class SupabaseService {
  private supabase: SupabaseClient;
  private initialized: boolean = false;

  constructor() {
    console.log('🚀 [SUPABASE] Inicializando servicio...');
    
    this.supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    this.initialized = true;
    console.log('✅ [SUPABASE] Servicio inicializado');
  }

  // ============================================
  // USUARIOS
  // ============================================

  async verificarCredenciales(email: string, password: string): Promise<Usuario | null> {
    try {
      console.log(`🔐 [SUPABASE] Verificando credenciales para: ${email}`);

      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .eq('activo', true)
        .single();

      if (error || !data) {
        console.log('❌ [SUPABASE] Credenciales inválidas');
        return null;
      }

      console.log('✅ [SUPABASE] Login exitoso:', data.nombre);
      return this.normalizarUsuario(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al verificar credenciales:', error.message);
      return null;
    }
  }

  async obtenerUsuarios(): Promise<Usuario[]> {
    try {
      console.log('📥 [SUPABASE] Obteniendo usuarios...');

      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('activo', true)
        .order('id', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE] Usuarios obtenidos: ${data?.length || 0}`);
      return (data || []).map(u => this.normalizarUsuario(u));
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al obtener usuarios:', error.message);
      return [];
    }
  }

  async crearUsuario(usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      console.log('➕ [SUPABASE] Creando usuario:', usuario.email);

      const { error } = await this.supabase
        .from('usuarios')
        .insert([{
          email: usuario.email,
          password: usuario.password,
          nombre: usuario.nombre,
          role: usuario.role,
          categoria_asignada: usuario.categoriaAsignada,
          categorias_asignadas: usuario.categoriasAsignadas || [],
          activo: true,
        }]);

      if (error) throw error;

      console.log('✅ [SUPABASE] Usuario creado exitosamente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al crear usuario:', error.message);
      return false;
    }
  }

  async actualizarUsuario(id: number, cambios: Partial<Usuario>): Promise<boolean> {
    try {
      console.log('✏️ [SUPABASE] Actualizando usuario ID:', id);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (cambios.nombre) updateData.nombre = cambios.nombre;
      if (cambios.email) updateData.email = cambios.email;
      if (cambios.password) updateData.password = cambios.password;
      if (cambios.role) updateData.role = cambios.role;
      if (cambios.categoriaAsignada !== undefined) updateData.categoria_asignada = cambios.categoriaAsignada;
      if (cambios.categoriasAsignadas !== undefined) updateData.categorias_asignadas = cambios.categoriasAsignadas;
      if (cambios.activo !== undefined) updateData.activo = cambios.activo;

      const { error } = await this.supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      console.log('✅ [SUPABASE] Usuario actualizado');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al actualizar usuario:', error.message);
      return false;
    }
  }

  async eliminarUsuario(id: number): Promise<boolean> {
    try {
      console.log('🗑️ [SUPABASE] Eliminando usuario ID:', id);

      // Hard delete - elimina permanentemente
      const { error } = await this.supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ [SUPABASE] Usuario eliminado permanentemente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al eliminar usuario:', error.message);
      return false;
    }
  }

  // ============================================
  // JUGADORES
  // ============================================

  async obtenerJugadores(): Promise<Jugador[]> {
    try {
      console.log('📥 [SUPABASE] Obteniendo jugadores...');

      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('activo', true)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE] Jugadores obtenidos: ${data?.length || 0}`);
      return (data || []).map(j => this.normalizarJugador(j));
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al obtener jugadores:', error.message);
      return [];
    }
  }

  async crearJugador(jugador: Omit<Jugador, 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      console.log('➕ [SUPABASE] Creando jugador:', jugador.nombre);

      const { error } = await this.supabase
        .from('jugadores')
        .insert([{
          rut: jugador.rut,
          nombre: jugador.nombre,
          categoria: jugador.categoria,
          numero: jugador.numero,
          activo: true,
          // Datos personales
          fecha_nacimiento: jugador.fecha_nacimiento,
          email: jugador.email,
          // Contacto de emergencia
          contacto_emergencia: jugador.contacto_emergencia,
          tel_emergencia: jugador.tel_emergencia,
          // Información de salud
          sistema_salud: jugador.sistema_salud,
          seguro_complementario: jugador.seguro_complementario,
          // Tutor (para menores)
          nombre_tutor: jugador.nombre_tutor,
          rut_tutor: jugador.rut_tutor,
          tel_tutor: jugador.tel_tutor,
          // Información médica
          fuma_frecuencia: jugador.fuma_frecuencia,
          enfermedades: jugador.enfermedades,
          alergias: jugador.alergias,
          medicamentos: jugador.medicamentos,
          lesiones: jugador.lesiones,
          actividad: jugador.actividad,
          // Autorización de uso de imagen
          autorizo_uso_imagen: jugador.autorizo_uso_imagen,
        }]);

      if (error) throw error;

      console.log('✅ [SUPABASE] Jugador creado exitosamente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al crear jugador:', error.message);
      return false;
    }
  }

  async actualizarJugador(rut: string, cambios: Partial<Jugador>): Promise<boolean> {
    try {
      console.log('✏️ [SUPABASE] Actualizando jugador RUT:', rut);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (cambios.nombre) updateData.nombre = cambios.nombre;
      if (cambios.categoria !== undefined) updateData.categoria = cambios.categoria;
      if (cambios.numero !== undefined) updateData.numero = cambios.numero;
      if (cambios.activo !== undefined) updateData.activo = cambios.activo;

      const { error } = await this.supabase
        .from('jugadores')
        .update(updateData)
        .eq('rut', rut);

      if (error) throw error;

      console.log('✅ [SUPABASE] Jugador actualizado');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al actualizar jugador:', error.message);
      return false;
    }
  }

  async eliminarJugador(rut: string): Promise<boolean> {
    try {
      console.log('🗑️ [SUPABASE] Eliminando jugador RUT:', rut);

      // Hard delete - elimina permanentemente
      const { error } = await this.supabase
        .from('jugadores')
        .delete()
        .eq('rut', rut);

      if (error) throw error;

      console.log('✅ [SUPABASE] Jugador eliminado permanentemente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al eliminar jugador:', error.message);
      return false;
    }
  }

  // ============================================
  // CATEGORÍAS
  // ============================================

  async obtenerCategorias(): Promise<Categoria[]> {
    try {
      console.log('📥 [SUPABASE] Obteniendo categorías...');

      const { data, error } = await this.supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('numero', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE] Categorías obtenidas: ${data?.length || 0}`);
      return (data || []).map(c => this.normalizarCategoria(c));
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al obtener categorías:', error.message);
      return [];
    }
  }

  async crearCategoria(categoria: Omit<Categoria, 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      console.log('➕ [SUPABASE] Creando categoría:', categoria.nombre);

      const { error } = await this.supabase
        .from('categorias')
        .insert([{
          numero: categoria.numero,
          nombre: categoria.nombre,
          color: categoria.color,
          activo: true,
        }]);

      if (error) throw error;

      console.log('✅ [SUPABASE] Categoría creada exitosamente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al crear categoría:', error.message);
      return false;
    }
  }

  async actualizarCategoria(numero: number, cambios: Partial<Categoria>): Promise<boolean> {
    try {
      console.log('✏️ [SUPABASE] Actualizando categoría número:', numero);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (cambios.nombre) updateData.nombre = cambios.nombre;
      if (cambios.color) updateData.color = cambios.color;
      if (cambios.activo !== undefined) updateData.activo = cambios.activo;

      const { error } = await this.supabase
        .from('categorias')
        .update(updateData)
        .eq('numero', numero);

      if (error) throw error;

      console.log('✅ [SUPABASE] Categoría actualizada');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al actualizar categoría:', error.message);
      return false;
    }
  }

  async eliminarCategoria(numero: number): Promise<boolean> {
    try {
      console.log('🗑️ [SUPABASE] Eliminando categoría número:', numero);

      // Hard delete - elimina permanentemente
      const { error } = await this.supabase
        .from('categorias')
        .delete()
        .eq('numero', numero);

      if (error) throw error;

      console.log('✅ [SUPABASE] Categoría eliminada permanentemente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al eliminar categoría:', error.message);
      return false;
    }
  }

  // ============================================
  // ASISTENCIAS
  // ============================================

  async guardarAsistencia(asistencias: Asistencia[]): Promise<boolean> {
    try {
      console.log(`📤 [SUPABASE] Guardando ${asistencias.length} asistencias...`);

      // Usar upsert para actualizar asistencias del mismo día
      // pero mantener el historial de días diferentes
      const registros = asistencias.map(a => ({
        categoria: a.categoria,
        fecha: a.fecha,
        rut_jugador: a.rut_jugador,
        asistio: a.asistio,
        marcado_por: a.marcado_por,
      }));

      // onConflict: si existe una asistencia con (categoria, fecha, rut_jugador),
      // actualizar el valor de 'asistio'. Si no existe, insertar nuevo registro.
      const { error } = await this.supabase
        .from('asistencias')
        .upsert(registros, { 
          onConflict: 'categoria,fecha,rut_jugador',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      console.log('✅ [SUPABASE] Asistencias guardadas exitosamente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al guardar asistencias:', error.message);
      return false;
    }
  }

  async obtenerAsistenciaDelDia(categoria: number, fecha: string): Promise<{ [rut: string]: boolean } | null> {
    try {
      console.log(`📥 [SUPABASE] Obteniendo asistencia del día ${fecha}, categoría ${categoria}`);

      const { data, error } = await this.supabase
        .from('asistencias')
        .select('*')
        .eq('categoria', categoria)
        .eq('fecha', fecha);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('ℹ️ [SUPABASE] No hay asistencias para este día');
        return null;
      }

      const asistenciasObj: { [rut: string]: boolean } = {};
      data.forEach((item: any) => {
        asistenciasObj[item.rut_jugador] = item.asistio;
      });

      console.log(`✅ [SUPABASE] Asistencias obtenidas: ${data.length} registros`);
      return asistenciasObj;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al obtener asistencias:', error.message);
      return null;
    }
  }

  // ============================================
  // EXPORTACIÓN: Obtener asistencias por rango de fechas
  // ============================================

  async obtenerAsistenciasPorRango(
    fechaInicio: string,
    fechaFin: string
  ): Promise<{
    jugadores: Jugador[];
    categorias: Categoria[];
    asistencias: any[];
  } | null> {
    try {
      console.log(`📊 [SUPABASE] Obteniendo reporte de asistencias desde ${fechaInicio} hasta ${fechaFin}`);

      // Obtener asistencias del rango
      const { data: asistenciasData, error: asistenciasError } = await this.supabase
        .from('asistencias')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('categoria', { ascending: true })
        .order('fecha', { ascending: true });

      if (asistenciasError) throw asistenciasError;

      // Obtener todas las categorías
      const { data: categoriasData, error: categoriasError } = await this.supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('numero', { ascending: true });

      if (categoriasError) throw categoriasError;

      // Obtener todos los jugadores
      const { data: jugadoresData, error: jugadoresError } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('activo', true)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (jugadoresError) throw jugadoresError;

      console.log(`✅ [SUPABASE] Reporte obtenido: ${asistenciasData?.length || 0} asistencias, ${jugadoresData?.length || 0} jugadores, ${categoriasData?.length || 0} categorías`);

      return {
        asistencias: asistenciasData || [],
        jugadores: jugadoresData?.map(this.normalizarJugador) || [],
        categorias: categoriasData?.map(this.normalizarCategoria) || [],
      };
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al obtener reporte:', error.message);
      return null;
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private normalizarUsuario(data: any): Usuario {
    return {
      id: data.id,
      email: data.email,
      nombre: data.nombre,
      role: data.role,
      categoriaAsignada: data.categoria_asignada,
      categoriasAsignadas: data.categorias_asignadas || [],
      activo: data.activo !== false,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  private normalizarJugador(data: any): Jugador {
    return {
      rut: data.rut,
      nombre: data.nombre,
      categoria: data.categoria,
      numero: data.numero,
      activo: data.activo !== false,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Campos adicionales agregados
      fecha_nacimiento: data.fecha_nacimiento,
      email: data.email,
      contacto_emergencia: data.contacto_emergencia,
      tel_emergencia: data.tel_emergencia,
      sistema_salud: data.sistema_salud,
      seguro_complementario: data.seguro_complementario,
      nombre_tutor: data.nombre_tutor,
      rut_tutor: data.rut_tutor,
      tel_tutor: data.tel_tutor,
      fuma_frecuencia: data.fuma_frecuencia,
      enfermedades: data.enfermedades,
      alergias: data.alergias,
      medicamentos: data.medicamentos,
      lesiones: data.lesiones,
      actividad: data.actividad,
      autorizo_uso_imagen: data.autorizo_uso_imagen,
    };
  }

  private normalizarCategoria(data: any): Categoria {
    return {
      numero: data.numero,
      nombre: data.nombre,
      color: data.color,
      activo: data.activo !== false,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  // Test de conexión
  async testConexion(): Promise<boolean> {
    try {
      console.log('🔍 [SUPABASE] Testeando conexión...');
      
      const { data, error } = await this.supabase
        .from('categorias')
        .select('count', { count: 'exact', head: true });

      if (error) throw error;

      console.log('✅ [SUPABASE] Conexión exitosa');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error de conexión:', error.message);
      return false;
    }
  }
}

export default new SupabaseService();
