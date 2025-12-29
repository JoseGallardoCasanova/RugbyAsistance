import { User, Jugador } from '../types';

// Usuarios del sistema (con nuevos campos)
export const USERS: User[] = [
  {
    id: 'USR_001',
    nombre: 'Carlos Rodríguez',
    email: 'admin@rugby.cl',
    password: 'admin123',
    role: 'admin',
    activo: true,
    creadoEn: '2024-12-28T00:00:00Z',
    modificadoEn: '2024-12-28T00:00:00Z',
  },
  {
    id: 'USR_002',
    nombre: 'Marcelo Silva',
    email: 'entrenador@rugby.cl',
    password: 'entrenador123',
    role: 'entrenador',
    categoriasAsignadas: [1, 2, 3, 4, 5, 6, 7], // Todas por defecto
    activo: true,
    creadoEn: '2024-12-28T00:00:00Z',
    modificadoEn: '2024-12-28T00:00:00Z',
  },
  {
    id: 'USR_003',
    nombre: 'Pedro González',
    email: 'ayudante@rugby.cl',
    password: 'ayudante123',
    role: 'ayudante',
    categoriaAsignada: 1,
    activo: true,
    creadoEn: '2024-12-28T00:00:00Z',
    modificadoEn: '2024-12-28T00:00:00Z',
  },
];

// Jugadores por categoría (con nuevos campos)
export const JUGADORES: Jugador[] = [
  // Categoría 1
  { id: 'JUG_001', rut: '20123456-7', nombre: 'Matías Fernández', categoria: 1, activo: true },
  { id: 'JUG_002', rut: '20234567-8', nombre: 'Sebastián López', categoria: 1, activo: true },
  { id: 'JUG_003', rut: '20345678-9', nombre: 'Diego Pérez', categoria: 1, activo: true },
  { id: 'JUG_004', rut: '20456789-0', nombre: 'Felipe Morales', categoria: 1, activo: true },
  { id: 'JUG_005', rut: '20567890-1', nombre: 'Nicolás Vargas', categoria: 1, activo: true },
  { id: 'JUG_006', rut: '20678901-2', nombre: 'Tomás Rivera', categoria: 1, activo: true },
  { id: 'JUG_007', rut: '20789012-3', nombre: 'Joaquín Castro', categoria: 1, activo: true },
  { id: 'JUG_008', rut: '20890123-4', nombre: 'Lucas Rojas', categoria: 1, activo: true },
  { id: 'JUG_009', rut: '20901234-5', nombre: 'Martín Soto', categoria: 1, activo: true },
  { id: 'JUG_010', rut: '21012345-6', nombre: 'Benjamín Díaz', categoria: 1, activo: true },

  // Categoría 2
  { id: 'JUG_011', rut: '19123456-7', nombre: 'Cristóbal Muñoz', categoria: 2, activo: true },
  { id: 'JUG_012', rut: '19234567-8', nombre: 'Ignacio Campos', categoria: 2, activo: true },
  { id: 'JUG_013', rut: '19345678-9', nombre: 'Vicente Reyes', categoria: 2, activo: true },
  { id: 'JUG_014', rut: '19456789-0', nombre: 'Maximiliano Torres', categoria: 2, activo: true },
  { id: 'JUG_015', rut: '19567890-1', nombre: 'Agustín Herrera', categoria: 2, activo: true },
  { id: 'JUG_016', rut: '19678901-2', nombre: 'Gabriel Pinto', categoria: 2, activo: true },
  { id: 'JUG_017', rut: '19789012-3', nombre: 'Santiago Núñez', categoria: 2, activo: true },
  { id: 'JUG_018', rut: '19890123-4', nombre: 'Francisco Vega', categoria: 2, activo: true },
  { id: 'JUG_019', rut: '19901234-5', nombre: 'Andrés Mendoza', categoria: 2, activo: true },
  { id: 'JUG_020', rut: '19012345-6', nombre: 'Pablo Cortés', categoria: 2, activo: true },

  // Categoría 3
  { id: 'JUG_021', rut: '18123456-7', nombre: 'Emilio Bravo', categoria: 3, activo: true },
  { id: 'JUG_022', rut: '18234567-8', nombre: 'Rodrigo Medina', categoria: 3, activo: true },
  { id: 'JUG_023', rut: '18345678-9', nombre: 'Ángel Fuentes', categoria: 3, activo: true },
  { id: 'JUG_024', rut: '18456789-0', nombre: 'Damián Sepúlveda', categoria: 3, activo: true },
  { id: 'JUG_025', rut: '18567890-1', nombre: 'Esteban Ramírez', categoria: 3, activo: true },
  { id: 'JUG_026', rut: '18678901-2', nombre: 'Bruno Guzmán', categoria: 3, activo: true },
  { id: 'JUG_027', rut: '18789012-3', nombre: 'Claudio Alarcón', categoria: 3, activo: true },
  { id: 'JUG_028', rut: '18890123-4', nombre: 'Rafael Contreras', categoria: 3, activo: true },
  { id: 'JUG_029', rut: '18901234-5', nombre: 'Manuel Espinoza', categoria: 3, activo: true },
  { id: 'JUG_030', rut: '18012345-6', nombre: 'Eduardo Valdés', categoria: 3, activo: true },

  // Categoría 4
  { id: 'JUG_031', rut: '17123456-7', nombre: 'Fernando Lagos', categoria: 4, activo: true },
  { id: 'JUG_032', rut: '17234567-8', nombre: 'Gonzalo Parra', categoria: 4, activo: true },
  { id: 'JUG_033', rut: '17345678-9', nombre: 'Hernán Salazar', categoria: 4, activo: true },
  { id: 'JUG_034', rut: '17456789-0', nombre: 'Iván Carrasco', categoria: 4, activo: true },
  { id: 'JUG_035', rut: '17567890-1', nombre: 'Jorge Figueroa', categoria: 4, activo: true },
  { id: 'JUG_036', rut: '17678901-2', nombre: 'Luis Navarro', categoria: 4, activo: true },
  { id: 'JUG_037', rut: '17789012-3', nombre: 'Mario Acuña', categoria: 4, activo: true },
  { id: 'JUG_038', rut: '17890123-4', nombre: 'Nelson Bustamante', categoria: 4, activo: true },
  { id: 'JUG_039', rut: '17901234-5', nombre: 'Oscar Tapia', categoria: 4, activo: true },
  { id: 'JUG_040', rut: '17012345-6', nombre: 'Ricardo Cáceres', categoria: 4, activo: true },

  // Categoría 5
  { id: 'JUG_041', rut: '16123456-7', nombre: 'Sergio Araya', categoria: 5, activo: true },
  { id: 'JUG_042', rut: '16234567-8', nombre: 'Víctor Pavez', categoria: 5, activo: true },
  { id: 'JUG_043', rut: '16345678-9', nombre: 'Walter Jara', categoria: 5, activo: true },
  { id: 'JUG_044', rut: '16456789-0', nombre: 'Xavier Leiva', categoria: 5, activo: true },
  { id: 'JUG_045', rut: '16567890-1', nombre: 'Yuri Molina', categoria: 5, activo: true },
  { id: 'JUG_046', rut: '16678901-2', nombre: 'Álvaro Orellana', categoria: 5, activo: true },
  { id: 'JUG_047', rut: '16789012-3', nombre: 'César Sandoval', categoria: 5, activo: true },
  { id: 'JUG_048', rut: '16890123-4', nombre: 'David Carvajal', categoria: 5, activo: true },
  { id: 'JUG_049', rut: '16901234-5', nombre: 'Ernesto Villalobos', categoria: 5, activo: true },
  { id: 'JUG_050', rut: '16012345-6', nombre: 'Fabián Riquelme', categoria: 5, activo: true },

  // Categoría 6
  { id: 'JUG_051', rut: '15123456-7', nombre: 'Germán Ibáñez', categoria: 6, activo: true },
  { id: 'JUG_052', rut: '15234567-8', nombre: 'Hugo Valenzuela', categoria: 6, activo: true },
  { id: 'JUG_053', rut: '15345678-9', nombre: 'Ismael Yáñez', categoria: 6, activo: true },
  { id: 'JUG_054', rut: '15456789-0', nombre: 'Jaime Zúñiga', categoria: 6, activo: true },
  { id: 'JUG_055', rut: '15567890-1', nombre: 'Leandro Escobar', categoria: 6, activo: true },
  { id: 'JUG_056', rut: '15678901-2', nombre: 'Mauricio Poblete', categoria: 6, activo: true },
  { id: 'JUG_057', rut: '15789012-3', nombre: 'Néstor Quiroz', categoria: 6, activo: true },
  { id: 'JUG_058', rut: '15890123-4', nombre: 'Omar Urbina', categoria: 6, activo: true },
  { id: 'JUG_059', rut: '15901234-5', nombre: 'Patricio Donoso', categoria: 6, activo: true },
  { id: 'JUG_060', rut: '15012345-6', nombre: 'Raúl Henríquez', categoria: 6, activo: true },

  // Categoría 7
  { id: 'JUG_061', rut: '14123456-7', nombre: 'Samuel Aravena', categoria: 7, activo: true },
  { id: 'JUG_062', rut: '14234567-8', nombre: 'Tadeo Bizama', categoria: 7, activo: true },
  { id: 'JUG_063', rut: '14345678-9', nombre: 'Ulises Calderón', categoria: 7, activo: true },
  { id: 'JUG_064', rut: '14456789-0', nombre: 'Valentín Durán', categoria: 7, activo: true },
  { id: 'JUG_065', rut: '14567890-1', nombre: 'Wilson Echeverría', categoria: 7, activo: true },
  { id: 'JUG_066', rut: '14678901-2', nombre: 'Ximena Flores', categoria: 7, activo: true },
  { id: 'JUG_067', rut: '14789012-3', nombre: 'Yolanda Garrido', categoria: 7, activo: true },
  { id: 'JUG_068', rut: '14890123-4', nombre: 'Zacarías Hurtado', categoria: 7, activo: true },
  { id: 'JUG_069', rut: '14901234-5', nombre: 'Abel Iturra', categoria: 7, activo: true },
  { id: 'JUG_070', rut: '14012345-6', nombre: 'Bruno Jiménez', categoria: 7, activo: true },
];

export const getCategorias = (): number[] => {
  return [1, 2, 3, 4, 5, 6, 7];
};

export const getJugadoresByCategoria = (categoria: number): Jugador[] => {
  return JUGADORES.filter(j => j.categoria === categoria && j.activo);
};

export const getUsuarioActivos = (): User[] => {
  return USERS.filter(u => u.activo);
};
