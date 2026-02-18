// ============================================
// CLUB CONTEXT
// ============================================
// Maneja el estado del club actual en Squad Pro
// En V2, cada usuario pertenece a un club
// Este context almacena la info del club activo
// ============================================

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Club } from '../types/v2';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';

// ============================================
// TIPO DEL CONTEXT
// ============================================
interface ClubContextType {
  club: Club | null;
  isLoading: boolean;
  loadClub: (clubId: string) => Promise<void>;
  updateClub: (updates: Partial<Club>) => Promise<void>;
  clearClub: () => Promise<void>;
}

// ============================================
// CREAR CONTEXT
// ============================================
const ClubContext = createContext<ClubContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================
export const ClubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ============================================
  // CARGAR CLUB DESDE ASYNCSTORAGE AL INICIAR
  // ============================================
  useEffect(() => {
    loadClubFromStorage();
  }, []);

  const loadClubFromStorage = async () => {
    try {
      const clubJson = await AsyncStorage.getItem('currentClub');
      if (clubJson) {
        const loadedClub = JSON.parse(clubJson);
        console.log('🏆 [CLUB] Club cargado de AsyncStorage:', loadedClub.nombre);
        setClub(loadedClub);
      }
    } catch (error) {
      console.error('❌ [CLUB] Error al cargar club desde storage:', error);
    }
  };

  // ============================================
  // CARGAR CLUB DESDE LA BD
  // ============================================
  const loadClub = async (clubId: string): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('🏆 [CLUB] Cargando club:', clubId);
      
      // Llamar al servicio para obtener el club
      const clubData = await SupabaseServiceV2.getClubById(clubId);
      
      if (clubData) {
        console.log('✅ [CLUB] Club cargado:', clubData.nombre);
        setClub(clubData);
        
        // Guardar en AsyncStorage para persistencia
        await AsyncStorage.setItem('currentClub', JSON.stringify(clubData));
      } else {
        console.warn('⚠️ [CLUB] Club no encontrado');
        setClub(null);
      }
    } catch (error) {
      console.error('❌ [CLUB] Error al cargar club:', error);
      setClub(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // ACTUALIZAR CLUB
  // ============================================
  const updateClub = async (updates: Partial<Club>): Promise<void> => {
    if (!club) {
      console.warn('⚠️ [CLUB] No hay club cargado para actualizar');
      return;
    }

    try {
      console.log('🔄 [CLUB] Actualizando club:', updates);
      
      // Actualizar en la BD
      const updatedClub = await SupabaseServiceV2.updateClub(club.id, updates);
      
      if (updatedClub) {
        console.log('✅ [CLUB] Club actualizado:', updatedClub.nombre);
        setClub(updatedClub);
        
        // Actualizar en AsyncStorage
        await AsyncStorage.setItem('currentClub', JSON.stringify(updatedClub));
      }
    } catch (error) {
      console.error('❌ [CLUB] Error al actualizar club:', error);
    }
  };

  // ============================================
  // LIMPIAR CLUB (en logout)
  // ============================================
  const clearClub = async (): Promise<void> => {
    try {
      console.log('🗑️ [CLUB] Limpiando club del context');
      setClub(null);
      await AsyncStorage.removeItem('currentClub');
    } catch (error) {
      console.error('❌ [CLUB] Error al limpiar club:', error);
    }
  };

  // ============================================
  // VALUE DEL CONTEXT
  // ============================================
  const value: ClubContextType = {
    club,
    isLoading,
    loadClub,
    updateClub,
    clearClub,
  };

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
};

// ============================================
// HOOK PARA USAR EL CONTEXT
// ============================================
export const useClub = (): ClubContextType => {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub debe usarse dentro de un ClubProvider');
  }
  return context;
};

// ============================================
// EXPORT DEFAULT
// ============================================
export default ClubContext;
