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

  // Getter público para acceder al cliente (usado por OrganizacionService)
  get client(): SupabaseClient {
    return this.supabase;
  }

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

  async signUp(email: string, password: string): Promise<{ data: { user: any } | null; error: any }> {
    try {
      console.log(`🔐 [SUPABASE] Registrando usuario en Auth: ${email}`);

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('❌ [SUPABASE] Error en signUp:', error.message);
        return { data: null, error };
      }

      console.log('✅ [SUPABASE] Usuario registrado en Auth:', data.user?.id);
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error en signUp:', error.message);
      return { data: null, error };
    }
  }

  async obtenerUsuarios(organizacion_id?: string | null): Promise<Usuario[]> {
    try {
      console.log('📥 [SUPABASE] Obteniendo usuarios...', organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      let query = this.supabase
        .from('usuarios')
        .select('*')
        .eq('activo', true);

      // Filtrar por organizacion_id si está presente (multi-tenant mode)
      if (organizacion_id) {
        query = query.eq('organizacion_id', organizacion_id);
      }

      const { data, error } = await query.order('id', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE] Usuarios obtenidos: ${data?.length || 0}`);
      return (data || []).map(u => this.normalizarUsuario(u));
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al obtener usuarios:', error.message);
      return [];
    }
  }

  async crearUsuario(usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>, organizacion_id?: string | null): Promise<boolean> {
    try {
      console.log('➕ [SUPABASE] Creando usuario:', usuario.email, organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      // Verificar si existe un usuario inactivo con este email
      const { data: existente, error: errorConsulta } = await this.supabase
        .from('usuarios')
        .select('id, email, activo')
        .eq('email', usuario.email)
        .single();

      if (errorConsulta && errorConsulta.code !== 'PGRST116') {
        throw errorConsulta;
      }

      if (existente) {
        if (existente.activo) {
          console.log('❌ [SUPABASE] Ya existe un usuario activo con este email');
          throw new Error('Ya existe un usuario activo con este email');
        } else {
          // Existe pero está inactivo, lo reactivamos y actualizamos
          console.log('🔄 [SUPABASE] Reactivando usuario inactivo y actualizando datos');
          const updateData: any = {
            password: usuario.password,
            nombre: usuario.nombre,
            role: usuario.role,
            categoria_asignada: usuario.categoriaAsignada,
            categorias_asignadas: usuario.categoriasAsignadas || [],
            activo: true,
            updated_at: new Date().toISOString(),
          };

          // Agregar organizacion_id si está presente
          if (organizacion_id) {
            updateData.organizacion_id = organizacion_id;
          }

          const { error: errorUpdate } = await this.supabase
            .from('usuarios')
            .update(updateData)
            .eq('id', existente.id);

          if (errorUpdate) throw errorUpdate;
          console.log('✅ [SUPABASE] Usuario reactivado y actualizado exitosamente');
          return true;
        }
      }

      // No existe, creamos uno nuevo
      const insertData: any = {
        email: usuario.email,
        password: usuario.password,
        nombre: usuario.nombre,
        role: usuario.role,
        categoria_asignada: usuario.categoriaAsignada,
        categorias_asignadas: usuario.categoriasAsignadas || [],
        activo: true,
      };

      // Agregar organizacion_id si está presente
      if (organizacion_id) {
        insertData.organizacion_id = organizacion_id;
      }

      const { error } = await this.supabase
        .from('usuarios')
        .insert([insertData]);

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

  async obtenerJugadores(organizacion_id?: string | null): Promise<Jugador[]> {
    try {
      console.log('📥 [SUPABASE] Obteniendo jugadores...', organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      let query = this.supabase
        .from('jugadores')
        .select('*')
        .eq('activo', true);

      // Filtrar por organizacion_id si está presente (multi-tenant mode)
      if (organizacion_id) {
        query = query.eq('organizacion_id', organizacion_id);
      }

      const { data, error } = await query
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

  async crearJugador(jugador: Omit<Jugador, 'created_at' | 'updated_at'>, organizacion_id?: string | null): Promise<boolean> {
    try {
      console.log('➕ [SUPABASE] Creando jugador:', jugador.nombre, organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      // Verificar si existe un jugador inactivo con este RUT
      const { data: existente, error: errorConsulta } = await this.supabase
        .from('jugadores')
        .select('rut, activo')
        .eq('rut', jugador.rut)
        .single();

      if (errorConsulta && errorConsulta.code !== 'PGRST116') {
        // Error diferente a "no encontrado"
        throw errorConsulta;
      }

      if (existente) {
        if (existente.activo) {
          // Ya existe un jugador activo con este RUT
          console.log('❌ [SUPABASE] Ya existe un jugador activo con este RUT');
          throw new Error('Ya existe un jugador activo con este RUT');
        } else {
          // Existe pero está inactivo, lo reactivamos y actualizamos
          console.log('🔄 [SUPABASE] Reactivando jugador inactivo y actualizando datos');
          const updateData: any = {
            nombre: jugador.nombre,
            categoria: jugador.categoria,
            numero: jugador.numero,
            activo: true,
            fecha_nacimiento: jugador.fecha_nacimiento,
            email: jugador.email,
            contacto_emergencia: jugador.contacto_emergencia,
            tel_emergencia: jugador.tel_emergencia,
            sistema_salud: jugador.sistema_salud,
            seguro_complementario: jugador.seguro_complementario,
            nombre_tutor: jugador.nombre_tutor,
            rut_tutor: jugador.rut_tutor,
            tel_tutor: jugador.tel_tutor,
            fuma_frecuencia: jugador.fuma_frecuencia,
            enfermedades: jugador.enfermedades,
            alergias: jugador.alergias,
            medicamentos: jugador.medicamentos,
            lesiones: jugador.lesiones,
            actividad: jugador.actividad,
            autorizo_uso_imagen: jugador.autorizo_uso_imagen,
            updated_at: new Date().toISOString(),
          };

          // Agregar organizacion_id si está presente
          if (organizacion_id) {
            updateData.organizacion_id = organizacion_id;
          }

          const { error: errorUpdate } = await this.supabase
            .from('jugadores')
            .update(updateData)
            .eq('rut', jugador.rut);

          if (errorUpdate) throw errorUpdate;
          console.log('✅ [SUPABASE] Jugador reactivado y actualizado exitosamente');
          return true;
        }
      }

      // No existe, creamos uno nuevo
      const insertData: any = {
        rut: jugador.rut,
        nombre: jugador.nombre,
        categoria: jugador.categoria,
        numero: jugador.numero,
        activo: true,
        fecha_nacimiento: jugador.fecha_nacimiento,
        email: jugador.email,
        contacto_emergencia: jugador.contacto_emergencia,
        tel_emergencia: jugador.tel_emergencia,
        sistema_salud: jugador.sistema_salud,
        seguro_complementario: jugador.seguro_complementario,
        nombre_tutor: jugador.nombre_tutor,
        rut_tutor: jugador.rut_tutor,
        tel_tutor: jugador.tel_tutor,
        fuma_frecuencia: jugador.fuma_frecuencia,
        enfermedades: jugador.enfermedades,
        alergias: jugador.alergias,
        medicamentos: jugador.medicamentos,
        lesiones: jugador.lesiones,
        actividad: jugador.actividad,
        autorizo_uso_imagen: jugador.autorizo_uso_imagen,
      };

      // Agregar organizacion_id si está presente
      if (organizacion_id) {
        insertData.organizacion_id = organizacion_id;
      }

      const { error } = await this.supabase
        .from('jugadores')
        .insert([insertData]);

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

      // Soft delete - marca como inactivo en lugar de eliminar físicamente
      const { error } = await this.supabase
        .from('jugadores')
        .update({ 
          activo: false,
          updated_at: new Date().toISOString()
        })
        .eq('rut', rut);

      if (error) throw error;

      console.log('✅ [SUPABASE] Jugador marcado como inactivo');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al eliminar jugador:', error.message);
      return false;
    }
  }

  // ============================================
  // CATEGORÍAS
  // ============================================

  async obtenerCategorias(organizacion_id?: string | null): Promise<Categoria[]> {
    try {
      console.log('📥 [SUPABASE] Obteniendo categorías...', organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      let query = this.supabase
        .from('categorias')
        .select('*')
        .eq('activo', true);

      // Filtrar por organizacion_id si está presente (multi-tenant mode)
      if (organizacion_id) {
        query = query.eq('organizacion_id', organizacion_id);
      }

      const { data, error } = await query.order('numero', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE] Categorías obtenidas: ${data?.length || 0}`);
      return (data || []).map(c => this.normalizarCategoria(c));
    } catch (error: any) {
      console.error('❌ [SUPABASE] Error al obtener categorías:', error.message);
      return [];
    }
  }

  async crearCategoria(categoria: Omit<Categoria, 'created_at' | 'updated_at'>, organizacion_id?: string | null): Promise<boolean> {
    try {
      console.log('➕ [SUPABASE] Creando categoría:', categoria.nombre, organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      // Verificar si existe una categoría inactiva con este número
      const { data: existente, error: errorConsulta } = await this.supabase
        .from('categorias')
        .select('numero, activo')
        .eq('numero', categoria.numero)
        .single();

      if (errorConsulta && errorConsulta.code !== 'PGRST116') {
        throw errorConsulta;
      }

      if (existente) {
        if (existente.activo) {
          console.log('❌ [SUPABASE] Ya existe una categoría activa con este número');
          throw new Error('Ya existe una categoría activa con este número');
        } else {
          // Existe pero está inactiva, la reactivamos y actualizamos
          console.log('🔄 [SUPABASE] Reactivando categoría inactiva y actualizando datos');
          const updateData: any = {
            nombre: categoria.nombre,
            color: categoria.color,
            activo: true,
            updated_at: new Date().toISOString(),
          };

          // Agregar organizacion_id si está presente
          if (organizacion_id) {
            updateData.organizacion_id = organizacion_id;
          }

          const { error: errorUpdate } = await this.supabase
            .from('categorias')
            .update(updateData)
            .eq('numero', categoria.numero);

          if (errorUpdate) throw errorUpdate;
          console.log('✅ [SUPABASE] Categoría reactivada y actualizada exitosamente');
          return true;
        }
      }

      // No existe, creamos una nueva
      const insertData: any = {
        numero: categoria.numero,
        nombre: categoria.nombre,
        color: categoria.color,
        activo: true,
      };

      // Agregar organizacion_id si está presente
      if (organizacion_id) {
        insertData.organizacion_id = organizacion_id;
      }

      const { error } = await this.supabase
        .from('categorias')
        .insert([insertData]);

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

  async guardarAsistencia(asistencias: Asistencia[], organizacion_id?: string | null): Promise<boolean> {
    try {
      console.log(`📤 [SUPABASE] Guardando ${asistencias.length} asistencias...`, organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      // Usar upsert para actualizar asistencias del mismo día
      // pero mantener el historial de días diferentes
      const registros = asistencias.map(a => {
        const registro: any = {
          categoria: a.categoria,
          fecha: a.fecha,
          rut_jugador: a.rut_jugador,
          asistio: a.asistio,
          marcado_por: a.marcado_por,
        };

        // Agregar organizacion_id si está presente
        if (organizacion_id) {
          registro.organizacion_id = organizacion_id;
        }

        return registro;
      });

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

  async obtenerAsistenciaDelDia(categoria: number, fecha: string, organizacion_id?: string | null): Promise<{ [rut: string]: boolean } | null> {
    try {
      console.log(`📥 [SUPABASE] Obteniendo asistencia del día ${fecha}, categoría ${categoria}`, organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      let query = this.supabase
        .from('asistencias')
        .select('*')
        .eq('categoria', categoria)
        .eq('fecha', fecha);

      // Filtrar por organizacion_id si está presente (multi-tenant mode)
      if (organizacion_id) {
        query = query.eq('organizacion_id', organizacion_id);
      }

      const { data, error } = await query;

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
    fechaFin: string,
    organizacion_id?: string | null
  ): Promise<{
    jugadores: Jugador[];
    categorias: Categoria[];
    asistencias: any[];
  } | null> {
    try {
      console.log(`📊 [SUPABASE] Obteniendo reporte de asistencias desde ${fechaInicio} hasta ${fechaFin}`, organizacion_id ? `org: ${organizacion_id}` : 'legacy mode');

      // Obtener asistencias del rango
      let queryAsistencias = this.supabase
        .from('asistencias')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);

      // Filtrar por organizacion_id si está presente
      if (organizacion_id) {
        queryAsistencias = queryAsistencias.eq('organizacion_id', organizacion_id);
      }

      const { data: asistenciasData, error: asistenciasError } = await queryAsistencias
        .order('categoria', { ascending: true })
        .order('fecha', { ascending: true });

      if (asistenciasError) throw asistenciasError;

      // Obtener todas las categorías
      let queryCategorias = this.supabase
        .from('categorias')
        .select('*')
        .eq('activo', true);

      // Filtrar por organizacion_id si está presente
      if (organizacion_id) {
        queryCategorias = queryCategorias.eq('organizacion_id', organizacion_id);
      }

      const { data: categoriasData, error: categoriasError } = await queryCategorias
        .order('numero', { ascending: true });

      if (categoriasError) throw categoriasError;

      // Obtener todos los jugadores
      let queryJugadores = this.supabase
        .from('jugadores')
        .select('*')
        .eq('activo', true);

      // Filtrar por organizacion_id si está presente
      if (organizacion_id) {
        queryJugadores = queryJugadores.eq('organizacion_id', organizacion_id);
      }

      const { data: jugadoresData, error: jugadoresError } = await queryJugadores
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
      bloqueado: data.bloqueado || false,
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

  // Bloquear/Desbloquear jugador
  async bloquearJugador(rut: string, bloqueado: boolean): Promise<boolean> {
    try {
      console.log(`🔒 [SUPABASE] ${bloqueado ? 'Bloqueando' : 'Desbloqueando'} jugador:`, rut);
      console.log('🔒 [SUPABASE] Verificando supabase client:', !!this.supabase);
      
      console.log('🔒 [SUPABASE] Ejecutando update...');
      const { data, error } = await this.supabase
        .from('jugadores')
        .update({ bloqueado, updated_at: new Date().toISOString() })
        .eq('rut', rut)
        .select();

      console.log('🔒 [SUPABASE] Update ejecutado. Error:', error, 'Data:', data);

      if (error) {
        console.error('🔒 [SUPABASE] Error en update:', error);
        throw error;
      }

      console.log(`✅ [SUPABASE] Jugador ${bloqueado ? 'bloqueado' : 'desbloqueado'} exitosamente`);
      return true;
    } catch (error: any) {
      console.error(`❌ [SUPABASE] Error al ${bloqueado ? 'bloquear' : 'desbloquear'} jugador:`, error);
      console.error(`❌ [SUPABASE] Error message:`, error?.message);
      console.error(`❌ [SUPABASE] Error stack:`, error?.stack);
      return false;
    }
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
