import React, { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseService from './src/services/DatabaseService';

export default function App() {
  useEffect(() => {
    // Inicializar servicios la primera vez
    const inicializar = async () => {
      console.log('🚀 Inicializando servicios...');
      await DatabaseService.initialize();
    };

    inicializar();
  }, []);

  return (
    <PreferencesProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </PreferencesProvider>
  );
}
