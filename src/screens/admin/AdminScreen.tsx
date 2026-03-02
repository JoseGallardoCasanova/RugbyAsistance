import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import UsuariosTab from './UsuariosTab';
import JugadoresTab from './JugadoresTab';
import CategoriasTab from './CategoriasTab';
import EstadisticasTab from './EstadisticasTab';
import CalendarioTab from './CalendarioTab';
import FormularioTab from './FormularioTab';
import PagosTab from './PagosTab';
import CodigosTab from './CodigosTab';
import AvisosTab from './AvisosTab';
import EvaluacionesTab from './EvaluacionesTab';
import ClubTab from './ClubTab';
import { useAuth } from '../../context/AuthContextV2';
import { useClub } from '../../context/ClubContext';

interface AdminScreenProps {
  navigation: any;
  route?: any;
}

type TabType = 'usuarios' | 'jugadores' | 'categorias' | 'estadisticas' | 'calendario' | 'formulario' | 'pagos' | 'codigos' | 'avisos' | 'evaluaciones' | 'club';

const AdminScreen: React.FC<AdminScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { club } = useClub();
  const routeInitialTab: TabType | undefined = route?.params?.initialTab;

  const allowedTabs = useMemo<TabType[]>(() => {
    if (user?.role === 'super_admin') return ['usuarios', 'jugadores', 'categorias', 'estadisticas', 'calendario', 'formulario', 'pagos', 'avisos', 'codigos', 'evaluaciones', 'club'];
    if (user?.role === 'admin_club') return ['usuarios', 'jugadores', 'categorias', 'estadisticas', 'calendario', 'formulario', 'pagos', 'avisos', 'evaluaciones', 'club'];
    if (user?.role === 'entrenador') return ['jugadores', 'estadisticas', 'calendario'];
    return [];
  }, [user?.role]);

  const resolvedInitialTab = useMemo<TabType>(() => {
    if (user?.role === 'entrenador') return 'jugadores';
    if (user?.role === 'super_admin' || user?.role === 'admin_club') {
      if (routeInitialTab && allowedTabs.includes(routeInitialTab)) return routeInitialTab;
      return 'usuarios';
    }
    return 'jugadores';
  }, [allowedTabs, routeInitialTab, user?.role]);

  const [activeTab, setActiveTab] = useState<TabType>(resolvedInitialTab);

  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  // Seguridad extra: si alguien navega acá sin rol válido
  if (!user || allowedTabs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Panel de Admin</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 16, color: '#333', fontWeight: 'bold', marginBottom: 8 }}>
              Sin acceso
            </Text>
            <Text style={{ fontSize: 14, color: '#666' }}>
              Tu rol no tiene permisos para ver este panel.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Panel de Admin</Text>
        
        {/* Botón Exportar (solo para admins) */}
        {(user?.role === 'admin_club' || user?.role === 'super_admin') ? (
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => navigation.navigate('ExportarAsistencias')}
          >
            <Text style={styles.exportIcon}>📊</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {allowedTabs.includes('usuarios') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'usuarios' && styles.tabActive]}
            onPress={() => setActiveTab('usuarios')}
          >
            <Text style={[styles.tabText, activeTab === 'usuarios' && styles.tabTextActive]}>
              👥 Usuarios
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('jugadores') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'jugadores' && styles.tabActive]}
            onPress={() => setActiveTab('jugadores')}
          >
            <Text style={[styles.tabText, activeTab === 'jugadores' && styles.tabTextActive]}>
              🏉 Jugadores
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('categorias') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'categorias' && styles.tabActive]}
            onPress={() => setActiveTab('categorias')}
          >
            <Text style={[styles.tabText, activeTab === 'categorias' && styles.tabTextActive]}>
              📋 Categorías
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('estadisticas') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'estadisticas' && styles.tabActive]}
            onPress={() => setActiveTab('estadisticas')}
          >
            <Text style={[styles.tabText, activeTab === 'estadisticas' && styles.tabTextActive]}>
              📊 Estadísticas
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('calendario') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'calendario' && styles.tabActive]}
            onPress={() => setActiveTab('calendario')}
          >
            <Text style={[styles.tabText, activeTab === 'calendario' && styles.tabTextActive]}>
              📅 Calendario
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('formulario') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'formulario' && styles.tabActive]}
            onPress={() => setActiveTab('formulario')}
          >
            <Text style={[styles.tabText, activeTab === 'formulario' && styles.tabTextActive]}>
              📝 Formulario
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('pagos') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pagos' && styles.tabActive]}
            onPress={() => setActiveTab('pagos')}
          >
            <Text style={[styles.tabText, activeTab === 'pagos' && styles.tabTextActive]}>
              💳 Pagos
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('codigos') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'codigos' && styles.tabActive]}
            onPress={() => setActiveTab('codigos')}
          >
            <Text style={[styles.tabText, activeTab === 'codigos' && styles.tabTextActive]}>
              🔑 Códigos
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('avisos') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'avisos' && styles.tabActive]}
            onPress={() => setActiveTab('avisos')}
          >
            <Text style={[styles.tabText, activeTab === 'avisos' && styles.tabTextActive]}>
              📢 Avisos
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('evaluaciones') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'evaluaciones' && styles.tabActive]}
            onPress={() => setActiveTab('evaluaciones')}
          >
            <Text style={[styles.tabText, activeTab === 'evaluaciones' && styles.tabTextActive]}>
              ⭐ Evaluaciones
            </Text>
          </TouchableOpacity>
        )}

        {allowedTabs.includes('club') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'club' && styles.tabActive]}
            onPress={() => setActiveTab('club')}
          >
            <Text style={[styles.tabText, activeTab === 'club' && styles.tabTextActive]}>
              🏟️ Club
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'usuarios' && allowedTabs.includes('usuarios') && <UsuariosTab />}
        {activeTab === 'jugadores' && allowedTabs.includes('jugadores') && <JugadoresTab />}
        {activeTab === 'categorias' && allowedTabs.includes('categorias') && <CategoriasTab />}
        {activeTab === 'estadisticas' && allowedTabs.includes('estadisticas') && <EstadisticasTab />}
        {activeTab === 'calendario' && allowedTabs.includes('calendario') && <CalendarioTab />}
        {activeTab === 'formulario' && allowedTabs.includes('formulario') && <FormularioTab navigation={navigation} />}
        {activeTab === 'pagos' && allowedTabs.includes('pagos') && <PagosTab />}
        {activeTab === 'codigos' && allowedTabs.includes('codigos') && <CodigosTab />}
        {activeTab === 'avisos' && allowedTabs.includes('avisos') && <AvisosTab />}
        {activeTab === 'evaluaciones' && allowedTabs.includes('evaluaciones') && <EvaluacionesTab />}
        {activeTab === 'club' && allowedTabs.includes('club') && <ClubTab />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a472a',
  },
  backButton: {
    width: 40,
  },
  backIcon: {
    fontSize: 30,
    color: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  exportButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  exportIcon: {
    fontSize: 24,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 55,
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tab: {
    paddingVertical: 15,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1a472a',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1a472a',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});

export default AdminScreen;
