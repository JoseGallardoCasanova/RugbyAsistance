import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import { ThemeName, FontSize } from '../config/theme';

interface ConfiguracionScreenProps {
  navigation: any;
}

const ConfiguracionScreen: React.FC<ConfiguracionScreenProps> = ({ navigation }) => {
  const { preferences, currentColors, setTheme, setFontSize, setDarkMode } = usePreferences();

  const themes: { name: ThemeName; label: string; color: string }[] = [
    { name: 'navyPro', label: 'Navy Professional', color: '#0A192F' },
    { name: 'tealTransform', label: 'Transformative Teal', color: '#006B6B' },
    { name: 'earthyWarm', label: 'Earthy Warm', color: '#4A5D4E' },
    { name: 'premiumDark', label: 'Premium Dark', color: '#D4AF37' },
  ];

  const fontSizes: { size: FontSize; label: string }[] = [
    { size: 'small', label: 'Pequeño' },
    { size: 'normal', label: 'Normal' },
    { size: 'large', label: 'Grande' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configuración</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Tema de Color */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textPrimary }]}>Tema de Color</Text>
          <Text style={[styles.sectionDescription, { color: currentColors.textSecondary }]}>
            Elige el color principal de la aplicación
          </Text>
          <View style={styles.optionsContainer}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.name}
                style={[
                  styles.themeOption,
                  { backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
                  preferences.theme === theme.name && { borderColor: currentColors.primary, borderWidth: 3 },
                ]}
                onPress={() => setTheme(theme.name)}
              >
                <View style={[styles.colorCircle, { backgroundColor: theme.color }]} />
                <Text style={[styles.optionLabel, { color: currentColors.textPrimary }]}>{theme.label}</Text>
                {preferences.theme === theme.name && (
                  <Text style={[styles.checkmark, { color: currentColors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tamaño de Fuente */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textPrimary }]}>Tamaño de Texto</Text>
          <Text style={[styles.sectionDescription, { color: currentColors.textSecondary }]}>
            Ajusta el tamaño del texto en toda la app
          </Text>
          <View style={styles.optionsContainer}>
            {fontSizes.map((font) => (
              <TouchableOpacity
                key={font.size}
                style={[
                  styles.fontOption,
                  { backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
                  preferences.fontSize === font.size && { borderColor: currentColors.primary, borderWidth: 3 },
                ]}
                onPress={() => setFontSize(font.size)}
              >
                <Text
                  style={[
                    styles.fontPreview,
                    { color: currentColors.textPrimary },
                    font.size === 'small' && { fontSize: 14 },
                    font.size === 'normal' && { fontSize: 16 },
                    font.size === 'large' && { fontSize: 19 },
                  ]}
                >
                  Aa
                </Text>
                <Text style={[styles.optionLabel, { color: currentColors.textPrimary }]}>{font.label}</Text>
                {preferences.fontSize === font.size && (
                  <Text style={[styles.checkmark, { color: currentColors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Modo Oscuro */}
        <View style={styles.section}>
          <View style={styles.darkModeHeader}>
            <View style={styles.darkModeInfo}>
              <Text style={[styles.sectionTitle, { color: currentColors.textPrimary, marginBottom: 4 }]}>
                Modo Oscuro
              </Text>
              <Text style={[styles.sectionDescription, { color: currentColors.textSecondary }]}>
                Reduce el brillo de la pantalla
              </Text>
            </View>
            <Switch
              value={preferences.darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: currentColors.border, true: currentColors.primaryLight }}
              thumbColor={preferences.darkMode ? currentColors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Información */}
        <View style={[styles.infoSection, { backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border }]}>
          <Text style={[styles.infoTitle, { color: currentColors.textPrimary }]}>ℹ️ Sobre las Preferencias</Text>
          <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>
            Estas configuraciones se guardan localmente en tu dispositivo y solo afectan cómo ves la aplicación en este teléfono.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    width: 40,
  },
  backIcon: {
    fontSize: 30,
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  fontPreview: {
    fontWeight: 'bold',
    marginRight: 12,
    width: 32,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  darkModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkModeInfo: {
    flex: 1,
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ConfiguracionScreen;
