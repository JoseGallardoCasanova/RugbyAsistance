export type UserRole = 'admin' | 'entrenador' | 'ayudante';

export interface User {
  id: string;
  nombre: string;
  email: string;
  password: string;
  role: UserRole;
  foto?: string;
  categoriaAsignada?: number; // Para ayudantes
}

export interface Jugador {
  rut: string;
  nombre: string;
  categoria: number;
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
