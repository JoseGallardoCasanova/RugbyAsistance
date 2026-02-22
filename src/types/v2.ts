// ============================================
// SQUAD PRO - TIPOS V2
// Multi-Tenant Types
// ============================================

// ============================================
// ROLES
// ============================================
export type UserRole = 
  | 'super_admin'      // Admin de Squad Pro (acceso a todo)
  | 'admin_club'       // Admin del club (gestión total del club)
  | 'entrenador'       // Entrenador (gestión de categorías asignadas)
  | 'jugador'          // Jugador (acceso limitado a ver asistencias)
  | 'apoderado';       // Padre/Tutor (ver info de sus hijos)

// ============================================
// CLUB
// ============================================
export interface Club {
  id: string; // UUID
  nombre: string;
  slug: string; // URL-friendly: 'old-green'
  logoUrl?: string;
  colorPrimario: string; // Hex: '#1a472a'
  colorSecundario: string; // Hex: '#2d7a4a'
  emailContacto?: string;
  telefono?: string;
  direccion?: string;
  deporte?: string; // 'Rugby', 'Fútbol', etc.
  pais: string; // 'Chile'
  timezone: string; // 'America/Santiago'
  createdAt: string;
  updatedAt: string;
}

// ============================================
// USUARIO
// ============================================
export interface User {
  id: string; // UUID
  clubId: string; // UUID - FK a clubes
  username: string; // Nombre de usuario para login (único por club)
  email: string;
  passwordHash: string; // Bcrypt hash
  nombre: string;
  apellido: string; // Obligatorio (se usa para generar username)
  fotoUrl?: string;
  telefono?: string;
  role: UserRole;
  categoriasAsignadas: string[]; // Array de UUIDs de categorías
  createdAt: string;
  updatedAt: string;
  ultimoLogin?: string;
}

// ============================================
// CATEGORÍA
// ============================================
export interface Categoria {
  id: string; // UUID
  clubId: string; // UUID
  nombre: string;
  descripcion?: string;
  color: string; // Hex
  icono?: string;
  diasEntrenamiento: string[]; // ['lunes', 'miercoles', 'viernes']
  horarios?: Record<string, string>; // { 'lunes': '18:00-20:00' }
  orden: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// JUGADOR
// ============================================
export interface Jugador {
  id: string; // UUID
  clubId: string; // UUID
  usuarioId?: string; // UUID - opcional, si tiene perfil de usuario
  categoriaId: string; // UUID
  rut: string;
  nombre: string;
  numero?: number;
  fechaNacimiento?: string;
  email?: string;
  telefono?: string;
  
  // Contacto emergencia
  contactoEmergencia?: string;
  telEmergencia?: string;
  relacionEmergencia?: string;
  
  // Sistema salud
  sistemaSalud?: string;
  seguroComplementario?: string;
  
  // Tutor (para menores)
  nombreTutor?: string;
  rutTutor?: string;
  telTutor?: string;
  emailTutor?: string;
  
  // Información médica
  fuma?: boolean;
  fumaFrecuencia?: string;
  enfermedades?: string;
  alergias?: string;
  medicamentos?: string;
  lesiones?: string;
  grupoSanguineo?: string;
  
  // Otros
  actividad?: string;
  autorizoUsoImagen?: boolean;
  
  // Datos del formulario dinámico
  datosFormularioExtra?: Record<string, any>;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ASISTENCIA
// ============================================
export interface Asistencia {
  id: string; // UUID
  clubId: string; // UUID
  categoriaId: string; // UUID
  jugadorId: string; // UUID
  fecha: string; // 'YYYY-MM-DD'
  asistio: boolean;
  marcadoPor: string; // UUID del usuario que marcó
  marcadoEn: string; // Timestamp
  notas?: string;
  createdAt: string;
}

// ============================================
// FORMULARIO CONFIGURACIÓN
// ============================================
export interface FormularioConfiguracion {
  id: string; // UUID
  clubId: string; // UUID
  nombre: string;
  descripcion?: string;
  campos: FormularioCampo[];
  activo: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // UUID
}

export interface FormularioCampo {
  id: string;
  tipo: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'rut';
  label: string;
  placeholder?: string;
  obligatorio: boolean;
  orden: number;
  seccion?: string;
  opciones?: string[]; // Para tipo 'select'
  validacion?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// ============================================
// RELACIÓN APODERADO
// ============================================
export interface RelacionApoderado {
  id: string; // UUID
  clubId: string; // UUID
  apoderadoId: string; // UUID
  jugadorId: string; // UUID
  tipoRelacion: 'padre' | 'madre' | 'tutor' | 'familiar' | 'otro';
  puedeAutorizarPagos: boolean;
  puedeVerAsistencia: boolean;
  esContactoEmergencia: boolean;
  createdAt: string;
}

// ============================================
// EVALUACIÓN
// ============================================
export interface Evaluacion {
  id: string; // UUID
  clubId: string; // UUID
  categoriaId: string; // UUID
  evaluadorId: string; // UUID (jugador que evalúa)
  evaluadoId: string; // UUID (entrenador evaluado)
  puntuacion: number; // 1-5
  comentario?: string;
  createdAt: string;
}

// ============================================
// PLAN DE SUSCRIPCIÓN
// ============================================
export interface PlanSuscripcion {
  id: string; // UUID
  nombre: string;
  descripcion?: string;
  maxUsuarios?: number;
  maxJugadores?: number;
  maxCategorias?: number;
  features: Record<string, boolean>;
  precioMensual: number;
  precioAnual: number;
  visible: boolean;
  createdAt: string;
}

// ============================================
// SUSCRIPCIÓN DE CLUB
// ============================================
export interface SuscripcionClub {
  id: string; // UUID
  clubId: string; // UUID
  planId: string; // UUID
  estado: 'trial' | 'activa' | 'suspendida' | 'cancelada';
  fechaInicio: string;
  fechaFin?: string;
  fechaProximoPago?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PAGO
// ============================================
export interface Pago {
  id: string; // UUID
  clubId: string; // UUID
  pagadorId: string; // UUID
  beneficiarios: string[]; // Array de UUIDs de jugadores
  tipo: 'matricula' | 'mensualidad' | 'anual';
  monto: number;
  moneda: string; // 'CLP'
  estado: 'pendiente' | 'procesando' | 'pagado' | 'fallido' | 'reembolsado';
  proveedorPago?: string;
  transactionId?: string;
  paymentMethod?: string;
  metadataPago?: Record<string, any>;
  fechaPago?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CONFIGURACIÓN DE PAGOS
// ============================================
export interface ConfiguracionPagosClub {
  id: string; // UUID
  clubId: string; // UUID
  proveedor: 'mercadopago' | 'stripe' | 'flow' | 'otro';
  credencialesEncriptadas?: string;
  precioMatricula?: number;
  precioMensualidad?: number;
  precioAnual?: number;
  descuentoAnualPorcentaje: number;
  moneda: string;
  activo: boolean;
  modoPrueba: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ENTRENAMIENTOS
// ============================================
export type EstadoEntrenamiento = 'programado' | 'completado' | 'cancelado';

export interface Entrenamiento {
  id: string;
  clubId: string;
  categoriaId: string;
  fecha: string;        // YYYY-MM-DD
  horaInicio?: string;  // HH:MM
  horaFin?: string;     // HH:MM
  ubicacion?: string;
  descripcion?: string;
  estado: EstadoEntrenamiento;
  creadoPor?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// LEGACY TYPES (V1 - para migración)
// ============================================
/**
 * @deprecated Usar nuevos tipos V2 con UUID
 */
export interface LegacyUser {
  id: string | number;
  nombre: string;
  email: string;
  password: string;
  role: 'admin' | 'entrenador' | 'ayudante';
  foto?: string;
  categoriaAsignada?: number;
  categoriasAsignadas?: number[];
  activo: boolean;
  creadoEn?: string;
  modificadoEn?: string;
}

/**
 * @deprecated Usar nuevos tipos V2 con UUID
 */
export interface LegacyJugador {
  id: string;
  rut: string;
  nombre: string;
  categoria: number;
  activo: boolean;
  bloqueado?: boolean;
  creadoEn?: string;
  modificadoEn?: string;
}

// ============================================
// UTILIDADES
// ============================================

// Para registro de asistencia simple
export interface AsistenciaRegistro {
  fecha: string; // YYYY-MM-DD
  asistio: boolean;
}

// Para vista agrupada de asistencias
export interface AsistenciaCategoria {
  categoriaId: string;
  fecha: string;
  jugadores: {
    jugadorId: string;
    asistio: boolean;
  }[];
  marcadoPor: string;
  enviado: boolean;
}

// Config de Google Sheets (legacy)
export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  sheetName: string;
}
