import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import UsuariosTab from './UsuariosTab';
import JugadoresTab from './JugadoresTab';
import CategoriasTab from './CategoriasTab';
import ModalExportarAsistencias from './ModalExportarAsistencias';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../config/theme';

interface AdminScreenProps {
  navigation: any;
  route?: any;
}

type TabType = 'usuarios' | 'jugadores' | 'categorias';

const AdminScreen: React.FC<AdminScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const routeInitialTab: TabType | undefined = route?.params?.initialTab;
  const [modalExportarVisible, setModalExportarVisible] = useState(false);

  const allowedTabs = useMemo<TabType[]>(() => {
    if (user?.role === 'admin') return ['usuarios', 'jugadores', 'categorias'];
    if (user?.role === 'entrenador') return ['jugadores'];
    return [];
  }, [user?.role]);

  const resolvedInitialTab = useMemo<TabType>(() => {
    if (user?.role === 'entrenador') return 'jugadores';
    if (user?.role === 'admin') {
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
        {user?.role === 'admin' && (
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => setModalExportarVisible(true)}
          >
            <Text style={styles.exportIcon}>📊</Text>
          </TouchableOpacity>
        )}
        {user?.role !== 'admin' && <View style={{ width: 40 }} />}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
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
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'usuarios' && allowedTabs.includes('usuarios') && <UsuariosTab />}
        {activeTab === 'jugadores' && allowedTabs.includes('jugadores') && <JugadoresTab />}
        {activeTab === 'categorias' && allowedTabs.includes('categorias') && <CategoriasTab />}
      </View>

      {/* Modal de Exportación */}
      <ModalExportarAsistencias
        visible={modalExportarVisible}
        onClose={() => setModalExportarVisible(false)}
      />
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
    backgroundColor: Colors.primary,
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});

export default AdminScreen;
