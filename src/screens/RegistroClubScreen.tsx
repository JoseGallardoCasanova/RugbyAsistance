import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';

interface Props {
  navigation: any;
}

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export default function RegistroClubScreen({ navigation }: Props) {
  const [paso, setPaso] = useState<1 | 2>(1); // Paso 1: código | Paso 2: datos

  // Paso 1
  const [codigo, setCodigo] = useState('');
  const [validandoCodigo, setValidandoCodigo] = useState(false);

  // Paso 2
  const [nombreClub, setNombreClub] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [adminApellido, setAdminApellido] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManual, setUsernameManual] = useState(false);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Auto-generate username
  useEffect(() => {
    if (!usernameManual && adminNombre.trim() && adminApellido.trim()) {
      setUsername(normalize(adminNombre).charAt(0) + normalize(adminApellido));
    }
  }, [adminNombre, adminApellido, usernameManual]);

  const handleValidarCodigo = async () => {
    const codigoLimpio = codigo.toUpperCase().trim();
    if (!codigoLimpio) {
      Alert.alert('Error', 'Ingresa el código de invitación.');
      return;
    }
    setValidandoCodigo(true);
    const valido = await SupabaseServiceV2.validarCodigoInvitacion(codigoLimpio);
    setValidandoCodigo(false);
    if (valido) {
      setPaso(2);
    } else {
      Alert.alert('Código inválido', 'El código ingresado no es válido o ya fue utilizado. Solicita uno nuevo al administrador del sistema.');
    }
  };

  const handleElegirLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para subir el logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleRegistrar = async () => {
    if (!nombreClub.trim()) { Alert.alert('Error', 'El nombre del club es obligatorio.'); return; }
    if (!adminNombre.trim()) { Alert.alert('Error', 'El nombre del administrador es obligatorio.'); return; }
    if (!adminApellido.trim()) { Alert.alert('Error', 'El apellido del administrador es obligatorio.'); return; }
    if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) { Alert.alert('Error', 'Ingresa un correo electrónico válido.'); return; }
    if (!username.trim()) { Alert.alert('Error', 'El nombre de usuario es obligatorio.'); return; }
    if (!password.trim() || password.length < 6) { Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.'); return; }

    setGuardando(true);
    try {
      const resultado = await SupabaseServiceV2.crearClub(
        nombreClub.trim(),
        adminNombre.trim(),
        adminApellido.trim(),
        username.trim(),
        password,
        adminEmail.trim(),
        logoUri ?? undefined
      );

      if (!resultado) throw new Error('No se pudo crear el club. Intenta nuevamente.');

      // Marcar código como usado
      await SupabaseServiceV2.marcarCodigoUsado(codigo.toUpperCase().trim(), resultado.club.id);

      Alert.alert(
        '🎉 ¡Club creado!',
        `El club "${resultado.club.nombre}" fue creado exitosamente.\n\n👤 Tu usuario: ${resultado.admin.username}\n🔑 Contraseña: la que elegiste\n\n¡Ya puedes iniciar sesión!`,
        [{ text: 'Iniciar Sesión', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Ocurrió un error al crear el club.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Club</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Pasos */}
          <View style={styles.pasosRow}>
            <View style={[styles.pasoIndicador, paso === 1 && styles.pasoActivo]}>
              <Text style={[styles.pasoNum, paso === 1 && styles.pasoNumActivo]}>1</Text>
              <Text style={[styles.pasoLabel, paso === 1 && styles.pasoLabelActivo]}>Código</Text>
            </View>
            <View style={styles.pasoLinea} />
            <View style={[styles.pasoIndicador, paso === 2 && styles.pasoActivo]}>
              <Text style={[styles.pasoNum, paso === 2 && styles.pasoNumActivo]}>2</Text>
              <Text style={[styles.pasoLabel, paso === 2 && styles.pasoLabelActivo]}>Datos del club</Text>
            </View>
          </View>

          {/* ── PASO 1: Código ── */}
          {paso === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔐 Código de invitación</Text>
              <Text style={styles.cardSubtitle}>
                Para crear un club necesitas un código de invitación proporcionado por el administrador del sistema.
              </Text>
              <TextInput
                style={styles.input}
                value={codigo}
                onChangeText={v => setCodigo(v.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={14}
                editable={!validandoCodigo}
              />
              <TouchableOpacity
                style={[styles.btn, validandoCodigo && styles.btnDisabled]}
                onPress={handleValidarCodigo}
                disabled={validandoCodigo}
              >
                {validandoCodigo
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Validar código →</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── PASO 2: Datos ── */}
          {paso === 2 && (
            <>
              {/* Club */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏉 Datos del Club</Text>

                <Text style={styles.label}>Nombre del club *</Text>
                <TextInput
                  style={styles.input}
                  value={nombreClub}
                  onChangeText={setNombreClub}
                  placeholder="Ej: Old Green Rugby Club"
                  editable={!guardando}
                />

                {/* Logo */}
                <Text style={styles.label}>Logo del club (opcional)</Text>
                <TouchableOpacity style={styles.logoBtn} onPress={handleElegirLogo} disabled={guardando}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Text style={styles.logoPlaceholderIcon}>📷</Text>
                      <Text style={styles.logoPlaceholderText}>Subir logo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {logoUri && (
                  <TouchableOpacity onPress={() => setLogoUri(null)}>
                    <Text style={styles.quitarLogo}>✕ Quitar imagen</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Admin */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>👑 Administrador del Club</Text>

                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={adminNombre}
                  onChangeText={setAdminNombre}
                  placeholder="Juan"
                  editable={!guardando}
                />

                <Text style={styles.label}>Apellido *</Text>
                <TextInput
                  style={styles.input}
                  value={adminApellido}
                  onChangeText={setAdminApellido}
                  placeholder="Pérez"
                  editable={!guardando}
                />

                <Text style={styles.label}>Correo electrónico *</Text>
                <TextInput
                  style={styles.input}
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  placeholder="juan@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!guardando}
                />

                <Text style={styles.label}>Nombre de usuario *</Text>
                <View style={styles.usernameRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={username}
                    onChangeText={v => { setUsername(v.toLowerCase().replace(/[^a-z0-9]/g, '')); setUsernameManual(true); }}
                    placeholder="jperez"
                    autoCapitalize="none"
                    editable={!guardando}
                  />
                  {usernameManual && (
                    <TouchableOpacity style={styles.autoBtn} onPress={() => setUsernameManual(false)}>
                      <Text style={styles.autoBtnText}>🤖 Auto</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.hint}>Solo letras y números, sin espacios.</Text>

                <Text style={styles.label}>Contraseña *</Text>
                <View style={styles.passRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry={!showPass}
                    editable={!guardando}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <Text>{showPass ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, guardando && styles.btnDisabled]}
                onPress={handleRegistrar}
                disabled={guardando}
              >
                {guardando
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>🎉 Crear Club</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setPaso(1)} style={styles.volverPaso}>
                <Text style={styles.volverPasoText}>← Cambiar código</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a472a',
    padding: 16,
    paddingTop: 20,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  pasosRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 4 },
  pasoIndicador: { alignItems: 'center', gap: 4 },
  pasoActivo: {},
  pasoNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#ddd', color: '#888',
    textAlign: 'center', lineHeight: 32, fontWeight: 'bold', fontSize: 14,
    overflow: 'hidden',
  },
  pasoNumActivo: { backgroundColor: '#1a472a', color: '#fff' },
  pasoLabel: { fontSize: 12, color: '#aaa' },
  pasoLabelActivo: { color: '#1a472a', fontWeight: '600' },
  pasoLinea: { flex: 1, height: 2, backgroundColor: '#ddd', marginHorizontal: 8, marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a472a', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: '#fafafa',
  },
  hint: { fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoBtn: { backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#a5d6a7' },
  autoBtnText: { fontSize: 12, color: '#1a472a', fontWeight: '600' },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  logoBtn: { marginTop: 4 },
  logoPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#1a472a' },
  logoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#e8f5e9', borderWidth: 2, borderColor: '#a5d6a7', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  logoPlaceholderIcon: { fontSize: 26 },
  logoPlaceholderText: { fontSize: 11, color: '#aaa', marginTop: 4 },
  quitarLogo: { fontSize: 13, color: '#c62828', marginTop: 6 },
  btn: {
    backgroundColor: '#1a472a', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  volverPaso: { alignItems: 'center', marginTop: 12 },
  volverPasoText: { color: '#666', fontSize: 14 },
});
