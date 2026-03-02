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
import * as FileSystem from 'expo-file-system';
import ENV from '../config/env';
import { 
  User, 
  Club, 
  Jugador, 
  Categoria, 
  Asistencia,
  Entrenamiento,
  FormularioConfiguracion,
  FormularioCampo,
  RelacionApoderado,
  Pago,
  ConfiguracionPagosClub,
  CodigoInvitacion,
  Aviso,
  TipoAviso,
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

  async getAllClubs(): Promise<Club[]> {
    try {
      const { data, error } = await this.supabase
        .from('clubes')
        .select('*')
        .order('nombre');
      if (error) throw error;
      return (data || []).map((d: any) => this.mapClub(d));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener todos los clubes:', error.message);
      return [];
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

  async crearClub(
    nombreClub: string,
    adminNombre: string,
    adminApellido: string,
    adminUsername: string,
    adminPassword: string,
    adminEmail: string,
    logoUri?: string
  ): Promise<{ club: Club; admin: User } | null> {
    try {
      const slug = nombreClub
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: clubData, error: clubError } = await this.supabase
        .from('clubes')
        .insert([{
          nombre: nombreClub,
          slug: `${slug}-${Date.now().toString(36)}`,
          color_primario: '#1a472a',
          color_secundario: '#2d7a4a',
          pais: 'Chile',
          timezone: 'America/Santiago',
          deporte: 'Rugby',
        }])
        .select()
        .single();

      if (clubError || !clubData) throw clubError ?? new Error('No se pudo crear el club');
      const club = this.mapClub(clubData);

      if (logoUri) {
        const logoUrl = await this.subirLogoClub(club.id, logoUri);
        if (logoUrl) {
          await this.supabase.from('clubes').update({ logo_url: logoUrl }).eq('id', club.id);
          club.logoUrl = logoUrl;
        }
      }

      const passwordHashed = await this.hashPassword(adminPassword);
      const { data: userData, error: userError } = await this.supabase
        .from('usuarios')
        .insert([{
          club_id: club.id,
          username: adminUsername,
          password_hash: passwordHashed,
          nombre: adminNombre,
          apellido: adminApellido,
          email: adminEmail,
          role: 'admin_club',
          categorias_asignadas: [],
        }])
        .select()
        .single();

      if (userError || !userData) throw userError ?? new Error('No se pudo crear el admin');
      const admin = this.mapUser(userData);
      return { club, admin };
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al crear club:', error.message);
      return null;
    }
  }

  async subirLogoClub(clubId: string, imageUri: string): Promise<string | null> {
    try {
      const ext = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const path = `logos/${clubId}.${ext}`;

      // React Native: blob.arrayBuffer() no existe → leer con expo-file-system en base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convertir base64 → Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error } = await this.supabase.storage
        .from('club-logos')
        .upload(path, bytes, { contentType: `image/${ext}`, upsert: true });

      if (error) throw error;
      const { data } = this.supabase.storage.from('club-logos').getPublicUrl(path);
      return data.publicUrl ?? null;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al subir logo:', error.message);
      return null;
    }
  }

  async autoCrearUsuarioJugador(
    clubId: string,
    jugadorId: string,
    nombre: string,
    apellido: string,
    email?: string,
    customUsername?: string,
    customPassword?: string
  ): Promise<{ user: User; plainPassword: string } | null> {
    const plainPassword = customPassword?.trim() || 'jugador123';
    try {
      const nuevoUsuario = await this.crearUsuario({
        clubId,
        username: customUsername?.trim() || '',
        email: email ?? '',
        passwordHash: plainPassword,
        nombre,
        apellido,
        role: 'jugador',
        categoriasAsignadas: [],
      });
      if (!nuevoUsuario) throw new Error('No se pudo crear el usuario');
      await this.actualizarJugador(jugadorId, { usuarioId: nuevoUsuario.id });
      return { user: nuevoUsuario, plainPassword };
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al auto-crear usuario jugador:', error.message);
      return null;
    }
  }

  async generarCodigoInvitacion(creadoPorId: string): Promise<CodigoInvitacion | null> {
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const grupo = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const codigo = `${grupo()}-${grupo()}-${grupo()}`;

      const { data, error } = await this.supabase
        .from('codigos_invitacion')
        .insert([{ codigo, creado_por_id: creadoPorId }])
        .select()
        .single();

      if (error || !data) throw error;
      return this.mapCodigoInvitacion(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al generar código:', error.message);
      return null;
    }
  }

  async getCodigosInvitacion(): Promise<CodigoInvitacion[]> {
    try {
      const { data, error } = await this.supabase
        .from('codigos_invitacion')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => this.mapCodigoInvitacion(c));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener códigos:', error.message);
      return [];
    }
  }

  async validarCodigoInvitacion(codigo: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('codigos_invitacion')
        .select('id, usado')
        .eq('codigo', codigo.toUpperCase().trim())
        .maybeSingle();
      if (error || !data) return false;
      return !data.usado;
    } catch {
      return false;
    }
  }

  async marcarCodigoUsado(codigo: string, clubId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('codigos_invitacion')
        .update({ usado: true, club_id_creado: clubId })
        .eq('codigo', codigo.toUpperCase().trim());
      return !error;
    } catch {
      return false;
    }
  }

  private mapCodigoInvitacion(data: any): CodigoInvitacion {
    return {
      id: data.id,
      codigo: data.codigo,
      usado: data.usado,
      clubIdCreado: data.club_id_creado,
      creadoPorId: data.creado_por_id,
      createdAt: data.created_at,
    };
  }

  // ============================================
  // AVISOS DEL CLUB
  // ============================================

  async getAvisosByClub(clubId: string, soloActivos = true): Promise<Aviso[]> {
    try {
      let query = this.supabase
        .from('avisos')
        .select(`*, usuarios(nombre, apellido)`)
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });
      if (soloActivos) query = query.eq('activo', true);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(a => this.mapAviso(a));
    } catch (error: any) {
      console.error('❌ [AVISOS] getAvisosByClub:', error.message);
      return [];
    }
  }

  async crearAviso(
    clubId: string,
    autorId: string,
    titulo: string,
    contenido: string,
    tipo: TipoAviso = 'info'
  ): Promise<Aviso | null> {
    try {
      const { data, error } = await this.supabase
        .from('avisos')
        .insert({ club_id: clubId, autor_id: autorId, titulo, contenido, tipo, activo: true })
        .select(`*, usuarios(nombre, apellido)`)
        .single();
      if (error) throw error;
      return this.mapAviso(data);
    } catch (error: any) {
      console.error('❌ [AVISOS] crearAviso:', error.message);
      return null;
    }
  }

  async actualizarAviso(
    id: string,
    titulo: string,
    contenido: string,
    tipo: TipoAviso,
    activo: boolean
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('avisos')
        .update({ titulo, contenido, tipo, activo, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [AVISOS] actualizarAviso:', error.message);
      return false;
    }
  }

  async eliminarAviso(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('avisos').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [AVISOS] eliminarAviso:', error.message);
      return false;
    }
  }

  private mapAviso(data: any): Aviso {
    const usuario = data.usuarios;
    return {
      id: data.id,
      clubId: data.club_id,
      autorId: data.autor_id,
      autorNombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : undefined,
      titulo: data.titulo,
      contenido: data.contenido,
      tipo: data.tipo as TipoAviso,
      activo: data.activo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
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
        .select('*, jugadores(count)')
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
      if (updates.usuarioId !== undefined) updateData.usuario_id = updates.usuarioId || null;
      if (updates.descuentoPersonal !== undefined) updateData.descuento_personal = updates.descuentoPersonal;
      if (updates.notaDescuento !== undefined) updateData.nota_descuento = updates.notaDescuento || null;

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

  async getJugadorById(jugadorId: string): Promise<Jugador | null> {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('id', jugadorId)
        .single();
      if (error) throw error;
      return this.mapJugador(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener jugador por ID:', error.message);
      return null;
    }
  }

  async findJugadorByRUT(clubId: string, rut: string): Promise<Jugador | null> {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('club_id', clubId)
        .eq('rut', rut.trim())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return this.mapJugador(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al buscar jugador por RUT:', error.message);
      return null;
    }
  }

  async getJugadorByUsuarioId(usuarioId: string): Promise<Jugador | null> {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('usuario_id', usuarioId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return this.mapJugador(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener jugador por usuarioId:', error.message);
      return null;
    }
  }

  // ============================================
  // RELACIONES APODERADO
  // ============================================

  async getRelacionesByApoderado(apoderadoId: string): Promise<{ relacion: RelacionApoderado; jugador: Jugador }[]> {
    try {
      const { data, error } = await this.supabase
        .from('relaciones_apoderado')
        .select(`
          *,
          jugadores (*)
        `)
        .eq('apoderado_id', apoderadoId);
      if (error) throw error;
      if (!data) return [];

      return data.map((row: any) => ({
        relacion: {
          id: row.id,
          clubId: row.club_id,
          apoderadoId: row.apoderado_id,
          jugadorId: row.jugador_id,
          tipoRelacion: row.tipo_relacion,
          puedeAutorizarPagos: row.puede_autorizar_pagos,
          puedeVerAsistencia: row.puede_ver_asistencia,
          esContactoEmergencia: row.es_contacto_emergencia,
          createdAt: row.created_at,
        } as RelacionApoderado,
        jugador: this.mapJugador(row.jugadores),
      }));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener relaciones apoderado:', error.message);
      return [];
    }
  }

  async vincularApoderadoJugador(
    clubId: string,
    apoderadoId: string,
    jugadorId: string,
    tipoRelacion: RelacionApoderado['tipoRelacion'] = 'padre'
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('relaciones_apoderado')
        .insert([{
          club_id: clubId,
          apoderado_id: apoderadoId,
          jugador_id: jugadorId,
          tipo_relacion: tipoRelacion,
          puede_autorizar_pagos: true,
          puede_ver_asistencia: true,
          es_contacto_emergencia: false,
        }]);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al vincular apoderado-jugador:', error.message);
      return false;
    }
  }

  async desvincularApoderadoJugador(apoderadoId: string, jugadorId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('relaciones_apoderado')
        .delete()
        .eq('apoderado_id', apoderadoId)
        .eq('jugador_id', jugadorId);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al desvincular apoderado-jugador:', error.message);
      return false;
    }
  }

  async getApoderadosByJugador(jugadorId: string): Promise<{ relacion: RelacionApoderado; apoderado: User }[]> {
    try {
      const { data, error } = await this.supabase
        .from('relaciones_apoderado')
        .select(`
          *,
          usuarios (*)
        `)
        .eq('jugador_id', jugadorId);
      if (error) throw error;
      if (!data) return [];

      return data.map((row: any) => ({
        relacion: {
          id: row.id,
          clubId: row.club_id,
          apoderadoId: row.apoderado_id,
          jugadorId: row.jugador_id,
          tipoRelacion: row.tipo_relacion,
          puedeAutorizarPagos: row.puede_autorizar_pagos,
          puedeVerAsistencia: row.puede_ver_asistencia,
          esContactoEmergencia: row.es_contacto_emergencia,
          createdAt: row.created_at,
        } as RelacionApoderado,
        apoderado: this.mapUser(row.usuarios),
      }));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener apoderados del jugador:', error.message);
      return [];
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

  async getAsistenciasByJugador(
    clubId: string,
    jugadorId: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<Asistencia[]> {
    try {
      let query = this.supabase
        .from('asistencias')
        .select('*')
        .eq('club_id', clubId)
        .eq('jugador_id', jugadorId)
        .order('fecha', { ascending: false });

      if (fechaInicio) query = query.gte('fecha', fechaInicio);
      if (fechaFin) query = query.lte('fecha', fechaFin);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(a => this.mapAsistencia(a));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener asistencias del jugador:', error.message);
      return [];
    }
  }

  // ============================================
  // PAGOS
  // ============================================

  async getConfigPagosByClub(clubId: string): Promise<ConfiguracionPagosClub | null> {
    try {
      const { data, error } = await this.supabase
        .from('configuracion_pagos_club')
        .select('*')
        .eq('club_id', clubId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        clubId: data.club_id,
        proveedor: data.proveedor,
        precioMatricula: data.precio_matricula,
        precioMensualidad: data.precio_mensualidad,
        precioAnual: data.precio_anual,
        descuentoAnualPorcentaje: data.descuento_anual_porcentaje ?? 0,
        descuentoMensualidad: data.descuento_mensualidad ?? 0,
        descuentoMensualidadInicio: data.descuento_mensualidad_inicio ?? undefined,
        descuentoMensualidadFin: data.descuento_mensualidad_fin ?? undefined,
        descuentoMensualidadActivo: data.descuento_mensualidad_activo ?? false,
        descuentoMatricula: data.descuento_matricula ?? 0,
        descuentoMatriculaInicio: data.descuento_matricula_inicio ?? undefined,
        descuentoMatriculaFin: data.descuento_matricula_fin ?? undefined,
        descuentoMatriculaActivo: data.descuento_matricula_activo ?? false,
        descuentoAnual: data.descuento_anual ?? 0,
        descuentoAnualInicio: data.descuento_anual_inicio ?? undefined,
        descuentoAnualFin: data.descuento_anual_fin ?? undefined,
        descuentoAnualActivo: data.descuento_anual_activo ?? false,
        matriculaActiva: data.matricula_activa ?? true,
        mensualidadActiva: data.mensualidad_activa ?? true,
        anualActivo: data.anual_activo ?? false,
        moneda: data.moneda ?? 'CLP',
        activo: data.activo ?? false,
        modoPrueba: data.modo_prueba ?? true,
        credencialesEncriptadas: data.credenciales_encriptadas,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener config pagos:', error.message);
      return null;
    }
  }

  async upsertConfigPagos(clubId: string, config: Partial<ConfiguracionPagosClub>): Promise<boolean> {
    try {
      const payload = {
        club_id: clubId,
        proveedor: config.proveedor ?? 'mercadopago',
        precio_matricula: config.precioMatricula,
        precio_mensualidad: config.precioMensualidad,
        precio_anual: config.precioAnual,
        descuento_anual_porcentaje: config.descuentoAnualPorcentaje ?? 0,
        descuento_mensualidad: config.descuentoMensualidad ?? 0,
        descuento_mensualidad_inicio: config.descuentoMensualidadInicio || null,
        descuento_mensualidad_fin: config.descuentoMensualidadFin || null,
        descuento_mensualidad_activo: config.descuentoMensualidadActivo ?? false,
        descuento_matricula: config.descuentoMatricula ?? 0,
        descuento_matricula_inicio: config.descuentoMatriculaInicio || null,
        descuento_matricula_fin: config.descuentoMatriculaFin || null,
        descuento_matricula_activo: config.descuentoMatriculaActivo ?? false,
        descuento_anual: config.descuentoAnual ?? 0,
        descuento_anual_inicio: config.descuentoAnualInicio || null,
        descuento_anual_fin: config.descuentoAnualFin || null,
        descuento_anual_activo: config.descuentoAnualActivo ?? false,
        matricula_activa: config.matriculaActiva ?? true,
        mensualidad_activa: config.mensualidadActiva ?? true,
        anual_activo: config.anualActivo ?? false,
        moneda: config.moneda ?? 'CLP',
        activo: config.activo ?? false,
        modo_prueba: config.modoPrueba ?? true,
      };

      // Buscar fila existente por club_id
      const { data: existing } = await this.supabase
        .from('configuracion_pagos_club')
        .select('id')
        .eq('club_id', clubId)
        .maybeSingle();

      let error;
      if (existing?.id) {
        // UPDATE usando el id primario — más compatible con RLS
        ({ error } = await this.supabase
          .from('configuracion_pagos_club')
          .update(payload)
          .eq('id', existing.id));
      } else {
        ({ error } = await this.supabase
          .from('configuracion_pagos_club')
          .insert(payload));
      }

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al guardar config pagos:', error.message);
      return false;
    }
  }

  async crearPago(pago: Omit<Pago, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pago | null> {
    try {
      const { data, error } = await this.supabase
        .from('pagos')
        .insert([{
          club_id: pago.clubId,
          pagador_id: pago.pagadorId,
          beneficiarios: pago.beneficiarios,
          tipo: pago.tipo,
          monto: pago.monto,
          moneda: pago.moneda ?? 'CLP',
          estado: pago.estado,
          proveedor_pago: pago.proveedorPago ?? 'simulado',
          transaction_id: pago.transactionId,
          payment_method: pago.paymentMethod,
          metadata_pago: pago.metadataPago,
          fecha_pago: pago.fechaPago,
        }])
        .select()
        .single();
      if (error) throw error;
      return this.mapPago(data);
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al crear pago:', error.message);
      return null;
    }
  }

  async getPagosByClub(clubId: string): Promise<Pago[]> {
    try {
      const { data, error } = await this.supabase
        .from('pagos')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => this.mapPago(p));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener pagos:', error.message);
      return [];
    }
  }

  async getPagosByApoderado(clubId: string, pagadorId: string): Promise<Pago[]> {
    try {
      const { data, error } = await this.supabase
        .from('pagos')
        .select('*')
        .eq('club_id', clubId)
        .eq('pagador_id', pagadorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => this.mapPago(p));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener pagos del apoderado:', error.message);
      return [];
    }
  }

  async getPagosByJugador(clubId: string, jugadorId: string): Promise<Pago[]> {
    try {
      const { data, error } = await this.supabase
        .from('pagos')
        .select('*')
        .eq('club_id', clubId)
        .contains('beneficiarios', [jugadorId])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => this.mapPago(p));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener pagos del jugador:', error.message);
      return [];
    }
  }

  async actualizarEstadoPago(pagoId: string, estado: Pago['estado'], notas?: string): Promise<boolean> {
    try {
      const update: any = { estado };
      if (estado === 'pagado') update.fecha_pago = new Date().toISOString().split('T')[0];
      if (notas) update.metadata_pago = { notas };
      const { error } = await this.supabase
        .from('pagos')
        .update(update)
        .eq('id', pagoId);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al actualizar estado pago:', error.message);
      return false;
    }
  }

  private mapPago(data: any): Pago {
    return {
      id: data.id,
      clubId: data.club_id,
      pagadorId: data.pagador_id,
      beneficiarios: data.beneficiarios ?? [],
      tipo: data.tipo,
      monto: data.monto,
      moneda: data.moneda ?? 'CLP',
      estado: data.estado,
      proveedorPago: data.proveedor_pago,
      transactionId: data.transaction_id,
      paymentMethod: data.payment_method,
      metadataPago: data.metadata_pago,
      fechaPago: data.fecha_pago,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
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
      totalJugadores: Array.isArray(data.jugadores) ? (data.jugadores[0]?.count ?? 0) : undefined,
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
      descuentoPersonal: data.descuento_personal ?? 0,
      notaDescuento: data.nota_descuento,
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
  // ESTADÍSTICAS DE ASISTENCIA
  // ============================================

  /**
   * Obtiene estadísticas generales de una categoría
   */
  async getEstadisticasCategoria(
    clubId: string, 
    categoriaId: string, 
    fechaInicio?: string, 
    fechaFin?: string
  ): Promise<{
    totalJugadores: number;
    totalSesiones: number;
    promedioAsistencia: number;
    mejorAsistencia: { jugadorId: string; porcentaje: number } | null;
    peorAsistencia: { jugadorId: string; porcentaje: number } | null;
  }> {
    try {
      console.log(`📊 [ESTADÍSTICAS] Calculando para categoría: ${categoriaId}`);

      // Query base
      let query = this.supabase
        .from('asistencias')
        .select('*')
        .eq('club_id', clubId)
        .eq('categoria_id', categoriaId);

      if (fechaInicio) query = query.gte('fecha', fechaInicio);
      if (fechaFin) query = query.lte('fecha', fechaFin);

      const { data: asistencias, error } = await query;
      if (error) throw error;

      if (!asistencias || asistencias.length === 0) {
        return {
          totalJugadores: 0,
          totalSesiones: 0,
          promedioAsistencia: 0,
          mejorAsistencia: null,
          peorAsistencia: null,
        };
      }

      // Calcular estadísticas
      const jugadoresUnicos = new Set(asistencias.map(a => a.jugador_id));
      const fechasUnicas = new Set(asistencias.map(a => a.fecha));
      
      const totalAsistencias = asistencias.filter(a => a.asistio).length;
      const totalPosibles = asistencias.length;
      const promedioAsistencia = (totalAsistencias / totalPosibles) * 100;

      // Calcular por jugador
      const estadisticasPorJugador = new Map<string, { presentes: number; total: number }>();
      asistencias.forEach(a => {
        const stats = estadisticasPorJugador.get(a.jugador_id) || { presentes: 0, total: 0 };
        stats.total++;
        if (a.asistio) stats.presentes++;
        estadisticasPorJugador.set(a.jugador_id, stats);
      });

      // Encontrar mejor y peor
      let mejorAsistencia: { jugadorId: string; porcentaje: number } | null = null;
      let peorAsistencia: { jugadorId: string; porcentaje: number } | null = null;

      estadisticasPorJugador.forEach((stats, jugadorId) => {
        const porcentaje = (stats.presentes / stats.total) * 100;
        
        if (!mejorAsistencia || porcentaje > mejorAsistencia.porcentaje) {
          mejorAsistencia = { jugadorId, porcentaje };
        }
        
        if (!peorAsistencia || porcentaje < peorAsistencia.porcentaje) {
          peorAsistencia = { jugadorId, porcentaje };
        }
      });

      return {
        totalJugadores: jugadoresUnicos.size,
        totalSesiones: fechasUnicas.size,
        promedioAsistencia: Math.round(promedioAsistencia * 10) / 10,
        mejorAsistencia,
        peorAsistencia,
      };
    } catch (error: any) {
      console.error('❌ [ESTADÍSTICAS] Error:', error.message);
      return {
        totalJugadores: 0,
        totalSesiones: 0,
        promedioAsistencia: 0,
        mejorAsistencia: null,
        peorAsistencia: null,
      };
    }
  }

  /**
   * Obtiene estadísticas de un jugador específico
   */
  async getEstadisticasJugador(
    clubId: string,
    jugadorId: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<{
    totalSesiones: number;
    sesionesPresente: number;
    sesionesAusente: number;
    porcentajeAsistencia: number;
    rachaActual: number;
    mejorRacha: number;
  }> {
    try {
      let query = this.supabase
        .from('asistencias')
        .select('*')
        .eq('club_id', clubId)
        .eq('jugador_id', jugadorId)
        .order('fecha', { ascending: true });

      if (fechaInicio) query = query.gte('fecha', fechaInicio);
      if (fechaFin) query = query.lte('fecha', fechaFin);

      const { data: asistencias, error } = await query;
      if (error) throw error;

      if (!asistencias || asistencias.length === 0) {
        return {
          totalSesiones: 0,
          sesionesPresente: 0,
          sesionesAusente: 0,
          porcentajeAsistencia: 0,
          rachaActual: 0,
          mejorRacha: 0,
        };
      }

      const presentes = asistencias.filter(a => a.asistio).length;
      const ausentes = asistencias.length - presentes;
      const porcentaje = (presentes / asistencias.length) * 100;

      // Calcular rachas
      let rachaActual = 0;
      let mejorRacha = 0;
      let rachaTemp = 0;

      for (let i = asistencias.length - 1; i >= 0; i--) {
        if (asistencias[i].asistio) {
          rachaTemp++;
          if (i === asistencias.length - 1) rachaActual = rachaTemp;
          mejorRacha = Math.max(mejorRacha, rachaTemp);
        } else {
          if (i === asistencias.length - 1) rachaActual = 0;
          rachaTemp = 0;
        }
      }

      return {
        totalSesiones: asistencias.length,
        sesionesPresente: presentes,
        sesionesAusente: ausentes,
        porcentajeAsistencia: Math.round(porcentaje * 10) / 10,
        rachaActual,
        mejorRacha,
      };
    } catch (error: any) {
      console.error('❌ [ESTADÍSTICAS] Error jugador:', error.message);
      return {
        totalSesiones: 0,
        sesionesPresente: 0,
        sesionesAusente: 0,
        porcentajeAsistencia: 0,
        rachaActual: 0,
        mejorRacha: 0,
      };
    }
  }

  /**
   * Obtiene ranking de jugadores por asistencia
   */
  async getRankingAsistencia(
    clubId: string,
    categoriaId: string,
    fechaInicio?: string,
    fechaFin?: string,
    limite: number = 10
  ): Promise<Array<{
    jugadorId: string;
    totalSesiones: number;
    sesionesPresente: number;
    porcentajeAsistencia: number;
  }>> {
    try {
      let query = this.supabase
        .from('asistencias')
        .select('*')
        .eq('club_id', clubId)
        .eq('categoria_id', categoriaId);

      if (fechaInicio) query = query.gte('fecha', fechaInicio);
      if (fechaFin) query = query.lte('fecha', fechaFin);

      const { data: asistencias, error } = await query;
      if (error) throw error;

      if (!asistencias || asistencias.length === 0) return [];

      // Agrupar por jugador
      const statsPorJugador = new Map<string, { total: number; presentes: number }>();
      
      asistencias.forEach(a => {
        const stats = statsPorJugador.get(a.jugador_id) || { total: 0, presentes: 0 };
        stats.total++;
        if (a.asistio) stats.presentes++;
        statsPorJugador.set(a.jugador_id, stats);
      });

      // Convertir a array y ordenar
      const ranking = Array.from(statsPorJugador.entries())
        .map(([jugadorId, stats]) => ({
          jugadorId,
          totalSesiones: stats.total,
          sesionesPresente: stats.presentes,
          porcentajeAsistencia: Math.round((stats.presentes / stats.total) * 1000) / 10,
        }))
        .sort((a, b) => b.porcentajeAsistencia - a.porcentajeAsistencia)
        .slice(0, limite);

      return ranking;
    } catch (error: any) {
      console.error('❌ [ESTADÍSTICAS] Error ranking:', error.message);
      return [];
    }
  }

  /**
   * Obtiene tendencias de asistencia en el tiempo (agrupado por semana)
   */
  async getTendenciasAsistencia(
    clubId: string,
    categoriaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<Array<{
    periodo: string;
    totalSesiones: number;
    totalPresentes: number;
    porcentajeAsistencia: number;
  }>> {
    try {
      const { data: asistencias, error } = await this.supabase
        .from('asistencias')
        .select('*')
        .eq('club_id', clubId)
        .eq('categoria_id', categoriaId)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true });

      if (error) throw error;
      if (!asistencias || asistencias.length === 0) return [];

      // Agrupar por semana
      const statsPorSemana = new Map<string, { total: number; presentes: number }>();
      
      asistencias.forEach(a => {
        const fecha = new Date(a.fecha);
        // Obtener número de semana del año
        const inicioAnio = new Date(fecha.getFullYear(), 0, 1);
        const dias = Math.floor((fecha.getTime() - inicioAnio.getTime()) / (24 * 60 * 60 * 1000));
        const semana = Math.ceil((dias + inicioAnio.getDay() + 1) / 7);
        const periodo = `${fecha.getFullYear()}-S${semana}`;
        
        const stats = statsPorSemana.get(periodo) || { total: 0, presentes: 0 };
        stats.total++;
        if (a.asistio) stats.presentes++;
        statsPorSemana.set(periodo, stats);
      });

      // Convertir a array
      return Array.from(statsPorSemana.entries())
        .map(([periodo, stats]) => ({
          periodo,
          totalSesiones: stats.total,
          totalPresentes: stats.presentes,
          porcentajeAsistencia: Math.round((stats.presentes / stats.total) * 1000) / 10,
        }))
        .sort((a, b) => a.periodo.localeCompare(b.periodo));
    } catch (error: any) {
      console.error('❌ [ESTADÍSTICAS] Error tendencias:', error.message);
      return [];
    }
  }

  // ============================================
  // ENTRENAMIENTOS
  // ============================================

  async getEntrenamientosByCategoria(
    clubId: string,
    categoriaId: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('entrenamientos')
        .select('*')
        .eq('club_id', clubId)
        .eq('categoria_id', categoriaId)
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true });

      if (fechaInicio) query = query.gte('fecha', fechaInicio);
      if (fechaFin) query = query.lte('fecha', fechaFin);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        clubId: e.club_id,
        categoriaId: e.categoria_id,
        fecha: e.fecha,
        horaInicio: e.hora_inicio,
        horaFin: e.hora_fin,
        ubicacion: e.ubicacion,
        descripcion: e.descripcion,
        estado: e.estado || 'programado',
        creadoPor: e.creado_por,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));
    } catch (error: any) {
      console.error('❌ [ENTRENAMIENTOS] Error al obtener:', error.message);
      return [];
    }
  }

  async getEntrenamientosByMes(
    clubId: string,
    categoriaId: string,
    anio: number,
    mes: number // 1-12
  ): Promise<any[]> {
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-${ultimoDia}`;
    return this.getEntrenamientosByCategoria(clubId, categoriaId, fechaInicio, fechaFin);
  }

  async crearEntrenamiento(
    clubId: string,
    datos: {
      categoriaId: string;
      fecha: string;
      horaInicio?: string;
      horaFin?: string;
      ubicacion?: string;
      descripcion?: string;
      creadoPor?: string;
    }
  ): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('entrenamientos')
        .insert({
          club_id: clubId,
          categoria_id: datos.categoriaId,
          fecha: datos.fecha,
          hora_inicio: datos.horaInicio || null,
          hora_fin: datos.horaFin || null,
          ubicacion: datos.ubicacion || null,
          descripcion: datos.descripcion || null,
          estado: 'programado',
          creado_por: datos.creadoPor || null,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ [ENTRENAMIENTOS] Creado:', data.id);
      return data;
    } catch (error: any) {
      console.error('❌ [ENTRENAMIENTOS] Error al crear:', error.message);
      return null;
    }
  }

  async actualizarEntrenamiento(
    entrenamientoId: string,
    datos: {
      fecha?: string;
      horaInicio?: string;
      horaFin?: string;
      ubicacion?: string;
      descripcion?: string;
      estado?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('entrenamientos')
        .update({
          ...(datos.fecha && { fecha: datos.fecha }),
          hora_inicio: datos.horaInicio ?? null,
          hora_fin: datos.horaFin ?? null,
          ubicacion: datos.ubicacion ?? null,
          descripcion: datos.descripcion ?? null,
          ...(datos.estado && { estado: datos.estado }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', entrenamientoId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [ENTRENAMIENTOS] Error al actualizar:', error.message);
      return false;
    }
  }

  async eliminarEntrenamiento(entrenamientoId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('entrenamientos')
        .delete()
        .eq('id', entrenamientoId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [ENTRENAMIENTOS] Error al eliminar:', error.message);
      return false;
    }
  }

  // ============================================
  // TEST DE CONEXIÓN
  // ============================================

  // ============================================
  // FORMULARIOS CONFIGURACIÓN
  // ============================================

  async getFormularioByClub(clubId: string): Promise<FormularioConfiguracion | null> {
    try {
      const { data, error } = await this.supabase
        .from('formularios_configuracion')
        .select('*')
        .eq('club_id', clubId)
        .eq('activo', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      // La BD guarda { "campos": [...] } por el check constraint jsonb_typeof = 'object'
      const camposArray: FormularioCampo[] =
        Array.isArray(data.campos) ? data.campos
        : (data.campos?.campos ?? []);

      return {
        id: data.id,
        clubId: data.club_id,
        nombre: data.nombre,
        descripcion: data.descripcion,
        campos: camposArray,
        activo: data.activo,
        version: data.version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
      };
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener formulario:', error.message);
      return null;
    }
  }

  async guardarFormulario(
    clubId: string,
    campos: FormularioCampo[],
    nombre: string = 'Formulario de inscripción'
  ): Promise<boolean> {
    try {
      // Buscar si ya existe
      const existing = await this.getFormularioByClub(clubId);

      // El check constraint exige jsonb_typeof(campos) = 'object', por eso se
      // envuelve el array en { "campos": [...] }
      const camposJson = { campos };

      if (existing) {
        const { error } = await this.supabase
          .from('formularios_configuracion')
          .update({
            campos: camposJson,
            nombre,
            version: existing.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await this.supabase
          .from('formularios_configuracion')
          .insert([{
            club_id: clubId,
            nombre,
            campos: camposJson,
            activo: true,
            version: 1,
          }]);
        if (error) throw error;
      }

      console.log('✅ [SUPABASE V2] Formulario guardado');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al guardar formulario:', error.message);
      return false;
    }
  }

  // ============================================
  // EVALUACIONES
  // ============================================

  /** Crear una nueva evaluación (jugador → entrenador) */
  async crearEvaluacion(data: {
    clubId: string;
    categoriaId: string;
    evaluadorId: string;
    evaluadoId: string;
    puntuacion: number;
    comentario?: string;
  }): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('evaluaciones')
        .insert([{
          club_id: data.clubId,
          categoria_id: data.categoriaId,
          evaluador_id: data.evaluadorId,
          evaluado_id: data.evaluadoId,
          puntuacion: data.puntuacion,
          comentario: data.comentario ?? null,
        }]);
      if (error) throw error;
      console.log('✅ [SUPABASE V2] Evaluación creada');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al crear evaluación:', error.message);
      return false;
    }
  }

  /** Verificar si el evaluador ya calificó a este entrenador en esta categoría */
  async getMyEvaluacion(
    evaluadorId: string,
    evaluadoId: string,
    categoriaId: string
  ): Promise<{ id: string; puntuacion: number; comentario?: string; createdAt: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('evaluaciones')
        .select('id, puntuacion, comentario, created_at')
        .eq('evaluador_id', evaluadorId)
        .eq('evaluado_id', evaluadoId)
        .eq('categoria_id', categoriaId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { id: data.id, puntuacion: data.puntuacion, comentario: data.comentario, createdAt: data.created_at };
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al verificar evaluación propia:', error.message);
      return null;
    }
  }

  /** Resumen agregado (anonimizado): promedio, total, distribución 1-5 */
  async getEvaluacionesResumen(
    evaluadoId: string,
    categoriaId: string
  ): Promise<{ promedio: number; total: number; distribucion: Record<number, number> } | null> {
    try {
      const { data, error } = await this.supabase
        .from('evaluaciones')
        .select('puntuacion')
        .eq('evaluado_id', evaluadoId)
        .eq('categoria_id', categoriaId);
      if (error) throw error;
      if (!data || data.length === 0) return { promedio: 0, total: 0, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

      const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let suma = 0;
      for (const row of data) {
        suma += row.puntuacion;
        distribucion[row.puntuacion] = (distribucion[row.puntuacion] || 0) + 1;
      }
      return { promedio: Math.round((suma / data.length) * 10) / 10, total: data.length, distribucion };
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener resumen evaluaciones:', error.message);
      return null;
    }
  }

  /** Detalle completo con nombre del evaluador (solo para admins) */
  async getEvaluacionesDetalle(
    evaluadoId: string,
    categoriaId: string
  ): Promise<{
    id: string;
    puntuacion: number;
    comentario?: string;
    createdAt: string;
    evaluador: { id: string; nombre: string; username: string };
  }[]> {
    try {
      const { data, error } = await this.supabase
        .from('evaluaciones')
        .select(`
          id,
          puntuacion,
          comentario,
          created_at,
          usuarios!evaluaciones_evaluador_id_fkey (id, nombre, username)
        `)
        .eq('evaluado_id', evaluadoId)
        .eq('categoria_id', categoriaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data) return [];

      return data.map((row: any) => ({
        id: row.id,
        puntuacion: row.puntuacion,
        comentario: row.comentario ?? undefined,
        createdAt: row.created_at,
        evaluador: {
          id: row.usuarios?.id ?? row.evaluador_id,
          nombre: row.usuarios?.nombre ?? 'Desconocido',
          username: row.usuarios?.username ?? '—',
        },
      }));
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al obtener detalle evaluaciones:', error.message);
      return [];
    }
  }

  /** Eliminar evaluación (admin) */
  async deleteEvaluacion(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('evaluaciones')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE V2] Error al eliminar evaluación:', error.message);
      return false;
    }
  }

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
