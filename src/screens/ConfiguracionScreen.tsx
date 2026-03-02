import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContextV2';
import { useClub } from '../context/ClubContext';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';

interface ConfiguracionScreenProps {
  navigation: any;
}

const ConfiguracionScreen: React.FC<ConfiguracionScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { club, updateClub } = useClub();
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const isAdmin = user?.role === 'admin_club' || user?.role === 'super_admin';
  const isEntrenador = user?.role === 'entrenador';

  const handleCambiarLogo = async () => {
    if (!club) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita acceso a la galería para cambiar el logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setSubiendoLogo(true);
    try {
      const logoUrl = await SupabaseServiceV2.subirLogoClub(club.id, uri);
      if (logoUrl) {
        await updateClub({ logoUrl });
        Alert.alert('✅ Logo actualizado', 'El logo del club se ha cambiado correctamente.');
      } else {
        Alert.alert('Error', 'No se pudo subir la imagen. Inténtalo de nuevo.');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al subir el logo.');
    } finally {
      setSubiendoLogo(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const renderRow = (icon: string, label: string, value?: string, onPress?: () => void) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        </View>
      </View>
      {onPress && <Text style={styles.rowArrow}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Club info */}
        {(club || isAdmin) && renderSection('🏉 Club', <>
          {renderRow('🏟️', 'Nombre del club', club?.nombre ?? '—')}
          {isAdmin && (
            <TouchableOpacity
              style={styles.row}
              onPress={handleCambiarLogo}
              activeOpacity={0.7}
              disabled={subiendoLogo}
            >
              <View style={styles.rowLeft}>
                <View style={styles.logoThumbWrap}>
                  {club.logoUrl
                    ? <Image source={{ uri: club.logoUrl }} style={styles.logoThumb} />
                    : <Text style={{ fontSize: 20 }}>🖼️</Text>}
                </View>
                <View>
                  <Text style={styles.rowLabel}>Logo del club</Text>
                  <Text style={styles.rowValue}>
                    {subiendoLogo ? 'Subiendo...' : 'Cambiar imagen'}
                  </Text>
                </View>
              </View>
              {subiendoLogo
                ? <ActivityIndicator size="small" color="#1a472a" />
                : <Text style={styles.rowArrow}>›</Text>}
            </TouchableOpacity>
          )}
          {isAdmin && renderRow('👥', 'Panel de administración', 'Usuarios, jugadores, categorías...', () => navigation.navigate('Admin'))}
          {isAdmin && renderRow('📢', 'Avisos del club', 'Publicar novedades', () => navigation.navigate('Admin', { initialTab: 'avisos' }))}
          {isAdmin && renderRow('📅', 'Calendario de entrenamientos', 'Programar sesiones', () => navigation.navigate('Admin', { initialTab: 'calendario' }))}
          {isAdmin && renderRow('📝', 'Formulario de inscripción', 'Configurar campos', () => navigation.navigate('Admin', { initialTab: 'formulario' }))}
        </>)}

        {/* Cuenta */}
        {renderSection('👤 Mi cuenta', <>
          {renderRow('🪪', 'Usuario', `@${user?.username}`)}
          {renderRow('📛', 'Nombre', `${user?.nombre} ${user?.apellido ?? ''}`.trim())}
          {renderRow('🎭', 'Rol', user?.role?.replace('_', ' '))}
          {renderRow('✏️', 'Editar perfil', 'Foto, contraseña, datos', () => navigation.navigate('Perfil'))}
        </>)}

        {/* Accesos rápidos por rol */}
        {(isAdmin || isEntrenador) && renderSection('⚡ Accesos rápidos', <>
          {renderRow('📊', 'Exportar asistencias', 'Generar planilla Excel', () => navigation.navigate('ExportarAsistencias'))}
          {renderRow('📈', 'Estadísticas', 'Ranking y resúmenes', () => navigation.navigate('Estadisticas'))}
          {isAdmin && renderRow('💳', 'Gestión de pagos', 'Matrículas y mensualidades', () => navigation.navigate('Admin', { initialTab: 'pagos' }))}
        </>)}

        {/* Aplicación */}
        {renderSection('ℹ️ Aplicación', <>
          {renderRow('🔒', 'Base de datos', 'Supabase (sincronización automática)')}
          {renderRow('📱', 'Plataforma', 'React Native + Expo')}
          {renderRow('🌐', 'Formulario web', 'Inscripción online para jugadores', () => Linking.openURL('https://formulariorugby.vercel.app').catch(() => {}))}
        </>)}

        {/* Sesión */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a472a',
  },
  backButton: { width: 40 },
  backIcon: { fontSize: 30, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  logoThumbWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  rowLabel: { fontSize: 15, color: '#222', fontWeight: '500' },
  rowValue: { fontSize: 13, color: '#888', marginTop: 2 },
  rowArrow: { fontSize: 22, color: '#ccc', fontWeight: '300' },
  logoutBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  logoutIcon: { fontSize: 22 },
  logoutText: { fontSize: 16, color: '#c62828', fontWeight: '600' },
});

export default ConfiguracionScreen;

