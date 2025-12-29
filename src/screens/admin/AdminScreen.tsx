import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import UsuariosTab from './UsuariosTab'; // ✅ Mismo directorio
import JugadoresTab from './JugadoresTab'; // ✅ Mismo directorio
import CategoriasTab from './CategoriasTab'; // ✅ Mismo directorio

interface AdminScreenProps {
  navigation: any;
}

type TabType = 'usuarios' | 'jugadores' | 'categorias';

const AdminScreen: React.FC<AdminScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('usuarios');

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
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'usuarios' && styles.tabActive]}
          onPress={() => setActiveTab('usuarios')}
        >
          <Text style={[styles.tabText, activeTab === 'usuarios' && styles.tabTextActive]}>
            👥 Usuarios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'jugadores' && styles.tabActive]}
          onPress={() => setActiveTab('jugadores')}
        >
          <Text style={[styles.tabText, activeTab === 'jugadores' && styles.tabTextActive]}>
            🏉 Jugadores
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'categorias' && styles.tabActive]}
          onPress={() => setActiveTab('categorias')}
        >
          <Text style={[styles.tabText, activeTab === 'categorias' && styles.tabTextActive]}>
            📋 Categorías
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'usuarios' && <UsuariosTab />}
        {activeTab === 'jugadores' && <JugadoresTab />}
        {activeTab === 'categorias' && <CategoriasTab />}
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
