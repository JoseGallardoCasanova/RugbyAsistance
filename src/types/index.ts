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
