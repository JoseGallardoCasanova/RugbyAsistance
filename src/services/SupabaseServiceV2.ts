// ============================================
// SUPABASE SERVICE V2
// ============================================
// Servicio actualizado para Squad Pro Multi-Tenant
// - UUID en lugar de IDs numéricos
// - club_id en todas las queries
// - Sin soft deletes (hard deletes)
// - SHA-256 + Salt para passwords (expo-crypto)
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import ENV from '../config/env';
import { 
  User, 
  Club, 
  Jugador, 
  Categoria, 
  Asistencia 
} from '../types/v2';

class SupabaseServiceV2 {
  private supabase: SupabaseClient;
  private initialized: boolean = false;

  constructor() {
    console.log('🚀 [SUPABASE V2] Inicializando servicio...');
    console.log('🔗 [SUPABASE V2] URL:', ENV.SUPABASE_URL);
    console.log('🔑 [SUPABASE V2] ANON KEY:', ENV.SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
    this.supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    this.initialized = true;
    console.log('✅ [SUPABASE V2] Servicio inicializado');
  }

  // ============================================
  // UTILIDADES DE SEGURIDAD
  // ============================================

  private generateSalt(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < length; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }

  private async hashPassword(password: string): Promise<string> {
    // Generar salt aleatorio
    const salt = this.generateSalt();
    
    // Combinar password + salt
    const combined = password + salt;
    
    // Hash con SHA-256
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );
    
    // Retornar salt:hash para poder verificar después
    return `${salt}:${hash}`;
  }

  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      // Separar salt y hash
      const [salt, hash] = storedHash.split(':');
      
      if (!salt || !hash) {
        // Formato antiguo sin salt (texto plano o bcrypt viejo)
        // Comparar directamente como fallback
        console.log('⚠️ [VERIFY] Formato sin salt detectado, comparando directamente');
        return password === storedHash;
      }
      
      // Recrear hash con el password ingresado y el salt almacenado
      const combined = password + salt;
      const newHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
      );
      
      return newHash === hash;
    } catch (error) {
      console.error('❌ [CRYPTO] Error al verificar password:', error);
      return false;
    }
  }

  // ============================================
  // CLUBES
  // ============================================

  async getClubById(clubId: string): Promise<Club | null> {
    try {
      console.log(`🏆 [SUPABASE V2] Obteniendo club: ${clubId}`);

      const { data, error } = await this.supabase
        .from('clubes')
        .select('*')
        .eq('id', clubId)
        .single();

      if (error) {
        console.error('❌ [SUPABASE V2] Error en query clubes:', error.message);
        console.error('❌ [SUPABASE V2] Error details:', JSON.stringify(error));
      }

      if (error || !data) {
        console.warn('⚠️ [SUPABASE V2] Club no encontrado');
        return null;
      }

      console.log('✅ [SUPABASE V2] Club encontrado:', data.nombre);
      return this.mapClub(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener club:', error.message);
      return null;
    }
  }

  async getClubBySlug(slug: string): Promise<Club | null> {
    try {
      console.log(`🏆 [SUPABASE V2] Obteniendo club por slug: ${slug}`);

      const { data, error } = await this.supabase
        .from('clubes')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.warn('⚠️ [SUPABASE V2] Club no encontrado');
        return null;
      }

      console.log('✅ [SUPABASE V2] Club encontrado:', data.nombre);
      return this.mapClub(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener club:', error.message);
      return null;
    }
  }

  async updateClub(clubId: string, updates: Partial<Club>): Promise<Club | null> {
    try {
      console.log(`✏️ [SUPABASE V2] Actualizando club: ${clubId}`);

      const updateData: any = {};
      if (updates.nombre) updateData.nombre = updates.nombre;
      if (updates.logoUrl) updateData.logo_url = updates.logoUrl;
      if (updates.colorPrimario) updateData.color_primario = updates.colorPrimario;
      if (updates.colorSecundario) updateData.color_secundario = updates.colorSecundario;
      if (updates.emailContacto) updateData.email_contacto = updates.emailContacto;
      if (updates.telefono) updateData.telefono = updates.telefono;
      if (updates.direccion) updateData.direccion = updates.direccion;

      const { data, error } = await this.supabase
        .from('clubes')
        .update(updateData)
        .eq('id', clubId)
        .select()
        .single();

      if (error || !data) throw error;

      console.log('✅ [SUPABASE V2] Club actualizado');
      return this.mapClub(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al actualizar club:', error.message);
      return null;
    }
  }

  // ============================================
  // USUARIOS / AUTENTICACIÓN
  // ============================================

  /**
   * Genera un username único para el club
   * Algoritmo:
   * 1. Base: primeraLetra(nombre) + apellido (ej: Jose Gallardo -> jgallardo)
   * 2. Si existe en el club: incrementar letras del nombre (jogallardo, josgallardo, josegallardo)
   * 3. Si se acaba el nombre: agregar números (jgallardo1, jgallardo2, etc.)
   */
  async generarUsername(nombre: string, apellido: string, clubId: string): Promise<string> {
    // Normalizar: lowercase, sin espacios, sin acentos, solo letras
    const normalize = (text: string) => text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z]/g, ''); // Solo letras

    const nombreNorm = normalize(nombre);
    const apellidoNorm = normalize(apellido);

    // Intentar con incremento de letras del nombre
    for (let i = 1; i <= nombreNorm.length; i++) {
      const username = nombreNorm.substring(0, i) + apellidoNorm;
      
      // Verificar si existe en el club
      const { data } = await this.supabase
        .from('usuarios')
        .select('id')
        .eq('club_id', clubId)
        .eq('username', username)
        .single();

      if (!data) {
        // No existe, lo podemos usar
        console.log(`✅ [USERNAME] Generado: ${username}`);
        return username;
      }
    }

    // Si llegamos aquí, el nombre completo ya está usado
    // Intentar con números: jgallardo1, jgallardo2, etc.
    const baseUsername = nombreNorm.charAt(0) + apellidoNorm;
    let counter = 1;
    
    while (counter < 1000) { // Límite de seguridad
      const username = `${baseUsername}${counter}`;
      
      const { data } = await this.supabase
        .from('usuarios')
        .select('id')
        .eq('club_id', clubId)
        .eq('username', username)
        .single();

      if (!data) {
        console.log(`✅ [USERNAME] Generado con número: ${username}`);
        return username;
      }
      
      counter++;
    }

    // Caso extremo: fallback con timestamp
    const fallback = `${baseUsername}${Date.now()}`;
    console.warn(`⚠️ [USERNAME] Usando fallback: ${fallback}`);
    return fallback;
  }

  async verificarCredenciales(username: string, password: string): Promise<User | null> {
    try {
      console.log(`🔐 [SUPABASE V2] Verificando credenciales: ${username}`);

      // Buscar usuario por username (ya no por email)
      const { data, error } = await this.supabase
        .rpc('login_usuario_by_username', { 
          p_username: username
        });

      if (error) {
        console.error('❌ [SUPABASE V2] Error en RPC login:', error.message);
        console.error('❌ [SUPABASE V2] Error details:', JSON.stringify(error));
        return null;
      }

      if (!data || data.length === 0) {
        console.log('❌ [SUPABASE V2] Usuario no encontrado');
        return null;
      }

      const usuario = data[0];

      // Verificar password con bcrypt
      const passwordValido = await this.verifyPassword(password, usuario.password_hash);
      if (!passwordValido) {
        console.log('❌ [SUPABASE V2] Password incorrecto');
        return null;
      }

      // Actualizar último login
      await this.supabase
        .from('usuarios')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', usuario.id);

      console.log('✅ [SUPABASE V2] Login exitoso:', usuario.nombre);
      return this.mapUser(usuario);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al verificar credenciales:', error.message);
      return null;
    }
  }

  async recuperarUsernamePorEmail(email: string): Promise<{ username: string; nombre: string } | null> {
    try {
      console.log(`🔍 [SUPABASE V2] Buscando username para email: ${email}`);

      const { data, error } = await this.supabase
        .from('usuarios')
        .select('username, nombre')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error) {
        console.log('❌ [SUPABASE V2] Usuario no encontrado con ese email');
        return null;
      }

      console.log('✅ [SUPABASE V2] Username encontrado');
      return {
        username: data.username,
        nombre: data.nombre,
      };
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al recuperar username:', error.message);
      return null;
    }
  }

  async cambiarPassword(userId: string, passwordActual: string, passwordNuevo: string): Promise<boolean> {
    try {
      console.log('🔐 [SUPABASE V2] Cambiando password para usuario:', userId);

      // Primero, verificar que el password actual sea correcto
      const { data: usuario, error: errorGet } = await this.supabase
        .from('usuarios')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (errorGet || !usuario) {
        console.error('❌ [SUPABASE V2] Usuario no encontrado');
        return false;
      }

      // Verificar password actual
      const passwordValido = await this.verifyPassword(passwordActual, usuario.password_hash);
      if (!passwordValido) {
        console.error('❌ [SUPABASE V2] Password actual incorrecto');
        return false;
      }

      // Hashear nuevo password
      const passwordHashed = await this.hashPassword(passwordNuevo);

      // Actualizar password
      const { error } = await this.supabase
        .from('usuarios')
        .update({ password_hash: passwordHashed })
        .eq('id', userId);

      if (error) throw error;

      console.log('✅ [SUPABASE V2] Password actualizado correctamente');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al cambiar password:', error.message);
      return false;
    }
  }

  async getUsuariosByClub(clubId: string): Promise<User[]> {
    try {
      console.log(`📥 [SUPABASE V2] Obteniendo usuarios del club: ${clubId}`);

      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('club_id', clubId)
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE V2] Usuarios obtenidos: ${data?.length || 0}`);
      return (data || []).map(u => this.mapUser(u));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener usuarios:', error.message);
      return [];
    }
  }

  async crearUsuario(usuario: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
    try {
      console.log('➕ [SUPABASE V2] Creando usuario:', usuario.username || 'generando username...');

      // Generar username si no viene especificado
      let username = usuario.username;
      if (!username) {
        username = await this.generarUsername(usuario.nombre, usuario.apellido, usuario.clubId);
        console.log(`🔤 [SUPABASE V2] Username autogenerado: ${username}`);
      } else {
        // Verificar que el username no existe en el club
        const { data: existente } = await this.supabase
          .from('usuarios')
          .select('id')
          .eq('club_id', usuario.clubId)
          .eq('username', username)
          .single();

        if (existente) {
          console.error('❌ [SUPABASE V2] Username ya existe en el club');
          throw new Error(`El username "${username}" ya está en uso en este club`);
        }
      }

      // Hashear password antes de guardar (SHA-256 + Salt)
      const passwordHashed = await this.hashPassword(usuario.passwordHash);
      console.log('🔐 [SUPABASE V2] Password hasheado con SHA-256');

      const { data, error } = await this.supabase
        .from('usuarios')
        .insert([{
          club_id: usuario.clubId,
          username: username,
          email: usuario.email,
          password_hash: passwordHashed,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          foto_url: usuario.fotoUrl,
          telefono: usuario.telefono,
          role: usuario.role,
          categorias_asignadas: usuario.categoriasAsignadas || [],
        }])
        .select()
        .single();

      if (error || !data) throw error;

      console.log('✅ [SUPABASE V2] Usuario creado con username:', username);
      return this.mapUser(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al crear usuario:', error.message);
      throw error; // Propagar el error para que se maneje arriba
    }
  }

  async actualizarUsuario(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      console.log('✏️ [SUPABASE V2] Actualizando usuario:', userId);

      const updateData: any = {};
      if (updates.username) updateData.username = updates.username;
      if (updates.nombre) updateData.nombre = updates.nombre;
      if (updates.apellido) updateData.apellido = updates.apellido;
      if (updates.email) updateData.email = updates.email;
      if (updates.telefono) updateData.telefono = updates.telefono;
      if (updates.fotoUrl) updateData.foto_url = updates.fotoUrl;
      if (updates.role) updateData.role = updates.role;
      if (updates.categoriasAsignadas) updateData.categorias_asignadas = updates.categoriasAsignadas;
      
      // Hashear password si se está actualizando
      if (updates.passwordHash) {
        const passwordHashed = await this.hashPassword(updates.passwordHash);
        updateData.password_hash = passwordHashed;
        console.log('🔐 [SUPABASE V2] Password actualizado con SHA-256');
      }

      const { data, error } = await this.supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error || !data) throw error;

      console.log('✅ [SUPABASE V2] Usuario actualizado');
      return this.mapUser(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al actualizar usuario:', error.message);
      return null;
    }
  }

  async eliminarUsuario(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ [SUPABASE V2] Eliminando usuario:', userId);

      // Hard delete (sin soft delete en V2)
      const { error } = await this.supabase
        .from('usuarios')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      console.log('✅ [SUPABASE V2] Usuario eliminado');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al eliminar usuario:', error.message);
      return false;
    }
  }

  // ============================================
  // CATEGORÍAS
  // ============================================

  async getCategoriasByClub(clubId: string): Promise<Categoria[]> {
    try {
      console.log(`📥 [SUPABASE V2] Obteniendo categorías del club: ${clubId}`);

      const { data, error } = await this.supabase
        .from('categorias')
        .select('*')
        .eq('club_id', clubId)
        .order('orden', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE V2] Categorías obtenidas: ${data?.length || 0}`);
      return (data || []).map(c => this.mapCategoria(c));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener categorías:', error.message);
      return [];
    }
  }

  async crearCategoria(categoria: Omit<Categoria, 'id' | 'createdAt' | 'updatedAt'>): Promise<Categoria | null> {
    try {
      console.log('➕ [SUPABASE V2] Creando categoría:', categoria.nombre);

      const { data, error } = await this.supabase
        .from('categorias')
        .insert([{
          club_id: categoria.clubId,
          nombre: categoria.nombre,
          descripcion: categoria.descripcion,
          color: categoria.color,
          icono: categoria.icono,
          dias_entrenamiento: categoria.diasEntrenamiento || [],
          horarios: categoria.horarios,
          orden: categoria.orden,
        }])
        .select()
        .single();

      if (error || !data) throw error;

      console.log('✅ [SUPABASE V2] Categoría creada');
      return this.mapCategoria(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al crear categoría:', error.message);
      return null;
    }
  }

  async actualizarCategoria(categoriaId: string, updates: Partial<Categoria>): Promise<Categoria | null> {
    try {
      console.log('✏️ [SUPABASE V2] Actualizando categoría:', categoriaId);

      const updateData: any = {};
      if (updates.nombre) updateData.nombre = updates.nombre;
      if (updates.descripcion) updateData.descripcion = updates.descripcion;
      if (updates.color) updateData.color = updates.color;
      if (updates.icono) updateData.icono = updates.icono;
      if (updates.diasEntrenamiento) updateData.dias_entrenamiento = updates.diasEntrenamiento;
      if (updates.horarios) updateData.horarios = updates.horarios;
      if (updates.orden !== undefined) updateData.orden = updates.orden;

      const { data, error } = await this.supabase
        .from('categorias')
        .update(updateData)
        .eq('id', categoriaId)
        .select()
        .single();

      if (error || !data) throw error;

      console.log('✅ [SUPABASE V2] Categoría actualizada');
      return this.mapCategoria(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al actualizar categoría:', error.message);
      return null;
    }
  }

  async eliminarCategoria(categoriaId: string): Promise<boolean> {
    try {
      console.log('🗑️ [SUPABASE V2] Eliminando categoría:', categoriaId);

      // Hard delete
      const { error } = await this.supabase
        .from('categorias')
        .delete()
        .eq('id', categoriaId);

      if (error) throw error;

      console.log('✅ [SUPABASE V2] Categoría eliminada');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al eliminar categoría:', error.message);
      return false;
    }
  }

  // ============================================
  // JUGADORES
  // ============================================

  async getJugadoresByClub(clubId: string): Promise<Jugador[]> {
    try {
      console.log(`📥 [SUPABASE V2] Obteniendo jugadores del club: ${clubId}`);

      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('club_id', clubId)
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE V2] Jugadores obtenidos: ${data?.length || 0}`);
      return (data || []).map(j => this.mapJugador(j));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener jugadores:', error.message);
      return [];
    }
  }

  async getJugadoresByCategoria(categoriaId: string): Promise<Jugador[]> {
    try {
      console.log(`📥 [SUPABASE V2] Obteniendo jugadores de categoría: ${categoriaId}`);

      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('categoria_id', categoriaId)
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE V2] Jugadores obtenidos: ${data?.length || 0}`);
      return (data || []).map(j => this.mapJugador(j));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener jugadores:', error.message);
      return [];
    }
  }

  async crearJugador(jugador: Omit<Jugador, 'id' | 'createdAt' | 'updatedAt'>): Promise<Jugador | null> {
    try {
      console.log('➕ [SUPABASE V2] Creando jugador:', jugador.nombre);

      const { data, error } = await this.supabase
        .from('jugadores')
        .insert([{
          club_id: jugador.clubId,
          usuario_id: jugador.usuarioId,
          categoria_id: jugador.categoriaId,
          rut: jugador.rut,
          nombre: jugador.nombre,
          numero: jugador.numero,
          fecha_nacimiento: jugador.fechaNacimiento,
          email: jugador.email,
          telefono: jugador.telefono,
          contacto_emergencia: jugador.contactoEmergencia,
          tel_emergencia: jugador.telEmergencia,
          relacion_emergencia: jugador.relacionEmergencia,
          sistema_salud: jugador.sistemaSalud,
          seguro_complementario: jugador.seguroComplementario,
          nombre_tutor: jugador.nombreTutor,
          rut_tutor: jugador.rutTutor,
          tel_tutor: jugador.telTutor,
          email_tutor: jugador.emailTutor,
          fuma: jugador.fuma,
          fuma_frecuencia: jugador.fumaFrecuencia,
          enfermedades: jugador.enfermedades,
          alergias: jugador.alergias,
          medicamentos: jugador.medicamentos,
          lesiones: jugador.lesiones,
          grupo_sanguineo: jugador.grupoSanguineo,
          actividad: jugador.actividad,
          autorizo_uso_imagen: jugador.autorizoUsoImagen,
          datos_formulario_extra: jugador.datosFormularioExtra,
        }])
        .select()
        .single();

      if (error || !data) throw error;

      console.log('✅ [SUPABASE V2] Jugador creado');
      return this.mapJugador(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al crear jugador:', error.message);
      return null;
    }
  }

  async actualizarJugador(jugadorId: string, updates: Partial<Jugador>): Promise<Jugador | null> {
    try {
      console.log('✏️ [SUPABASE V2] Actualizando jugador:', jugadorId);

      const updateData: any = {};
      if (updates.rut) updateData.rut = updates.rut;
      if (updates.nombre) updateData.nombre = updates.nombre;
      if (updates.categoriaId) updateData.categoria_id = updates.categoriaId;
      if (updates.numero !== undefined) updateData.numero = updates.numero;
      if (updates.fechaNacimiento) updateData.fecha_nacimiento = updates.fechaNacimiento;
      if (updates.email) updateData.email = updates.email;
      if (updates.telefono) updateData.telefono = updates.telefono;
      if (updates.contactoEmergencia) updateData.contacto_emergencia = updates.contactoEmergencia;
      if (updates.telEmergencia) updateData.tel_emergencia = updates.telEmergencia;
      if (updates.relacionEmergencia) updateData.relacion_emergencia = updates.relacionEmergencia;
      if (updates.sistemaSalud) updateData.sistema_salud = updates.sistemaSalud;
      if (updates.seguroComplementario !== undefined) updateData.seguro_complementario = updates.seguroComplementario;
      if (updates.nombreTutor) updateData.nombre_tutor = updates.nombreTutor;
      if (updates.rutTutor) updateData.rut_tutor = updates.rutTutor;
      if (updates.telTutor) updateData.tel_tutor = updates.telTutor;
      if (updates.emailTutor) updateData.email_tutor = updates.emailTutor;
      if (updates.fuma !== undefined) updateData.fuma = updates.fuma;
      if (updates.fumaFrecuencia) updateData.fuma_frecuencia = updates.fumaFrecuencia;
      if (updates.enfermedades !== undefined) updateData.enfermedades = updates.enfermedades;
      if (updates.alergias !== undefined) updateData.alergias = updates.alergias;
      if (updates.medicamentos !== undefined) updateData.medicamentos = updates.medicamentos;
      if (updates.lesiones !== undefined) updateData.lesiones = updates.lesiones;
      if (updates.grupoSanguineo) updateData.grupo_sanguineo = updates.grupoSanguineo;
      if (updates.actividad) updateData.actividad = updates.actividad;
      if (updates.autorizoUsoImagen !== undefined) updateData.autorizo_uso_imagen = updates.autorizoUsoImagen;
      if (updates.datosFormularioExtra) updateData.datos_formulario_extra = updates.datosFormularioExtra;

      const { data, error } = await this.supabase
        .from('jugadores')
        .update(updateData)
        .eq('id', jugadorId)
        .select()
        .single();

      if (error || !data) throw error;

      console.log('✅ [SUPABASE V2] Jugador actualizado');
      return this.mapJugador(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al actualizar jugador:', error.message);
      return null;
    }
  }

  async eliminarJugador(jugadorId: string): Promise<boolean> {
    try {
      console.log('🗑️ [SUPABASE V2] Eliminando jugador:', jugadorId);

      // Hard delete
      const { error } = await this.supabase
        .from('jugadores')
        .delete()
        .eq('id', jugadorId);

      if (error) throw error;

      console.log('✅ [SUPABASE V2] Jugador eliminado');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al eliminar jugador:', error.message);
      return false;
    }
  }

  // ============================================
  // ASISTENCIAS
  // ============================================

  async guardarAsistencias(asistencias: Omit<Asistencia, 'id' | 'createdAt'>[]): Promise<boolean> {
    try {
      console.log(`📤 [SUPABASE V2] Guardando ${asistencias.length} asistencias...`);

      const registros = asistencias.map(a => ({
        club_id: a.clubId,
        categoria_id: a.categoriaId,
        jugador_id: a.jugadorId,
        fecha: a.fecha,
        asistio: a.asistio,
        marcado_por: a.marcadoPor,
        marcado_en: a.marcadoEn,
        notas: a.notas,
      }));

      const { error } = await this.supabase
        .from('asistencias')
        .upsert(registros, {
          onConflict: 'unique_jugador_fecha', // Nombre de la constraint único
          ignoreDuplicates: false,
        });

      if (error) throw error;

      console.log('✅ [SUPABASE V2] Asistencias guardadas');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al guardar asistencias:', error.message);
      return false;
    }
  }

  async getAsistenciasPorFecha(clubId: string, categoriaId: string, fecha: string): Promise<Asistencia[]> {
    try {
      console.log(`📥 [SUPABASE V2] Obteniendo asistencias: ${fecha}`);

      const { data, error } = await this.supabase
        .from('asistencias')
        .select('*')
        .eq('club_id', clubId)
        .eq('categoria_id', categoriaId)
        .eq('fecha', fecha);

      if (error) throw error;

      console.log(`✅ [SUPABASE V2] Asistencias obtenidas: ${data?.length || 0}`);
      return (data || []).map(a => this.mapAsistencia(a));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener asistencias:', error.message);
      return [];
    }
  }

  async getAsistenciasPorRango(
    clubId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<Asistencia[]> {
    try {
      console.log(`📊 [SUPABASE V2] Obteniendo asistencias: ${fechaInicio} - ${fechaFin}`);

      const { data, error } = await this.supabase
        .from('asistencias')
        .select('*')
        .eq('club_id', clubId)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true });

      if (error) throw error;

      console.log(`✅ [SUPABASE V2] Asistencias obtenidas: ${data?.length || 0}`);
      return (data || []).map(a => this.mapAsistencia(a));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener asistencias:', error.message);
      return [];
    }
  }

  // ============================================
  // MAPPERS (DB -> TypeScript)
  // ============================================

  private mapClub(data: any): Club {
    return {
      id: data.id,
      nombre: data.nombre,
      slug: data.slug,
      logoUrl: data.logo_url,
      colorPrimario: data.color_primario,
      colorSecundario: data.color_secundario,
      emailContacto: data.email_contacto,
      telefono: data.telefono,
      direccion: data.direccion,
      deporte: data.deporte,
      pais: data.pais,
      timezone: data.timezone,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapUser(data: any): User {
    return {
      id: data.id,
      clubId: data.club_id,
      username: data.username,
      email: data.email,
      passwordHash: data.password_hash,
      nombre: data.nombre,
      apellido: data.apellido || '', // Obligatorio en V2
      fotoUrl: data.foto_url,
      telefono: data.telefono,
      role: data.role,
      categoriasAsignadas: data.categorias_asignadas || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      ultimoLogin: data.ultimo_login,
    };
  }

  private mapCategoria(data: any): Categoria {
    return {
      id: data.id,
      clubId: data.club_id,
      nombre: data.nombre,
      descripcion: data.descripcion,
      color: data.color,
      icono: data.icono,
      diasEntrenamiento: data.dias_entrenamiento || [],
      horarios: data.horarios,
      orden: data.orden,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapJugador(data: any): Jugador {
    return {
      id: data.id,
      clubId: data.club_id,
      usuarioId: data.usuario_id,
      categoriaId: data.categoria_id,
      rut: data.rut,
      nombre: data.nombre,
      numero: data.numero,
      fechaNacimiento: data.fecha_nacimiento,
      email: data.email,
      telefono: data.telefono,
      contactoEmergencia: data.contacto_emergencia,
      telEmergencia: data.tel_emergencia,
      relacionEmergencia: data.relacion_emergencia,
      sistemaSalud: data.sistema_salud,
      seguroComplementario: data.seguro_complementario,
      nombreTutor: data.nombre_tutor,
      rutTutor: data.rut_tutor,
      telTutor: data.tel_tutor,
      emailTutor: data.email_tutor,
      fuma: data.fuma,
      fumaFrecuencia: data.fuma_frecuencia,
      enfermedades: data.enfermedades,
      alergias: data.alergias,
      medicamentos: data.medicamentos,
      lesiones: data.lesiones,
      grupoSanguineo: data.grupo_sanguineo,
      actividad: data.actividad,
      autorizoUsoImagen: data.autorizo_uso_imagen,
      datosFormularioExtra: data.datos_formulario_extra,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapAsistencia(data: any): Asistencia {
    return {
      id: data.id,
      clubId: data.club_id,
      categoriaId: data.categoria_id,
      jugadorId: data.jugador_id,
      fecha: data.fecha,
      asistio: data.asistio,
      marcadoPor: data.marcado_por,
      marcadoEn: data.marcado_en,
      notas: data.notas,
      createdAt: data.created_at,
    };
  }

  // ============================================
  // TEST DE CONEXIÓN
  // ============================================

  async testConexion(): Promise<boolean> {
    try {
      console.log('🔍 [SUPABASE V2] Testeando conexión...');

      const { error } = await this.supabase
        .from('clubes')
        .select('count', { count: 'exact', head: true });

      if (error) throw error;

      console.log('✅ [SUPABASE V2] Conexión exitosa');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error de conexión:', error.message);
      return false;
    }
  }
}

export default new SupabaseServiceV2();
