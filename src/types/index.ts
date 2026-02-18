// ============================================
// EXPORTAR TODOS LOS TIPOS V2
// ============================================
export * from './v2';

// ============================================
// TIPOS V1 (LEGACY) - Mantener por compatibilidad
// ============================================
// Estos tipos se mantendrán temporalmente durante la migración
// Una vez migrado TODO a V2, se pueden eliminar

/**
 * @deprecated Usar UserRole de v2.ts
 */
export type UserRoleV1 = 'admin' | 'entrenador' | 'ayudante';

/**
 * @deprecated Usar User de v2.ts
 */
export interface UserV1 {
  id: string | number;
  nombre: string;
  email: string;
  password: string;
  role: UserRoleV1;
  foto?: string;
  categoriaAsignada?: number;
  categoriasAsignadas?: number[];
  activo: boolean;
  creadoEn?: string;
  modificadoEn?: string;
}

/**
 * @deprecated Usar Jugador de v2.ts
 */
export interface JugadorV1 {
  id: string;
  rut: string;
  nombre: string;
  categoria: number;
  activo: boolean;
  bloqueado?: boolean;
  creadoEn?: string;
  modificadoEn?: string;
}

/**
 * @deprecated Usar AsistenciaRegistro de v2.ts
 */
export interface AsistenciaRegistroV1 {
  fecha: string;
  asistio: boolean;
}

/**
 * @deprecated Usar AsistenciaCategoria de v2.ts
 */
export interface AsistenciaCategoriaV1 {
  categoria: number;
  fecha: string;
  jugadores: {
    rut: string;
    asistio: boolean;
  }[];
  marcadoPor: string;
  enviado: boolean;
}

/**
 * @deprecated Mantener para Google Sheets
 */
export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string;
  sheetName: string;
}

// ============================================
// ALIASES DE COMPATIBILIDAD
// ============================================
// Estos permiten que el código viejo siga funcionando
// mientras migramos a V2 gradualmente

// Importar tipos V2 para aliases
import { 
  User as UserV2, 
  Jugador as JugadorV2, 
  Categoria as CategoriaV2,
  Asistencia as AsistenciaV2,
  UserRole as UserRoleV2
} from './v2';

// Exportar User como alias de UserV2 (para mantener compatibilidad)
// NOTA: Durante migración, algunos archivos usarán User (V2)
// y otros UserV1 explícitamente
export type UserRole = UserRoleV2;
export type User = UserV2;
export type Jugador = JugadorV2;
export type Categoria = CategoriaV2;
export type Asistencia = AsistenciaV2;
