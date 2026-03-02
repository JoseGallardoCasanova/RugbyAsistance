import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import { Jugador, Categoria, User, RelacionApoderado, ConfiguracionPagosClub, FormularioConfiguracion } from '../../types/v2';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import FormJugador from './FormJugador';
import ModalDetallesJugador from './ModalDetallesJugador';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';
import { useFocusEffect } from '@react-navigation/native';

const JugadoresTab: React.FC = () => {
  const { user } = useAuth();
  const { club } = useClub();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null); // UUID ahora
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [jugadorEditar, setJugadorEditar] = useState<Jugador | undefined>();
  const [jugadorDetalles, setJugadorDetalles] = useState<Jugador | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Gestión apoderados
  const [modalApodVisible, setModalApodVisible] = useState(false);
  const [jugadorApod, setJugadorApod] = useState<Jugador | null>(null);
  const [apodVinculados, setApodVinculados] = useState<{ relacion: RelacionApoderado; apoderado: User }[]>([]);
  const [apodDisponibles, setApodDisponibles] = useState<User[]>([]);
  const [busquedaApod, setBusquedaApod] = useState('');
  const [cargandoApod, setCargandoApod] = useState(false);

  // Gestión descuentos personales
  const [modalDescuentoVisible, setModalDescuentoVisible] = useState(false);
  const [jugadorDescuentoTarget, setJugadorDescuentoTarget] = useState<Jugador | null>(null);
  const [descuentoValorStr, setDescuentoValorStr] = useState('0');
  const [notaDescuentoStr, setNotaDescuentoStr] = useState('');
  const [guardandoDescuento, setGuardandoDescuento] = useState(false);
  const [config, setConfig] = useState<ConfiguracionPagosClub | null>(null);
  const [formularioConfig, setFormularioConfig] = useState<FormularioConfiguracion | null>(null);

  // Importación masiva
  const [importModal, setImportModal] = useState(false);
  const [importPaso, setImportPaso] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrores, setImportErrores] = useState<string[]>([]);
  const [importDone, setImportDone] = useState(false);

  const categoriasEntrenador = useMemo(() => {
    if (user?.role !== 'entrenador') return undefined;
    return user.categoriasAsignadas;
  }, [user?.categoriasAsignadas, user?.role]);

  const entrenadorSinCategorias =
    user?.role === 'entrenador' && (!Array.isArray(categoriasEntrenador) || categoriasEntrenador.length === 0);

  const cargarDatos = useCallback(async () => {
    if (!club) {
      console.warn('⚠️ [JUGADORES TAB] No hay club cargado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [jugadoresData, categoriasData, configData, formConfigData] = await Promise.all([
        SupabaseServiceV2.getJugadoresByClub(club.id),
        SupabaseServiceV2.getCategoriasByClub(club.id),
        SupabaseServiceV2.getConfigPagosByClub(club.id),
        SupabaseServiceV2.getFormularioByClub(club.id),
      ]);
      
      // V2: No hay campo activo, todos son activos
      let jugadoresFiltrados = jugadoresData;
      
      let categoriasOrdenadas = categoriasData.sort((a, b) => (a.orden || 0) - (b.orden || 0));

      // ✅ Permisos entrenador: solo sus categorías asignadas (UUIDs)
      if (user?.role === 'entrenador') {
        if (Array.isArray(categoriasEntrenador) && categoriasEntrenador.length > 0) {
          jugadoresFiltrados = jugadoresFiltrados.filter(j => categoriasEntrenador.includes(j.categoriaId));
          categoriasOrdenadas = categoriasOrdenadas.filter(c => categoriasEntrenador.includes(c.id));
        } else {
          jugadoresFiltrados = [];
          categoriasOrdenadas = [];
          setCategoriaFiltro(null);
        }
      }

      setJugadores(jugadoresFiltrados);
      setCategorias(categoriasOrdenadas);
      setConfig(configData);
      setFormularioConfig(formConfigData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los jugadores');
    } finally {
      setLoading(false);
    }
  }, [club, categoriasEntrenador, user?.role]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const getNombreCategoria = (categoriaId: string): string => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat ? cat.nombre : `Categoría`;
  };

  const getColorCategoria = (categoriaId: string): string => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.color || '#1a472a';
  };

  // Descuento de item vigente (activo + dentro de rango de fechas)
  const getDescuentoItem = (pct: number, activo: boolean, inicio?: string, fin?: string): number => {
    if (!activo || !pct) return 0;
    const hoy = new Date().toISOString().slice(0, 10);
    if (inicio && hoy < inicio) return 0;
    if (fin && hoy > fin) return 0;
    return pct;
  };

  const formatK = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;

  const handleCrear = () => {
    if (entrenadorSinCategorias) {
      Alert.alert(
        'Sin categorías asignadas',
        'No tienes categorías asignadas para inscribir jugadores. Pide a un administrador que te asigne una o más categorías.'
      );
      return;
    }
    setJugadorEditar(undefined);
    setModalVisible(true);
  };

  const handleEditar = (jugador: Jugador) => {
    setJugadorEditar(jugador);
    setModalVisible(true);
  };

  const handleVerDetalles = (jugador: Jugador) => {
    setJugadorDetalles(jugador);
    setModalDetallesVisible(true);
  };

  const handleBloquear = (jugador: Jugador) => {
    // TODO V2: Implementar bloqueo en SupabaseServiceV2 (o eliminar feature)
    Alert.alert('No implementado', 'La función de bloqueo aún no está disponible en V2');
  };

  const handleEliminar = (jugador: Jugador) => {
    Alert.alert(
      '⚠️ Eliminar Jugador',
      `¿Estás seguro de eliminar a ${jugador.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(jugador.id);
              const success = await SupabaseServiceV2.eliminarJugador(jugador.id);
              if (success) {
                Alert.alert('✅ Éxito', 'Jugador eliminado correctamente');
                cargarDatos();
              } else {
                Alert.alert('❌ Error', 'No se pudo eliminar el jugador');
              }
            } catch (error) {
              Alert.alert('❌ Error', 'Error al eliminar jugador');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleGuardar = async (datos: Partial<Jugador>) => {
    if (!club) {
      Alert.alert('❌ Error', 'No se pudo obtener el club');
      return;
    }

    try {
      let result = null;

      if (jugadorEditar) {
        // Editar jugador existente
        result = await SupabaseServiceV2.actualizarJugador(jugadorEditar.id, datos);
      } else {
        // Crear nuevo jugador
        const nuevoJugador: Omit<Jugador, 'id' | 'createdAt' | 'updatedAt'> = {
          clubId: club.id,
          usuarioId: null,
          categoriaId: datos.categoriaId!,
          rut: datos.rut!,
          nombre: datos.nombre!,
          numero: datos.numero,
          fechaNacimiento: datos.fechaNacimiento,
          email: datos.email,
          telefono: datos.telefono,
          contactoEmergencia: datos.contactoEmergencia,
          telEmergencia: datos.telEmergencia,
          relacionEmergencia: datos.relacionEmergencia,
          sistemaSalud: datos.sistemaSalud,
          seguroComplementario: datos.seguroComplementario,
          nombreTutor: datos.nombreTutor,
          rutTutor: datos.rutTutor,
          telTutor: datos.telTutor,
          emailTutor: datos.emailTutor,
          fuma: datos.fuma || false,
          fumaFrecuencia: datos.fumaFrecuencia,
          enfermedades: datos.enfermedades,
          alergias: datos.alergias,
          medicamentos: datos.medicamentos,
          lesiones: datos.lesiones,
          grupoSanguineo: datos.grupoSanguineo,
          actividad: datos.actividad,
          autorizoUsoImagen: datos.autorizoUsoImagen || false,
          datosFormularioExtra: datos.datosFormularioExtra,
        };
        result = await SupabaseServiceV2.crearJugador(nuevoJugador);

        // Auto-crear usuario para el jugador
        if (result) {
          const partes = (datos.nombre!).trim().split(/\s+/);
          const apellidoAuto = partes.length > 1 ? partes[partes.length - 1] : '';
          const nombreAuto = partes.slice(0, partes.length > 1 ? -1 : 1).join(' ') || partes[0];
          try {
            const cred = await SupabaseServiceV2.autoCrearUsuarioJugador(
              club.id, result.id, nombreAuto, apellidoAuto, datos.email
            );
            if (cred) {
              Alert.alert(
                '✅ Jugador Creado',
                `Jugador registrado exitosamente.\n\n👤 Usuario: ${cred.user.username}\n🔑 Contraseña: ${cred.plainPassword}\n\nComparte estas credenciales con el jugador para que pueda ingresar a la app.`
              );
            } else {
              Alert.alert('✅ Jugador Creado', 'Jugador registrado. No se pudo crear el usuario automáticamente, configúralo desde la pestaña Usuarios.');
            }
          } catch (_) {
            Alert.alert('✅ Jugador Creado', 'Jugador registrado. No se pudo crear el usuario automáticamente.');
          }
          setModalVisible(false);
          cargarDatos();
          return;
        }
        Alert.alert('❌ Error', 'No se pudo crear el jugador');
        return;
      }

      // Ruta edición: verificar resultado
      if (result) {
        Alert.alert('✅ Éxito', 'Jugador actualizado correctamente');
        setModalVisible(false);
        cargarDatos();
      } else {
        Alert.alert('❌ Error', 'No se pudo guardar el jugador');
      }
    } catch (error) {
      console.error('Error al guardar jugador:', error);
      Alert.alert('❌ Error', 'Error al guardar el jugador');
    }
  };

  const handleGestionarApoderados = async (jugador: Jugador) => {
    if (!club) return;
    setJugadorApod(jugador);
    setCargandoApod(true);
    setModalApodVisible(true);
    setBusquedaApod('');
    try {
      const [vinculados, todos] = await Promise.all([
        SupabaseServiceV2.getApoderadosByJugador(jugador.id),
        SupabaseServiceV2.getUsuariosByClub(club.id),
      ]);
      setApodVinculados(vinculados);
      setApodDisponibles(todos.filter(u => u.role === 'apoderado'));
    } finally {
      setCargandoApod(false);
    }
  };

  const handleVincularApod = async (apoderado: User) => {
    if (!club || !jugadorApod) return;
    const ok = await SupabaseServiceV2.vincularApoderadoJugador(club.id, apoderado.id, jugadorApod.id);
    if (ok) {
      // Recargar
      const vinculados = await SupabaseServiceV2.getApoderadosByJugador(jugadorApod.id);
      setApodVinculados(vinculados);
      Alert.alert('✅', `${apoderado.nombre} vinculado como apoderado`);
    } else {
      Alert.alert('❌ Error', 'No se pudo crear el vínculo');
    }
  };

  const handleDesvincularApod = async (apoderadoId: string, nombre: string) => {
    if (!jugadorApod) return;
    Alert.alert('Desvincular', `¿Eliminar a ${nombre} como apoderado?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular', style: 'destructive',
        onPress: async () => {
          const ok = await SupabaseServiceV2.desvincularApoderadoJugador(apoderadoId, jugadorApod.id);
          if (ok) {
            const vinculados = await SupabaseServiceV2.getApoderadosByJugador(jugadorApod.id);
            setApodVinculados(vinculados);
          }
        },
      },
    ]);
  };

  const handleDescargarPlantilla = async () => {
    if (!club) return;
    try {
      const columnas = formularioConfig?.campos && formularioConfig.campos.length > 0
        ? ['categoria', ...formularioConfig.campos.map((c: any) => c.label)]
        : ['nombre', 'apellido', 'rut', 'fecha_nacimiento', 'email', 'telefono',
           'categoria', 'contacto_emergencia', 'tel_emergencia', 'sistema_salud', 'actividad'];
      const wsData = [columnas];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = columnas.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fecha = new Date().toISOString().split('T')[0];
      const fileName = `Plantilla_Jugadores_${club.nombre}_${fecha}.xlsx`;
      const fileUri = (FileSystem.documentDirectory ?? '') + fileName;
      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else {
        Alert.alert('Descargado', `Plantilla guardada: ${fileName}`);
      }
    } catch (e: any) {
      Alert.alert('Error', `No se pudo generar la plantilla: ${e.message}`);
    }
  };

  const handleImportarJugadores = async () => {
    if (!club) return;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const uri = picked.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = XLSX.read(base64, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const filas: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!filas.length) { Alert.alert('Vacío', 'El archivo no tiene datos.'); return; }

      setImportTotal(filas.length);
      setImportPaso(0);
      setImportErrores([]);
      setImportDone(false);
      setImportModal(true);

      const errores: string[] = [];
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        setImportPaso(i + 1);
        const nombreVal = String(fila['nombre'] || fila['Nombre'] || '').trim();
        const apellidoVal = String(fila['apellido'] || fila['Apellido'] || '').trim();
        const rutVal = String(fila['rut'] || fila['RUT'] || '').trim();
        const catNombre = String(fila['categoria'] || fila['Categoria'] || fila['Categoría'] || '').trim();
        if (!nombreVal || !rutVal) {
          errores.push(`Fila ${i + 2}: nombre y rut son obligatorios`);
          continue;
        }
        const catObj = categorias.find(c => c.nombre.toLowerCase() === catNombre.toLowerCase());
        try {
          const jugadorCreado = await SupabaseServiceV2.crearJugador({
            clubId: club.id,
            rut: rutVal,
            nombre: `${nombreVal} ${apellidoVal}`.trim(),
            categoriaId: catObj?.id ?? (categorias[0]?.id ?? ''),
            email: String(fila['email'] || fila['Email'] || '').trim() || undefined,
            telefono: String(fila['telefono'] || fila['Telefono'] || '').trim() || undefined,
            fechaNacimiento: String(fila['fecha_nacimiento'] || '').trim() || undefined,
            contactoEmergencia: String(fila['contacto_emergencia'] || '').trim() || undefined,
            telEmergencia: String(fila['tel_emergencia'] || '').trim() || undefined,
            sistemaSalud: String(fila['sistema_salud'] || '').trim() || undefined,
            actividad: String(fila['actividad'] || '').trim() || undefined,
          });
          if (jugadorCreado) {
            await SupabaseServiceV2.autoCrearUsuarioJugador(club.id, jugadorCreado.id, nombreVal, apellidoVal);
          } else {
            errores.push(`Fila ${i + 2} (${nombreVal}): No se pudo crear`);
          }
        } catch (e: any) {
          errores.push(`Fila ${i + 2} (${nombreVal}): ${e.message}`);
        }
      }
      setImportErrores(errores);
      setImportDone(true);
      cargarDatos();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setImportModal(false);
    }
  };

  const handleAbrirDescuento = (jugador: Jugador) => {
    setJugadorDescuentoTarget(jugador);
    setDescuentoValorStr(String(jugador.descuentoPersonal ?? 0));
    setNotaDescuentoStr(jugador.notaDescuento ?? '');
    setModalDescuentoVisible(true);
  };

  const handleGuardarDescuento = async () => {
    if (!jugadorDescuentoTarget) return;
    const pct = Math.min(100, Math.max(0, parseInt(descuentoValorStr || '0', 10)));
    setGuardandoDescuento(true);
    const updated = await SupabaseServiceV2.actualizarJugador(jugadorDescuentoTarget.id, {
      descuentoPersonal: pct,
      notaDescuento: notaDescuentoStr.trim() || undefined,
    });
    setGuardandoDescuento(false);
    if (updated) {
      setJugadores(prev => prev.map(j => j.id === jugadorDescuentoTarget.id ? {
        ...j, descuentoPersonal: pct, notaDescuento: notaDescuentoStr.trim() || undefined,
      } : j));
      setModalDescuentoVisible(false);
      Alert.alert('✅', pct > 0 ? `Descuento del ${pct}% asignado a ${jugadorDescuentoTarget.nombre}.` : 'Descuento eliminado.');
    } else {
      Alert.alert('Error', 'No se pudo guardar el descuento.');
    }
  };

  const jugadoresFiltrados = jugadores.filter(j => {
    const matchBusqueda = j.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          j.rut.includes(busqueda);
    const matchCategoria = categoriaFiltro === null || j.categoriaId === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  const renderJugador = ({ item }: { item: Jugador }) => {
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardName}>{item.nombre}</Text>
              {(item.descuentoPersonal ?? 0) > 0 && (
                <View style={styles.descuentoBadge}>
                  <Text style={styles.descuentoBadgeText}>🏷️ {item.descuentoPersonal}%</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardRut}>RUT: {item.rut}</Text>
            <View style={styles.categoriaContainer}>
              <View style={[styles.categoriaIndicator, { backgroundColor: getColorCategoria(item.categoriaId) }]} />
              <Text style={styles.categoriaText}>{getNombreCategoria(item.categoriaId)}</Text>
            </View>
            {/* Precios vigentes con descuento aplicado */}
            {config && (
              <View style={styles.preciosRow}>
                {config.mensualidadActiva && config.precioMensualidad ? (() => {
                  const dtoClub = getDescuentoItem(config.descuentoMensualidad, config.descuentoMensualidadActivo, config.descuentoMensualidadInicio, config.descuentoMensualidadFin);
                  const dto = Math.max(dtoClub, item.descuentoPersonal ?? 0);
                  const base = config.precioMensualidad;
                  const final = dto > 0 ? Math.round(base * (1 - dto / 100)) : base;
                  return (
                    <View key="mens" style={styles.precioChip}>
                      <Text style={styles.precioChipLabel}>Mens</Text>
                      {dto > 0 ? <Text style={styles.precioBase}>{formatK(base)}</Text> : null}
                      <Text style={styles.precioFinal}>{formatK(final)}</Text>
                      {dto > 0 && <Text style={styles.precioDtoTag}>-{dto}%</Text>}
                    </View>
                  );
                })() : null}
                {config.matriculaActiva && config.precioMatricula ? (() => {
                  const dtoClub = getDescuentoItem(config.descuentoMatricula, config.descuentoMatriculaActivo, config.descuentoMatriculaInicio, config.descuentoMatriculaFin);
                  const dto = Math.max(dtoClub, item.descuentoPersonal ?? 0);
                  const base = config.precioMatricula;
                  const final = dto > 0 ? Math.round(base * (1 - dto / 100)) : base;
                  return (
                    <View key="matr" style={styles.precioChip}>
                      <Text style={styles.precioChipLabel}>Matr</Text>
                      {dto > 0 ? <Text style={styles.precioBase}>{formatK(base)}</Text> : null}
                      <Text style={styles.precioFinal}>{formatK(final)}</Text>
                      {dto > 0 && <Text style={styles.precioDtoTag}>-{dto}%</Text>}
                    </View>
                  );
                })() : null}
                {config.anualActivo && config.precioAnual ? (() => {
                  const dtoClub = getDescuentoItem(config.descuentoAnual, config.descuentoAnualActivo, config.descuentoAnualInicio, config.descuentoAnualFin);
                  const dto = Math.max(dtoClub, item.descuentoPersonal ?? 0);
                  const base = config.precioAnual;
                  const final = dto > 0 ? Math.round(base * (1 - dto / 100)) : base;
                  return (
                    <View key="anual" style={styles.precioChip}>
                      <Text style={styles.precioChipLabel}>Anual</Text>
                      {dto > 0 ? <Text style={styles.precioBase}>{formatK(base)}</Text> : null}
                      <Text style={styles.precioFinal}>{formatK(final)}</Text>
                      {dto > 0 && <Text style={styles.precioDtoTag}>-{dto}%</Text>}
                    </View>
                  );
                })() : null}
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          {/* Solo admins pueden editar/eliminar */}
          {(user?.role === 'super_admin' || user?.role === 'admin_club') && (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonEdit, isDeleting && styles.buttonDisabled]}
                onPress={() => handleEditar(item)}
                disabled={isDeleting}
              >
                <Text style={styles.buttonText}>✏️ Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonDelete, isDeleting && styles.buttonDisabled]}
                onPress={() => handleEliminar(item)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>🗑️ Eliminar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#5c6bc0' }]}
                onPress={() => handleGestionarApoderados(item)}
              >
                <Text style={styles.buttonText}>👨‍👩‍👧 Apod.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: (item.descuentoPersonal ?? 0) > 0 ? '#e65100' : '#795548' }]}
                onPress={() => handleAbrirDescuento(item)}
              >
                <Text style={styles.buttonText}>🏷️ % Dto</Text>
              </TouchableOpacity>
            </>
          )}
          
          {/* Entrenadores solo ven mensaje informativo */}
          {user?.role === 'entrenador' && (
            <View style={styles.entrenadorInfo}>
              <Text style={styles.entrenadorInfoText}>
                👀 Solo visualización
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a472a" />
        <Text style={styles.loadingText}>Cargando jugadores...</Text>
      </View>
    );
  }

  if (entrenadorSinCategorias) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🏉</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' }}>
          Sin categorías asignadas
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 30 }}>
          Pide a un administrador que te asigne una o más categorías para poder inscribir jugadores.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar jugador..."
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Filtro por categoría con nombres dinámicos */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterButton, categoriaFiltro === null && styles.filterButtonActive]}
          onPress={() => setCategoriaFiltro(null)}
        >
          <Text style={[styles.filterButtonText, categoriaFiltro === null && styles.filterButtonTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>

        {categorias.map((cat) => {
          const nombreMostrar = cat.nombre ? cat.nombre.substring(0, 5) : 'Cat';
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterButton, categoriaFiltro === cat.id && styles.filterButtonActive]}
              onPress={() => setCategoriaFiltro(cat.id)}
            >
              <Text style={[styles.filterButtonText, categoriaFiltro === cat.id && styles.filterButtonTextActive]}>
                {nombreMostrar}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de jugadores */}
      <FlatList
        data={jugadoresFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderJugador}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏉</Text>
            <Text style={styles.emptyTitle}>
              {busqueda || categoriaFiltro !== null ? 'No se encontraron jugadores' : 'Sin jugadores'}
            </Text>
            <Text style={styles.emptyText}>
              {busqueda || categoriaFiltro !== null
                ? 'Intenta con otro término de búsqueda o categoría' 
                : 'Crea tu primer jugador presionando el botón de abajo'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Barra de acciones - Solo para admins */}
      {(user?.role === 'super_admin' || user?.role === 'admin_club') && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1a472a' }]} onPress={handleCrear}>
            <Text style={styles.actionBtnText}>➕ Crear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1565c0' }]} onPress={handleImportarJugadores}>
            <Text style={styles.actionBtnText}>📥 Importar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6a1b9a' }]} onPress={handleDescargarPlantilla}>
            <Text style={styles.actionBtnText}>📋 Plantilla</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de formulario */}
      <FormJugador
        visible={modalVisible}
        jugador={jugadorEditar}
        categoriasPermitidas={user?.role === 'entrenador' ? categoriasEntrenador : undefined}
        onClose={() => setModalVisible(false)}
        onSave={handleGuardar}
      />

      {/* Modal de detalles */}
      <ModalDetallesJugador
        visible={modalDetallesVisible}
        jugador={jugadorDetalles}
        onClose={() => setModalDetallesVisible(false)}
      />

      {/* Modal Descuento Personal */}
      <Modal visible={modalDescuentoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalApod}>
            <View style={[styles.modalApodHeader, { backgroundColor: '#795548' }]}>
              <Text style={styles.modalApodTitulo}>🏷️ Descuento especial</Text>
              <TouchableOpacity onPress={() => setModalDescuentoVisible(false)}>
                <Text style={{ fontSize: 22, color: '#fff' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1, padding: 14 }}>
              <Text style={styles.modalApodSub}>Jugador: {jugadorDescuentoTarget?.nombre}</Text>

              <Text style={[styles.modalApodSeccion, { marginTop: 8 }]}>Porcentaje de descuento (0 = sin descuento)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <TextInput
                  style={[styles.modalApodSearch, { flex: 1, marginBottom: 0, fontSize: 20, fontWeight: 'bold', textAlign: 'center' }]}
                  value={descuentoValorStr}
                  onChangeText={v => setDescuentoValorStr(v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="0"
                />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#795548' }}>%</Text>
              </View>

              {/* Chips rápidos */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[0, 10, 15, 20, 25, 50, 100].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7,
                      borderRadius: 20, borderWidth: 1.5,
                      borderColor: descuentoValorStr === String(v) ? '#795548' : '#ddd',
                      backgroundColor: descuentoValorStr === String(v) ? '#efebe9' : '#f8f8f8',
                    }}
                    onPress={() => setDescuentoValorStr(String(v))}
                  >
                    <Text style={{ color: '#795548', fontWeight: descuentoValorStr === String(v) ? 'bold' : '400' }}>
                      {v === 0 ? 'Sin descuento' : `${v}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalApodSeccion}>Nota interna (opcional)</Text>
              <TextInput
                style={[styles.modalApodSearch, { height: 60, textAlignVertical: 'top' }]}
                value={notaDescuentoStr}
                onChangeText={setNotaDescuentoStr}
                placeholder="Ej: Beca deportiva, acuerdo con directiva..."
                multiline
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#eee' }}>
              <TouchableOpacity
                style={[styles.modalApodCerrarBtn, { flex: 1, backgroundColor: '#ccc' }]}
                onPress={() => setModalDescuentoVisible(false)}
              >
                <Text style={styles.modalApodCerrarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApodCerrarBtn, { flex: 1, backgroundColor: '#795548', opacity: guardandoDescuento ? 0.5 : 1 }]}
                onPress={handleGuardarDescuento}
                disabled={guardandoDescuento}
              >
                {guardandoDescuento
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalApodCerrarText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Apoderados */}
      <Modal visible={modalApodVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalApod}>
            <View style={styles.modalApodHeader}>
              <Text style={styles.modalApodTitulo}>👨‍👩‍👧 Apoderados</Text>
              <TouchableOpacity onPress={() => setModalApodVisible(false)}>
                <Text style={{ fontSize: 22, color: '#fff' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1, padding: 14 }} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalApodSub}>Jugador: {jugadorApod?.nombre}</Text>

              {cargandoApod ? (
                <ActivityIndicator color="#1a472a" style={{ marginVertical: 20 }} />
              ) : (
                <>
                  {/* Vinculados actuales */}
                  <Text style={styles.modalApodSeccion}>Apoderados vinculados</Text>
                  {apodVinculados.length === 0 ? (
                    <Text style={styles.modalApodVacio}>Sin apoderados vinculados</Text>
                  ) : (
                    apodVinculados.map(({ relacion, apoderado }) => (
                      <View key={relacion.id} style={styles.apodRow}>
                        <Text style={styles.apodNombre}>👤 {apoderado.nombre} {apoderado.apellido}</Text>
                        <Text style={styles.apodRol}>{relacion.tipoRelacion}</Text>
                        <TouchableOpacity
                          style={styles.apodRemoveBtn}
                          onPress={() => handleDesvincularApod(apoderado.id, `${apoderado.nombre} ${apoderado.apellido}`)}
                        >
                          <Text style={{ color: '#c62828', fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  {/* Disponibles para vincular */}
                  <Text style={[styles.modalApodSeccion, { marginTop: 16 }]}>
                    Usuarios con rol Apoderado
                  </Text>
                  <TextInput
                    style={styles.modalApodSearch}
                    placeholder="🔍 Buscar por nombre..."
                    value={busquedaApod}
                    onChangeText={setBusquedaApod}
                  />
                  {apodDisponibles
                    .filter(u => {
                      const yaVinculado = apodVinculados.some(v => v.apoderado.id === u.id);
                      const matchBusq = `${u.nombre} ${u.apellido}`.toLowerCase().includes(busquedaApod.toLowerCase());
                      return !yaVinculado && matchBusq;
                    })
                    .map(u => (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.apodDisponibleRow}
                        onPress={() => handleVincularApod(u)}
                      >
                        <Text style={styles.apodNombre}>👤 {u.nombre} {u.apellido}</Text>
                        <Text style={styles.apodVincularText}>⭕ Vincular</Text>
                      </TouchableOpacity>
                    ))
                  }
                  {apodDisponibles.filter(u => !apodVinculados.some(v => v.apoderado.id === u.id)).length === 0 && (
                    <Text style={styles.modalApodVacio}>
                      No hay usuarios con rol apoderado sin vincular.
                      Crea uno desde la pestaña Usuarios.
                    </Text>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalApodCerrarBtn}
              onPress={() => setModalApodVisible(false)}
            >
              <Text style={styles.modalApodCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal progreso importación */}
      <Modal visible={importModal} animationType="fade" transparent>
        <View style={styles.importOverlay}>
          <View style={styles.importCard}>
            <Text style={styles.importTitle}>📥 Importando jugadores...</Text>
            <Text style={styles.importSub}>⚠️ No cierres la app hasta que termine el proceso.</Text>
            <Text style={styles.importCount}>{importPaso} / {importTotal}</Text>
            {!importDone && <ActivityIndicator color="#1a472a" size="large" style={{ marginTop: 12 }} />}
            {importDone && (
              <>
                <Text style={[styles.importCount, { color: '#2e7d32', marginTop: 12 }]}>✅ Proceso completado</Text>
                {importErrores.length > 0 && (
                  <ScrollView style={{ maxHeight: 130, marginTop: 8, width: '100%' }}>
                    {importErrores.map((e, i) => (
                      <Text key={i} style={styles.importError}>{e}</Text>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity style={styles.importClose} onPress={() => setImportModal(false)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#1a472a',
    marginRight: 8,
    minWidth: 60,
    minHeight: 34,
  },
  filterButtonActive: {
    backgroundColor: '#1a472a',
    borderColor: '#1a472a',
  },
  filterButtonText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#1a472a',
    fontWeight: '600',
    includeFontPadding: false,
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardRut: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoriaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriaIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  categoriaText: {
    fontSize: 14,
    color: '#1a472a',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  entrenadorInfo: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  entrenadorInfoText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonInfo: {
    backgroundColor: '#9C27B0',
  },
  buttonEdit: {
    backgroundColor: '#2196F3',
  },
  buttonDelete: {
    backgroundColor: '#f44336',
  },
  buttonWarning: {
    backgroundColor: '#ff9800',
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#1a472a',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Apoderados modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalApod: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalApodHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#5c6bc0',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalApodTitulo: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  modalApodSub: { fontSize: 13, color: '#666', marginBottom: 12 },
  modalApodSeccion: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },
  modalApodVacio: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginBottom: 8 },
  apodRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, backgroundColor: '#f5f5f5',
    borderRadius: 8, marginBottom: 6,
  },
  apodNombre: { flex: 1, fontSize: 14, color: '#222' },
  apodRol: { fontSize: 12, color: '#5c6bc0', marginRight: 10 },
  apodRemoveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ffeaea', justifyContent: 'center', alignItems: 'center',
  },
  apodDisponibleRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, backgroundColor: '#e8f5e9',
    borderRadius: 8, marginBottom: 6,
  },
  apodVincularText: { fontSize: 13, color: '#1a472a', fontWeight: '600' },
  modalApodSearch: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 14, marginBottom: 10, backgroundColor: '#fafafa',
  },
  modalApodCerrarBtn: {
    margin: 14, backgroundColor: '#5c6bc0',
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  modalApodCerrarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Descuento personal
  descuentoBadge: {
    backgroundColor: '#fff3e0', borderRadius: 10, borderWidth: 1,
    borderColor: '#e65100', paddingHorizontal: 8, paddingVertical: 2,
  },
  descuentoBadgeText: { fontSize: 11, color: '#e65100', fontWeight: 'bold' },

  // Barra de acción
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Modal importación
  importOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  importCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '85%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  importTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a472a', marginBottom: 8 },
  importSub: { fontSize: 12, color: '#e65100', textAlign: 'center', marginBottom: 16 },
  importCount: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  importError: { fontSize: 12, color: '#c62828', marginBottom: 4 },
  importClose: {
    marginTop: 16, backgroundColor: '#1a472a',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32,
  },

  // Precios por jugador
  preciosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  precioChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f1f8e9', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#c8e6c9',
  },
  precioChipLabel: { fontSize: 10, color: '#555', fontWeight: '700', marginRight: 2 },
  precioBase: { fontSize: 11, color: '#bbb', textDecorationLine: 'line-through' },
  precioFinal: { fontSize: 11, color: '#1a472a', fontWeight: 'bold' },
  precioDtoTag: { fontSize: 10, color: '#e65100', fontWeight: 'bold' },
});

export default JugadoresTab;
