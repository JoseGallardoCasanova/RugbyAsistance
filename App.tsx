import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AsistenciaScreen from './src/screens/AsistenciaScreen';
import AdminScreen from './src/screens/admin/AdminScreen'; // ✅ Ruta corregida
import ConfiguracionScreen from './src/screens/ConfiguracionScreen'; // ✅ Ruta corregida
import DatabaseService from './src/services/DatabaseService';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user } = useAuth();

  useEffect(() => {
    // ✅ Inicializar servicios la primera vez
    const inicializar = async () => {
      console.log('🚀 Inicializando servicios...');
      await DatabaseService.initialize();
    };

    inicializar();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
