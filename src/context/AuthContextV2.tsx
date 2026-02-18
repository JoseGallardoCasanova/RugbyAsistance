// ============================================
// AUTH CONTEXT V2
// ============================================
// Context actualizado para Squad Pro Multi-Tenant
// - Integra ClubContext para cargar club del usuario
// - Usa SupabaseServiceV2 (UUID, bcrypt)
// - Mantiene fallback a mock data
// ============================================

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/v2';
import { USERS } from '../data/mockData';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { useClub } from './ClubContext';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  reloadUser: () => Promise<void>;
  isLoading: boolean;
  usandoBD: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usandoBD, setUsandoBD] = useState(true);
  
  // Acceder al ClubContext para cargar el club
  const { loadClub, clearClub } = useClub();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('currentUser');
      if (userJson) {
        const loadedUser = JSON.parse(userJson);
        console.log('📂 [AUTH V2] Usuario cargado de AsyncStorage:', loadedUser.nombre);
        setUser(loadedUser);
        
        // Cargar el club del usuario
        if (loadedUser.clubId) {
          console.log('🏆 [AUTH V2] Cargando club:', loadedUser.clubId);
          await loadClub(loadedUser.clubId);
        }
      }
      
      setUsandoBD(true);
    } catch (error) {
      console.error('❌ [AUTH V2] Error al cargar usuario:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('🔐 [AUTH V2] Intentando login:', username);
    
    try {
      // Intentar login con Supabase V2 (por username)
      console.log('📊 [AUTH V2] Intentando login con Supabase V2...');
      const usuario = await SupabaseServiceV2.verificarCredenciales(username, password);
      
      if (usuario) {
        console.log('✅ [AUTH V2] Login exitoso:', usuario.nombre);
        console.log('🏆 [AUTH V2] Club ID:', usuario.clubId);
        console.log('👤 [AUTH V2] Role:', usuario.role);
        
        // Guardar usuario en AsyncStorage
        await AsyncStorage.setItem('currentUser', JSON.stringify(usuario));
        setUser(usuario);
        setUsandoBD(true);
        
        // Cargar el club del usuario
        if (usuario.clubId) {
          console.log('🏆 [AUTH V2] Cargando club del usuario...');
          await loadClub(usuario.clubId);
        }
        
        return true;
      }
      
      // Si falla Supabase, intentar con mock data (fallback por email)
      console.log('⚠️ [AUTH V2] Usuario no encontrado en Supabase, intentando con mock...');
      const foundUser = USERS.find(
        u => u.email === username && u.password === password
      );

      if (foundUser) {
        console.log('✅ [AUTH V2] Usuario encontrado en mock:', foundUser.nombre);
        await AsyncStorage.setItem('currentUser', JSON.stringify(foundUser));
        setUser(foundUser as any);
        setUsandoBD(false);
        
        // Mock no tiene club, pero igual funciona
        return true;
      }

      console.log('❌ [AUTH V2] Credenciales inválidas');
      return false;
      
    } catch (error) {
      console.error('❌ [AUTH V2] Error al hacer login:', error);
      
      // Fallback a mock en caso de error
      console.log('⚠️ [AUTH V2] Error en Supabase, intentando con mock...');
      const foundUser = USERS.find(
        u => u.email === username && u.password === password
      );

      if (foundUser) {
        console.log('✅ [AUTH V2] Usuario encontrado en mock:', foundUser.nombre);
        await AsyncStorage.setItem('currentUser', JSON.stringify(foundUser));
        setUser(foundUser as any);
        setUsandoBD(false);
        return true;
      }
      
      return false;
    }
  };

  const logout = async () => {
    console.log('👋 [AUTH V2] Cerrando sesión');
    await AsyncStorage.removeItem('currentUser');
    setUser(null);
    
    // Limpiar club del context
    console.log('🏆 [AUTH V2] Limpiando club...');
    await clearClub();
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    console.log('📝 [AUTH V2] Actualizando usuario:', updates);
    
    if (usandoBD && user.id) {
      try {
        // Actualizar en Supabase V2
        const result = await SupabaseServiceV2.actualizarUsuario(user.id, updates);
        
        if (result) {
          console.log('✅ [AUTH V2] Usuario actualizado en Supabase:', result.nombre);
          
          // Usar datos actualizados de Supabase
          await AsyncStorage.setItem('currentUser', JSON.stringify(result));
          setUser(result);
          return;
        } else {
          console.warn('⚠️ [AUTH V2] No se pudo actualizar en Supabase, actualizando localmente');
        }
      } catch (error) {
        console.error('❌ [AUTH V2] Error al actualizar en Supabase:', error);
      }
    }
    
    // Fallback: actualizar solo localmente
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const reloadUser = async () => {
    if (!user?.id || !user?.clubId || !usandoBD) return;
    
    try {
      console.log('🔄 [AUTH V2] Recargando usuario desde Supabase...');
      const usuarios = await SupabaseServiceV2.getUsuariosByClub(user.clubId);
      const usuarioActualizado = usuarios.find(u => u.id === user.id);
      
      if (usuarioActualizado) {
        console.log('✅ [AUTH V2] Usuario recargado:', usuarioActualizado.nombre);
        await AsyncStorage.setItem('currentUser', JSON.stringify(usuarioActualizado));
        setUser(usuarioActualizado);
      }
    } catch (error) {
      console.error('❌ [AUTH V2] Error al recargar usuario:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, reloadUser, isLoading, usandoBD }}>
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
