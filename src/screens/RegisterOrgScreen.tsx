import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import { PlanType, PLANES } from '../types/index';
import OrganizacionService from '../services/OrganizacionService';
import SupabaseService from '../services/SupabaseService';

interface RegisterOrgScreenProps {
  navigation: any;
  route: {
    params: {
      plan: PlanType;
    };
  };
}

export default function RegisterOrgScreen({ navigation, route }: RegisterOrgScreenProps) {
  const { currentColors, fontSizes } = usePreferences();
  const { plan } = route.params;
  const planInfo = PLANES[plan];

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizacionNombre: '',
    adminNombre: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.organizacionNombre.trim()) {
      Alert.alert('Error', 'El nombre de la organización es requerido');
      return false;
    }
    if (!formData.adminNombre.trim()) {
      Alert.alert('Error', 'Tu nombre es requerido');
      return false;
    }
    if (!formData.adminEmail.trim()) {
      Alert.alert('Error', 'El email es requerido');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      Alert.alert('Error', 'El email no es válido');
      return false;
    }
    if (formData.adminPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await SupabaseService.signUp(
        formData.adminEmail,
        formData.adminPassword
      );

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. Crear organización y suscripción
      const organizacion = await OrganizacionService.crearOrganizacion({
        nombre: formData.organizacionNombre.trim(),
        email_admin: formData.adminEmail,
        plan,
      });

      // 3. Crear usuario en tabla usuarios con organizacion_id
      const { error: userError } = await SupabaseService.client
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: formData.adminEmail,
          nombre: formData.adminNombre.trim(),
          role: 'admin',
          activo: true,
          organizacion_id: organizacion.id,
        });

      if (userError) throw new Error(userError.message);

      Alert.alert(
        '🎉 ¡Bienvenido a SquadPro!',
        `Tu organización "${formData.organizacionNombre}" ha sido creada exitosamente.\n\nPlan: ${planInfo.nombre}\nPrueba gratis: ${plan === 'free' ? 'N/A' : '14 días'}`,
        [
          {
            text: 'Continuar',
            onPress: () => {
              // Navegar a Home (el AuthContext detectará el nuevo usuario)
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al registrar:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la organización');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentColors.primary }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backIcon, { fontSize: fontSizes.xl }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { fontSize: fontSizes.xxl }]}>Crea tu cuenta</Text>
          <Text style={[styles.subtitle, { fontSize: fontSizes.sm }]}>
            Plan: {planInfo.nombre} - ${planInfo.precio_mensual}/mes
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Organization section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: fontSizes.lg, color: currentColors.textPrimary }]}>
            📋 Información de la Organización
          </Text>
          
          <Text style={[styles.label, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
            Nombre de la organización *
          </Text>
          <TextInput
            style={[
              styles.input,
              { fontSize: fontSizes.md, color: currentColors.textPrimary, backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
            ]}
            placeholder="Ej: Club Deportivo Los Tigres"
            placeholderTextColor={currentColors.textSecondary}
            value={formData.organizacionNombre}
            onChangeText={(value) => handleChange('organizacionNombre', value)}
            editable={!loading}
          />
        </View>

        {/* Admin section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: fontSizes.lg, color: currentColors.textPrimary }]}>
            👤 Datos del Administrador
          </Text>
          
          <Text style={[styles.label, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
            Tu nombre *
          </Text>
          <TextInput
            style={[
              styles.input,
              { fontSize: fontSizes.md, color: currentColors.textPrimary, backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
            ]}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor={currentColors.textSecondary}
            value={formData.adminNombre}
            onChangeText={(value) => handleChange('adminNombre', value)}
            editable={!loading}
          />

          <Text style={[styles.label, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
            Email *
          </Text>
          <TextInput
            style={[
              styles.input,
              { fontSize: fontSizes.md, color: currentColors.textPrimary, backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
            ]}
            placeholder="admin@clubdeportivo.com"
            placeholderTextColor={currentColors.textSecondary}
            value={formData.adminEmail}
            onChangeText={(value) => handleChange('adminEmail', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={[styles.label, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
            Contraseña *
          </Text>
          <TextInput
            style={[
              styles.input,
              { fontSize: fontSizes.md, color: currentColors.textPrimary, backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
            ]}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={currentColors.textSecondary}
            value={formData.adminPassword}
            onChangeText={(value) => handleChange('adminPassword', value)}
            secureTextEntry
            editable={!loading}
          />

          <Text style={[styles.label, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
            Confirmar contraseña *
          </Text>
          <TextInput
            style={[
              styles.input,
              { fontSize: fontSizes.md, color: currentColors.textPrimary, backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
            ]}
            placeholder="Repite tu contraseña"
            placeholderTextColor={currentColors.textSecondary}
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange('confirmPassword', value)}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Plan summary */}
        <View style={[styles.planSummary, { backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border }]}>
          <Text style={[styles.planSummaryTitle, { fontSize: fontSizes.md, color: currentColors.textPrimary }]}>
            🎯 Resumen del Plan
          </Text>
          <View style={styles.planSummaryContent}>
            {planInfo.features.map((feature, index) => (
              <View key={index} style={styles.summaryRow}>
                <Text style={[styles.summaryIcon, { color: currentColors.primary }]}>✓</Text>
                <Text style={[styles.summaryText, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
          {plan !== 'free' && (
            <Text style={[styles.trialText, { fontSize: fontSizes.xs, color: currentColors.textSecondary }]}>
              🎁 14 días de prueba gratis - cancela cuando quieras
            </Text>
          )}
        </View>

        {/* Terms */}
        <Text style={[styles.terms, { fontSize: fontSizes.xs, color: currentColors.textSecondary }]}>
          Al crear tu cuenta, aceptas nuestros Términos de Servicio y Política de Privacidad.
        </Text>
      </ScrollView>

      {/* Register button */}
      <View style={[styles.footer, { backgroundColor: currentColors.backgroundWhite, borderTopColor: currentColors.border }]}>
        <TouchableOpacity
          style={[
            styles.registerButton,
            { backgroundColor: currentColors.primary },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.registerButtonText, { fontSize: fontSizes.md }]}>
              Crear mi cuenta
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backIcon: {
    color: '#fff',
  },
  headerContent: {
    gap: 5,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 15,
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planSummary: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  planSummaryTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  planSummaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryText: {
    flex: 1,
  },
  trialText: {
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  terms: {
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  registerButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
