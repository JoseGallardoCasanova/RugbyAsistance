import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleSheetsService from '../services/GoogleSheetsService';

interface ConfiguracionScreenProps {
  navigation: any;
}

const ConfiguracionScreen: React.FC<ConfiguracionScreenProps> = ({ navigation }) => {
  const [scriptUrlAsistencias, setScriptUrlAsistencias] = useState('');
  const [scriptUrlBD, setScriptUrlBD] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configJson = await AsyncStorage.getItem('google_sheets_config');
      if (configJson) {
        const config = JSON.parse(configJson);
        setScriptUrlAsistencias(config.scriptUrl || '');
        setScriptUrlBD(config.scriptUrlBD || '');
        setSheetName(config.sheetName || '');
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const handleGuardar = async () => {
    // Validar URLs obligatorias
    if (!scriptUrlAsistencias.trim()) {
      Alert.alert('Error', 'La URL del script de asistencias es obligatoria');
      return;
    }

    if (!scriptUrlBD.trim()) {
      Alert.alert('Error', 'La URL del script de base de datos es obligatoria');
      return;
    }

    setGuardando(true);

    try {
      const config = {
        scriptUrl: scriptUrlAsistencias.trim(),
        scriptUrlBD: scriptUrlBD.trim(),
        sheetName: sheetName.trim() || '', // Opcional - vacío = modo automático
      };

      await AsyncStorage.setItem('google_sheets_config', JSON.stringify(config));
      
      await GoogleSheetsService.saveConfig(config);

      Alert.alert(
        '✅ Guardado',
        sheetName.trim() 
          ? 'Configuración guardada. Se usará el nombre de hoja manual.'
          : 'Configuración guardada. Se usará modo automático (Mes_Año).',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  const handleInicializarSheet = async () => {
    if (!scriptUrlAsistencias.trim()) {
      Alert.alert('Error', 'Primero debes guardar la configuración');
      return;
    }

    // Determinar nombre del sheet
    let mesNombre, año;
    
    if (sheetName.trim()) {
      // Usar nombre manual
      const parts = sheetName.split('_');
      mesNombre = parts[0];
      año = parseInt(parts[1]) || new Date().getFullYear();
    } else {
      // Usar modo automático
      const hoy = new Date();
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      mesNombre = meses[hoy.getMonth()];
      año = hoy.getFullYear();
    }

    Alert.alert(
      'Inicializar Sheet',
      `¿Deseas crear la estructura inicial para ${mesNombre} ${año}?\n\nEsto creará las columnas para todo el mes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Inicializar',
          onPress: async () => {
            setGuardando(true);

            console.log('🚀 Inicializando sheet:', { mes: mesNombre, año });

            const success = await GoogleSheetsService.inicializarSheet(mesNombre, año);

            setGuardando(false);

            if (success) {
              Alert.alert('✅ Éxito', `El sheet ${mesNombre}_${año} se ha inicializado correctamente`);
            } else {
              Alert.alert('❌ Error', 'No se pudo inicializar el sheet. Verifica la configuración y los logs.');
            }
          },
        },
      ]
    );
  };

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instrucciones */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>📚 Configuración de Google Sheets</Text>
          <Text style={styles.instructionsText}>
            Necesitas configurar DOS Google Apps Scripts separados por seguridad:
          </Text>
          <Text style={styles.instructionsStep}>
            1. Script de Asistencias (público){'\n'}
            2. Script de Base de Datos (privado - usuarios/jugadores){'\n'}
            3. Nombre de hoja (opcional - modo automático si vacío)
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Script de Asistencias */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL del Script de Asistencias *</Text>
            <TextInput
              style={styles.input}
              value={scriptUrlAsistencias}
              onChangeText={setScriptUrlAsistencias}
              placeholder="https://script.google.com/macros/s/..."
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Spreadsheet público donde se guardan las asistencias
            </Text>
          </View>

          {/* Script de BD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL del Script de Base de Datos *</Text>
            <TextInput
              style={styles.input}
              value={scriptUrlBD}
              onChangeText={setScriptUrlBD}
              placeholder="https://script.google.com/macros/s/..."
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Spreadsheet privado donde se guardan usuarios y jugadores
            </Text>
          </View>

          {/* Nombre de hoja (opcional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre de la hoja (opcional)</Text>
            <TextInput
              style={styles.input}
              value={sheetName}
              onChangeText={setSheetName}
              placeholder="Deja vacío para modo automático"
            />
            <Text style={styles.hint}>
              Si lo dejas vacío, se usará el mes actual automáticamente (ej: Diciembre_2024)
            </Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, guardando && styles.buttonDisabled]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            <Text style={styles.buttonText}>
              {guardando ? '💾 Guardando...' : '💾 Guardar configuración'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, guardando && styles.buttonDisabled]}
            onPress={handleInicializarSheet}
            disabled={guardando}
          >
            <Text style={styles.buttonSecondaryText}>
              🚀 Inicializar estructura del sheet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ayuda adicional */}
        <View style={styles.help}>
          <Text style={styles.helpTitle}>ℹ️ ¿Por qué DOS spreadsheets?</Text>
          <Text style={styles.helpText}>
            Por seguridad, los datos de usuarios y jugadores (base de datos) deben estar en un spreadsheet privado,
            separado del spreadsheet de asistencias que puede ser compartido con más personas.
          </Text>
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
  },
  instructions: {
    backgroundColor: '#fff3cd',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  instructionsStep: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  actions: {
    padding: 20,
    gap: 15,
  },
  button: {
    backgroundColor: '#ff6b35',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  help: {
    backgroundColor: '#e3f2fd',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
});

export default ConfiguracionScreen;
