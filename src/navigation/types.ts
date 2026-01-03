export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Asistencia: {
    categoriaNumero: number;
    categoriaNombre: string;
    categoriaColor: string;
  };
  Perfil: undefined;
  Configuracion: undefined;
  Admin: {
    initialTab?: 'usuarios' | 'jugadores' | 'categorias';
  } | undefined;
  ExportarAsistencias: undefined;
};
