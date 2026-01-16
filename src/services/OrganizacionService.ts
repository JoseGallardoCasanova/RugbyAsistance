import SupabaseService from './SupabaseService';
import { Organizacion, Suscripcion, Invitacion, PlanType, PLANES } from '../types/index';

/**
 * Servicio para manejar organizaciones multi-tenant
 * 
 * MODO DE OPERACIÓN:
 * - Si no hay organizaciones en BD → Modo Legacy (equipo rugby original)
 * - Si hay organizaciones → Modo Multi-Tenant (nuevos clientes)
 */
class OrganizacionService {
  /**
   * Detecta si el sistema está en modo multi-tenant
   */
  async isMultiTenantEnabled(): Promise<boolean> {
    try {
      const supabase = SupabaseService.getClient();
      const { data, error } = await supabase
        .from('organizaciones')
        .select('id')
        .limit(1);

      if (error) {
        console.log('⚠️ Tabla organizaciones no existe, modo Legacy');
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.log('⚠️ Error detectando modo multi-tenant, usando Legacy');
      return false;
    }
  }

  /**
   * Crea una nueva organización con su suscripción
   */
  async crearOrganizacion(datos: {
    nombre: string;
    email_admin: string;
    plan?: PlanType;
  }): Promise<{ organizacion: Organizacion; suscripcion: Suscripcion } | null> {
    try {
      const supabase = SupabaseService.getClient();
      const plan = datos.plan || 'free';
      const planConfig = PLANES[plan];

      // Generar slug único
      const slug = this.generarSlug(datos.nombre);

      // 1. Crear organización
      const { data: org, error: orgError } = await supabase
        .from('organizaciones')
        .insert({
          nombre: datos.nombre,
          slug: slug,
          plan: plan,
          estado: 'active',
          max_usuarios: planConfig.max_usuarios,
          max_jugadores: planConfig.max_jugadores,
          max_categorias: planConfig.max_categorias,
        })
        .select()
        .single();

      if (orgError || !org) {
        console.error('❌ Error creando organización:', orgError);
        return null;
      }

      console.log('✅ Organización creada:', org.nombre);

      // 2. Crear suscripción
      const { data: sub, error: subError } = await supabase
        .from('suscripciones')
        .insert({
          organizacion_id: org.id,
          plan: plan,
          estado: plan === 'free' ? 'active' : 'trialing',
          precio_mensual: planConfig.precio_mensual,
          moneda: 'USD',
          fecha_inicio: new Date().toISOString(),
          // Para planes pagos, dar 14 días de trial
          fecha_fin: plan !== 'free' 
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
        .select()
        .single();

      if (subError || !sub) {
        console.error('❌ Error creando suscripción:', subError);
        // Revertir creación de org
        await supabase.from('organizaciones').delete().eq('id', org.id);
        return null;
      }

      console.log('✅ Suscripción creada:', sub.plan);

      return { organizacion: org, suscripcion: sub };
    } catch (error) {
      console.error('❌ Error en crearOrganizacion:', error);
      return null;
    }
  }

  /**
   * Obtiene la organización del usuario actual
   */
  async obtenerOrganizacionUsuario(userId: string): Promise<Organizacion | null> {
    try {
      const supabase = SupabaseService.getClient();
      
      // Obtener usuario con su organizacion_id
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('organizacion_id')
        .eq('id', userId)
        .single();

      if (userError || !user || !user.organizacion_id) {
        return null;
      }

      // Obtener organización
      const { data: org, error: orgError } = await supabase
        .from('organizaciones')
        .select('*')
        .eq('id', user.organizacion_id)
        .single();

      if (orgError || !org) {
        return null;
      }

      return org;
    } catch (error) {
      console.error('❌ Error obteniendo organización:', error);
      return null;
    }
  }

  /**
   * Obtiene la suscripción activa de una organización
   */
  async obtenerSuscripcion(organizacionId: string): Promise<Suscripcion | null> {
    try {
      const supabase = SupabaseService.getClient();
      
      const { data, error } = await supabase
        .from('suscripciones')
        .select('*')
        .eq('organizacion_id', organizacionId)
        .eq('estado', 'active')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error);
      return null;
    }
  }

  /**
   * Verifica si una organización ha alcanzado sus límites
   */
  async verificarLimites(organizacionId: string): Promise<{
    usuarios: { actual: number; maximo: number; alcanzado: boolean };
    jugadores: { actual: number; maximo: number; alcanzado: boolean };
    categorias: { actual: number; maximo: number; alcanzado: boolean };
  }> {
    try {
      const supabase = SupabaseService.getClient();

      // Obtener organización para límites
      const { data: org } = await supabase
        .from('organizaciones')
        .select('max_usuarios, max_jugadores, max_categorias')
        .eq('id', organizacionId)
        .single();

      if (!org) {
        throw new Error('Organización no encontrada');
      }

      // Contar usuarios
      const { count: usuariosCount } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionId);

      // Contar jugadores
      const { count: jugadoresCount } = await supabase
        .from('jugadores')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionId);

      // Contar categorías
      const { count: categoriasCount } = await supabase
        .from('categorias')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionId);

      return {
        usuarios: {
          actual: usuariosCount || 0,
          maximo: org.max_usuarios,
          alcanzado: (usuariosCount || 0) >= org.max_usuarios,
        },
        jugadores: {
          actual: jugadoresCount || 0,
          maximo: org.max_jugadores,
          alcanzado: (jugadoresCount || 0) >= org.max_jugadores,
        },
        categorias: {
          actual: categoriasCount || 0,
          maximo: org.max_categorias,
          alcanzado: (categoriasCount || 0) >= org.max_categorias,
        },
      };
    } catch (error) {
      console.error('❌ Error verificando límites:', error);
      throw error;
    }
  }

  /**
   * Genera un slug único a partir del nombre
   */
  private generarSlug(nombre: string): string {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with -
      .replace(/^-+|-+$/g, '') // Remove leading/trailing -
      .substring(0, 50); // Max 50 chars
  }
}

export default new OrganizacionService();
