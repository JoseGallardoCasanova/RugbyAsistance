import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AsistenciaScreen from '../screens/AsistenciaScreen';
import PerfilScreen from '../screens/PerfilScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import AdminScreen from '../screens/admin/AdminScreen';
// import ExportarAsistenciasScreen from '../screens/admin/ExportarAsistenciasScreen';

// COMPONENTE INLINE TEMPORAL PARA PROBAR
const ExportarAsistenciasScreenTEMP = ({ navigation }: any) => {
  const { currentColors } = require('../context/PreferencesContext').usePreferences();
  return (
  <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
    <View style={{ backgroundColor: currentColors.primary, padding: 50 }}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: '#fff', fontSize: 16 }}>← Volver</Text>
      </TouchableOpacity>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 10 }}>
        📊 Exportar Asistencias
      </Text>
    </View>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>✅ FUNCIONA!</Text>
      <Text style={{ fontSize: 16, textAlign: 'center', color: '#666' }}>
        La navegación está funcionando correctamente.{'\n\n'}
        Ahora implementaremos la funcionalidad de exportación.
      </Text>
    </View>
  </View>
  );
};

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // O podrías mostrar un splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="ExportarAsistencias" component={ExportarAsistenciasScreenTEMP} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
            <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
