import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { USERS } from '../data/mockData';
import DatabaseService from '../services/DatabaseService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isLoading: boolean;
  usandoBD: boolean; // Indica si está usando BD o mock
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usandoBD, setUsandoBD] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      if (userJson) {
        setUser(JSON.parse(userJson));
      }
      
      // Verificar si hay configuración de BD
      const configJson = await AsyncStorage.getItem('google_sheets_config');
      setUsandoBD(!!configJson);
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 Intentando login:', { email });
    
    try {
      // Intentar primero con la BD si está configurada
      const configJson = await AsyncStorage.getItem('google_sheets_config');
      
      if (configJson) {
        console.log('📊 Intentando login con BD...');
        const usuarios = await DatabaseService.obtenerUsuarios();
        
        if (usuarios.length > 0) {
          const foundUser = usuarios.find(
            u => u.email === email && u.password === password && u.activo !== false
          );

          if (foundUser) {
            console.log('✅ Usuario encontrado en BD:', foundUser.nombre, 'Rol:', foundUser.role);
            await AsyncStorage.setItem('currentUser', JSON.stringify(foundUser));
            setUser(foundUser);
            setUsandoBD(true);
            return true;
          }
        }
      }
      
      // Fallback a datos mock
      console.log('📝 Usando datos mock...');
      const foundUser = USERS.find(
        u => u.email === email && u.password === password
      );

      if (foundUser) {
        console.log('✅ Usuario encontrado en mock:', foundUser.nombre, 'Rol:', foundUser.role);
        await AsyncStorage.setItem('currentUser', JSON.stringify(foundUser));
        setUser(foundUser);
        setUsandoBD(false);
        return true;
      }

      console.log('❌ Credenciales inválidas');
      return false;
      
    } catch (error) {
      console.error('❌ Error al hacer login:', error);
      
      // Fallback final a mock
      const foundUser = USERS.find(
        u => u.email === email && u.password === password
      );

      if (foundUser) {
        await AsyncStorage.setItem('currentUser', JSON.stringify(foundUser));
        setUser(foundUser);
        setUsandoBD(false);
        return true;
      }
      
      return false;
    }
  };

  const logout = async () => {
    console.log('👋 Cerrando sesión');
    await AsyncStorage.removeItem('currentUser');
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    console.log('📝 Actualizando usuario:', updates);
    
    // Si está usando BD, actualizar también en la BD
    if (usandoBD && user.id) {
      try {
        await DatabaseService.actualizarUsuario(user.id, updates);
        console.log('✅ Usuario actualizado en BD');
      } catch (error) {
        console.error('❌ Error al actualizar en BD:', error);
      }
    }
    
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading, usandoBD }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
