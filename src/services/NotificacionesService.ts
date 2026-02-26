import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Entrenamiento } from '../types/v2';

// ─── Configuración global de cómo se muestran las notificaciones ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ConfigNotificaciones {
  habilitadas: boolean;
  minutosAntes: number; // 15 | 30 | 60 | 120
}

const CONFIG_KEY = '@notif_config';
const IDS_KEY    = '@notif_ids'; // { [entrenamientoId]: notificationIdentifier }

const CONFIG_DEFAULT: ConfigNotificaciones = {
  habilitadas: false,
  minutosAntes: 60,
};

// ─── Servicio ─────────────────────────────────────────────────────────────────
const NotificacionesService = {

  // ── Permisos ────────────────────────────────────────────────────────────────

  async solicitarPermisos(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('entrenamientos', {
        name: 'Recordatorios de entrenamiento',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1a472a',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  // ── Preferencias ────────────────────────────────────────────────────────────

  async obtenerConfig(): Promise<ConfigNotificaciones> {
    try {
      const raw = await AsyncStorage.getItem(CONFIG_KEY);
      if (!raw) return CONFIG_DEFAULT;
      return { ...CONFIG_DEFAULT, ...JSON.parse(raw) };
    } catch {
      return CONFIG_DEFAULT;
    }
  },

  async guardarConfig(config: Partial<ConfigNotificaciones>): Promise<void> {
    const actual = await this.obtenerConfig();
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify({ ...actual, ...config }));
  },

  // ── Mapa entrenamientoId → notificationIdentifier ────────────────────────────

  async _getIds(): Promise<Record<string, string>> {
    try {
      const raw = await AsyncStorage.getItem(IDS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  async _setIds(ids: Record<string, string>): Promise<void> {
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
  },

  // ── Programar recordatorio ─────────────────────────────────────────────────

  async programarRecordatorio(
    entrenamiento: Entrenamiento,
    categoriaNombre?: string
  ): Promise<void> {
    const config = await this.obtenerConfig();
    if (!config.habilitadas) return;

    const tienePermiso = await this.solicitarPermisos();
    if (!tienePermiso) return;

    // Calcular fecha/hora del trigger: fechaEntrenamiento - minutosAntes
    const [anio, mes, dia] = entrenamiento.fecha.split('-').map(Number);
    let horaDisparo = 9; // default 9:00 AM si no hay hora definida
    let minDisparo  = 0;

    if (entrenamiento.horaInicio) {
      const [h, m] = entrenamiento.horaInicio.split(':').map(Number);
      const totalMin = h * 60 + m - config.minutosAntes;
      horaDisparo = Math.floor(Math.max(totalMin, 0) / 60);
      minDisparo  = Math.max(totalMin, 0) % 60;
    }

    const fechaTrigger = new Date(anio, mes - 1, dia, horaDisparo, minDisparo, 0);

    // No programar si ya pasó
    if (fechaTrigger <= new Date()) return;

    // Cancelar el anterior si existe
    await this.cancelarRecordatorio(entrenamiento.id);

    const horaTexto = entrenamiento.horaInicio
      ? `a las ${entrenamiento.horaInicio}`
      : 'hoy';

    const titulo = categoriaNombre
      ? `🏉 Entrenamiento ${categoriaNombre}`
      : '🏉 Recordatorio de entrenamiento';

    const cuerpo = entrenamiento.ubicacion
      ? `${horaTexto} en ${entrenamiento.ubicacion}`
      : horaTexto;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: `Recordatorio: entrenamiento ${cuerpo}`,
        sound: true,
        data: { entrenamientoId: entrenamiento.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fechaTrigger,
        channelId: 'entrenamientos',
      } as any,
    });

    // Guardar el id para poder cancelarlo después
    const ids = await this._getIds();
    ids[entrenamiento.id] = identifier;
    await this._setIds(ids);

    console.log(`🔔 [NOTIF] Programado "${titulo}" para ${fechaTrigger.toLocaleString()}`);
  },

  // ── Cancelar recordatorio de un entrenamiento ────────────────────────────────

  async cancelarRecordatorio(entrenamientoId: string): Promise<void> {
    const ids = await this._getIds();
    const identifier = ids[entrenamientoId];
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
      delete ids[entrenamientoId];
      await this._setIds(ids);
    }
  },

  // ── Cancelar todos ───────────────────────────────────────────────────────────

  async cancelarTodos(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(IDS_KEY);
    console.log('🔔 [NOTIF] Todos los recordatorios cancelados');
  },

  // ── Reprogramar lista completa (útil al cambiar minutosAntes) ────────────────

  async reprogramarTodos(
    entrenamientos: Entrenamiento[],
    categoriaNombre?: string
  ): Promise<void> {
    await this.cancelarTodos();
    for (const e of entrenamientos) {
      await this.programarRecordatorio(e, categoriaNombre);
    }
  },

  // ── Notificación de prueba inmediata ─────────────────────────────────────────

  async enviarPrueba(): Promise<boolean> {
    const tienePermiso = await this.solicitarPermisos();
    if (!tienePermiso) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏉 ¡Notificaciones activas!',
        body: 'Los recordatorios de entrenamiento están funcionando correctamente.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        channelId: 'entrenamientos',
      } as any,
    });

    return true;
  },

  // ── Obtener pendientes ────────────────────────────────────────────────────────

  async obtenerPendientes(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },
};

export default NotificacionesService;
