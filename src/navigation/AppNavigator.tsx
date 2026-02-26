import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContextV2';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AsistenciaScreen from '../screens/AsistenciaScreen';
import PerfilScreen from '../screens/PerfilScreen';
import EstadisticasScreen from '../screens/EstadisticasScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import ExportarAsistenciasScreen from '../screens/admin/ExportarAsistenciasScreen';
import PerfilJugadorScreen from '../screens/PerfilJugadorScreen';
import ApoderadoScreen from '../screens/ApoderadoScreen';
import PagoScreen from '../screens/PagoScreen';

const Stack = createStackNavigator<RootStackParamList>();

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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
            <Stack.Screen name="Estadisticas" component={EstadisticasScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
            <Stack.Screen name="ExportarAsistencias" component={ExportarAsistenciasScreen} />
            <Stack.Screen name="PerfilJugador" component={PerfilJugadorScreen} />
            <Stack.Screen name="Apoderado" component={ApoderadoScreen} />
            <Stack.Screen name="Pago" component={PagoScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
