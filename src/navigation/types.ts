export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Asistencia: {
    categoria: string;
    categoriaNombre: string;
  };
  Perfil: undefined;
  Estadisticas: undefined;
  Configuracion: undefined;
  Admin: {
    initialTab?: 'usuarios' | 'jugadores' | 'categorias' | 'estadisticas' | 'calendario';
  } | undefined;
  ExportarAsistencias: undefined;
};
