export type UserRole = 'admin' | 'entrenador' | 'ayudante';

export interface User {
  id: string | number;
  nombre: string;
  email: string;
  password: string;
  role: UserRole;
  foto?: string;
  categoriaAsignada?: number; // Para ayudantes (solo 1 categoría)
  categoriasAsignadas?: number[]; // Para entrenadores (múltiples categorías: [1,2,3])
  activo: boolean; // Para soft delete
  creadoEn?: string; // Fecha de creación
  modificadoEn?: string; // Última modificación
  organizacion_id?: string; // Multi-tenant (opcional, para nuevos clientes)
}

export interface Jugador {
  id: string; // ID único generado
  rut: string;
  nombre: string;
  categoria: number;
  activo: boolean; // Para soft delete
  bloqueado?: boolean; // Para bloquear jugadores
  creadoEn?: string;
  modificadoEn?: string;
  organizacion_id?: string; // Multi-tenant (opcional, para nuevos clientes)
}

export interface AsistenciaRegistro {
  fecha: string; // YYYY-MM-DD
  asistio: boolean;
}

export interface AsistenciaCategoria {
  categoria: number;
  fecha: string;
  jugadores: {
    rut: string;
    asistio: boolean;
  }[];
  marcadoPor: string;
  enviado: boolean;
}

export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  sheetName: string; // e.g., "Enero_2025"
}

// =====================================================
// MULTI-TENANT TYPES - Fase 2
// =====================================================

export type PlanType = 'free' | 'pro' | 'enterprise';
export type OrgEstado = 'active' | 'suspended' | 'cancelled';
export type SuscripcionEstado = 'active' | 'past_due' | 'cancelled' | 'trialing';
export type InvitacionEstado = 'pendiente' | 'aceptada' | 'expirada';

export interface Organizacion {
  id: string;
  nombre: string;
  slug: string; // URL-friendly name
  plan: PlanType;
  estado: OrgEstado;
  
  // Límites según plan
  max_usuarios: number;
  max_jugadores: number;
  max_categorias: number;
  
  // Branding personalizado
  logo_url?: string;
  color_primario?: string;
  dominio_personalizado?: string;
  
  // Admin principal
  usuario_admin_id?: string;
  
  // Timestamps
  creado_en: string;
  actualizado_en: string;
}

export interface Suscripcion {
  id: string;
  organizacion_id: string;
  plan: PlanType;
  estado: SuscripcionEstado;
  
  // Precios
  precio_mensual?: number;
  moneda: string;
  
  // Fechas
  fecha_inicio: string;
  fecha_fin?: string;
  proximo_pago?: string;
  
  // Integración pasarela de pago
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  
  creado_en: string;
  actualizado_en: string;
}

export interface Invitacion {
  id: string;
  organizacion_id: string;
  email: string;
  rol: UserRole;
  token: string;
  estado: InvitacionEstado;
  invitado_por?: string;
  expira_en: string;
  creado_en: string;
}

// Plan features y límites
export interface PlanFeatures {
  nombre: string;
  precio_mensual: number;
  max_usuarios: number;
  max_jugadores: number;
  max_categorias: number;
  features: string[];
  recomendado?: boolean;
}

export const PLANES: Record<PlanType, PlanFeatures> = {
  free: {
    nombre: 'Gratuito',
    precio_mensual: 0,
    max_usuarios: 3,
    max_jugadores: 50,
    max_categorias: 3,
    features: [
      'Hasta 3 usuarios',
      'Hasta 50 jugadores',
      'Hasta 3 categorías',
      'Registro de asistencias',
      'Reportes básicos',
    ],
  },
  pro: {
    nombre: 'Profesional',
    precio_mensual: 29,
    max_usuarios: 20,
    max_jugadores: 500,
    max_categorias: 20,
    features: [
      'Hasta 20 usuarios',
      'Hasta 500 jugadores',
      'Hasta 20 categorías',
      'Registro de asistencias',
      'Reportes avanzados',
      'Exportación a Excel',
      'Soporte por email',
      'Logo personalizado',
    ],
    recomendado: true,
  },
  enterprise: {
    nombre: 'Empresarial',
    precio_mensual: 99,
    max_usuarios: 999999,
    max_jugadores: 999999,
    max_categorias: 999999,
    features: [
      'Usuarios ilimitados',
      'Jugadores ilimitados',
      'Categorías ilimitadas',
      'Registro de asistencias',
      'Reportes avanzados',
      'Exportación a Excel',
      'Soporte prioritario 24/7',
      'Logo y colores personalizados',
      'Dominio personalizado',
      'API access',
      'Integración con otros sistemas',
    ],
  },
};
