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
      const { data, error } = await SupabaseService.client
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
   * NOTA: Ahora usa plan_id en vez de plan (varchar)
   */
  async crearOrganizacion(datos: {
    nombre: string;
    email_admin: string;
    plan?: PlanType;
  }): Promise<Organizacion | null> {
    try {
      const plan = datos.plan || 'free';
      
      // Mapear plan string a plan_id
      const planIdMap: Record<PlanType, number> = {
        'free': 1,
        'pro': 2,
        'enterprise': 3,
      };
      
      const planId = planIdMap[plan];

      // Generar slug único
      const slug = this.generarSlug(datos.nombre);

      // 1. Crear organización con plan_id
      const { data: org, error: orgError } = await SupabaseService.client
        .from('organizaciones')
        .insert({
          nombre: datos.nombre,
          slug: slug,
          plan_id: planId,
          estado: 'active',
        })
        .select()
        .single();

      if (orgError || !org) {
        console.error('❌ Error creando organización:', orgError);
        throw new Error(orgError?.message || 'Error creando organización');
      }

      console.log('✅ Organización creada:', org.nombre);

      // 2. Crear registro en suscripciones como historial
      const planConfig = PLANES[plan];
      const { error: subError } = await SupabaseService.client
        .from('suscripciones')
        .insert({
          organizacion_id: org.id,
          plan_nuevo_id: planId,
          estado: plan === 'free' ? 'active' : 'trialing',
          precio_mensual: planConfig.precio_mensual,
          fecha_inicio: new Date().toISOString(),
          // Para planes pagos, dar 14 días de trial
          fecha_fin: plan !== 'free' 
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        });

      if (subError) {
        console.error('⚠️ Error creando registro de suscripción:', subError);
        // No es crítico, la org ya está creada
      } else {
        console.log('✅ Registro de suscripción creado');
      }

      return org;
    } catch (error: any) {
      console.error('❌ Error en crearOrganizacion:', error);
      throw error;
    }
  }

  /**
   * Obtiene la organización del usuario actual
   */
  async obtenerOrganizacionUsuario(userId: string): Promise<Organizacion | null> {
    try {
      // Obtener usuario con su organizacion_id
      const { data: user, error: userError } = await SupabaseService.client
        .from('usuarios')
        .select('organizacion_id')
        .eq('id', userId)
        .single();

      if (userError || !user || !user.organizacion_id) {
        return null;
      }

      // Obtener organización
      const { data: org, error: orgError } = await SupabaseService.client
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
      const { data, error } = await SupabaseService.client
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
   * NOTA: Ahora obtiene límites desde tabla planes via plan_id
   */
  async verificarLimites(organizacionId: string): Promise<{
    usuarios: { actual: number; maximo: number; alcanzado: boolean };
    jugadores: { actual: number; maximo: number; alcanzado: boolean };
    categorias: { actual: number; maximo: number; alcanzado: boolean };
  }> {
    try {
      // Obtener organización con su plan
      const { data: org } = await SupabaseService.client
        .from('organizaciones')
        .select(`
          plan_id,
          planes (
            max_usuarios,
            max_jugadores,
            max_categorias
          )
        `)
        .eq('id', organizacionId)
        .single();

      if (!org || !org.planes) {
        throw new Error('Organización o plan no encontrado');
      }

      const limites = org.planes;

      // Contar usuarios activos
      const { count: usuariosCount } = await SupabaseService.client
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionId)
        .eq('activo', true);

      // Contar jugadores activos
      const { count: jugadoresCount } = await SupabaseService.client
        .from('jugadores')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionId)
        .eq('activo', true);

      // Contar categorías activas
      const { count: categoriasCount } = await SupabaseService.client
        .from('categorias')
        .select('*', { count: 'exact', head: true })
        .eq('organizacion_id', organizacionId)
        .eq('activo', true);

      return {
        usuarios: {
          actual: usuariosCount || 0,
          maximo: limites.max_usuarios,
          alcanzado: (usuariosCount || 0) >= limites.max_usuarios,
        },
        jugadores: {
          actual: jugadoresCount || 0,
          maximo: limites.max_jugadores,
          alcanzado: (jugadoresCount || 0) >= limites.max_jugadores,
        },
        categorias: {
          actual: categoriasCount || 0,
          maximo: limites.max_categorias,
          alcanzado: (categoriasCount || 0) >= limites.max_categorias,
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
