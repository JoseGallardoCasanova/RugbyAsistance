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
    initialTab?: 'usuarios' | 'jugadores' | 'categorias' | 'estadisticas' | 'calendario' | 'formulario' | 'pagos' | 'codigos' | 'avisos' | 'evaluaciones';
  } | undefined;
  Evaluaciones: undefined;
  ExportarAsistencias: undefined;
  PerfilJugador: { jugadorId?: string } | undefined;
  Apoderado: undefined;
  Pago: { jugadorIds: string[]; tipo?: 'mensualidad' | 'matricula' | 'anual' };
  RegistroClub: undefined;
  FormularioInscripcion: undefined;
};
