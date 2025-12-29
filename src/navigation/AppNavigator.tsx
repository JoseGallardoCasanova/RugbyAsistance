import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AsistenciaScreen from '../screens/AsistenciaScreen';
import PerfilScreen from '../screens/PerfilScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import AdminScreen from '../screens/admin/AdminScreen';

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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Asistencia" component={AsistenciaScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
            <Stack.Screen name="Configuracion" component={ConfiguracionScreen} />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{
                title: 'Panel de Administración',
                headerShown: false
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
