import React from 'react';
import { ClubProvider } from './src/context/ClubContext';
import { AuthProvider } from './src/context/AuthContextV2';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ClubProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ClubProvider>
  );
}
