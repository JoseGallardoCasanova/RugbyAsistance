// Types para la aplicación de Rugby Attendance

export type UserRole = 'admin' | 'entrenador' | 'ayudante';

export interface User {
  id: string | number;
  nombre: string;
  email: string;
  password: string;
  role: UserRole;
  foto?: string;
  categoriaAsignada?: number; // Para ayudante
  categoriasAsignadas?: number[]; // Para entrenador
  activo: boolean;
  creadoEn?: string;
  modificadoEn?: string;
}

export interface Jugador {
  id: string;
  rut: string;
  nombre: string;
  categoria: number;
  activo: boolean;
  creadoEn?: string;
  modificadoEn?: string;
}

// ✅ NUEVO: Modelo de Categoría
export interface Categoria {
  id: string;
  numero: number; // 1, 2, 3, 4, etc. (para ordenar)
  nombre: string; // "M-14", "M-16", "Sub 18", etc.
  color?: string; // Hex color (opcional, para UI)
  activo: boolean;
  creadoEn?: string;
  modificadoEn?: string;
}

export interface AsistenciaCategoria {
  categoria: number;
  fecha: string; // YYYY-MM-DD
  jugadores: {
    rut: string;
    asistio: boolean;
  }[];
  marcadoPor: string;
  enviado: boolean;
}
