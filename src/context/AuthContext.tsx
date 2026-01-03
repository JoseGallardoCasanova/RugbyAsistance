import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { USERS } from '../data/mockData';
import SupabaseService from '../services/SupabaseService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isLoading: boolean;
  usandoBD: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usandoBD, setUsandoBD] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      if (userJson) {
        const loadedUser = JSON.parse(userJson);
        console.log('📂 [AUTH] Usuario cargado de AsyncStorage:', loadedUser);
        console.log('📂 [AUTH] role:', loadedUser.role);
        console.log('📂 [AUTH] nombre:', loadedUser.nombre);
        setUser(loadedUser);
      }
      
      setUsandoBD(true);
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('🔐 [AUTH] Intentando login:', { email });
    
    try {
      console.log('📊 [AUTH] Intentando login con Supabase...');
      const usuario = await SupabaseService.verificarCredenciales(email, password);
      
      console.log('🔍 [AUTH] Usuario recibido de Supabase:', JSON.stringify(usuario, null, 2));
      console.log('🔍 [AUTH] usuario.role =', usuario?.role);
      console.log('🔍 [AUTH] usuario.nombre =', usuario?.nombre);
      console.log('🔍 [AUTH] usuario.id =', usuario?.id);
      
      if (usuario) {
        console.log('✅ [AUTH] Usuario encontrado en Supabase:', usuario.nombre);
        console.log('💾 [AUTH] Guardando usuario en AsyncStorage...');
        
        await AsyncStorage.setItem('currentUser', JSON.stringify(usuario));
        
        console.log('✅ [AUTH] Usuario guardado, actualizando estado...');
        setUser(usuario as any);
        setUsandoBD(true);
        
        console.log('✅ [AUTH] Estado actualizado, user.role =', usuario.role);
        return true;
      }
      
      console.log('⚠️ [AUTH] Usuario no encontrado en Supabase, intentando con mock...');
      const foundUser = USERS.find(
        u => u.email === email && u.password === password
      );

      if (foundUser) {
        console.log('✅ [AUTH] Usuario encontrado en mock:', foundUser.nombre);
        await AsyncStorage.setItem('currentUser', JSON.stringify(foundUser));
        setUser(foundUser);
        setUsandoBD(false);
        return true;
      }

      console.log('❌ [AUTH] Credenciales inválidas');
      return false;
      
    } catch (error) {
      console.error('❌ [AUTH] Error al hacer login:', error);
      
      console.log('⚠️ [AUTH] Error en Supabase, intentando con mock...');
      const foundUser = USERS.find(
        u => u.email === email && u.password === password
      );

      if (foundUser) {
        console.log('✅ [AUTH] Usuario encontrado en mock:', foundUser.nombre);
        await AsyncStorage.setItem('currentUser', JSON.stringify(foundUser));
        setUser(foundUser);
        setUsandoBD(false);
        return true;
      }
      
      return false;
    }
  };

  const logout = async () => {
    console.log('👋 [AUTH] Cerrando sesión');
    await AsyncStorage.removeItem('currentUser');
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    console.log('📝 [AUTH] Actualizando usuario:', updates);
    
    if (usandoBD && user.id) {
      try {
        const idNumero = typeof user.id === 'number' ? user.id : Number(user.id);
        if (Number.isFinite(idNumero)) {
          await SupabaseService.actualizarUsuario(idNumero, updates as any);
        } else {
          console.warn('⚠️ [AUTH] ID de usuario inválido; no se actualiza en Supabase');
        }
        console.log('✅ [AUTH] Usuario actualizado en Supabase');
      } catch (error) {
        console.error('❌ [AUTH] Error al actualizar en Supabase:', error);
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
