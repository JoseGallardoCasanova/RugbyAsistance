import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { Club } from '../../types/v2';

interface Props {
  navigation: any;
}

interface ClubCard extends Club {
  stats?: { jugadores: number; usuarios: number; categorias: number };
  statsLoading?: boolean;
}

const SuperAdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { club: clubActivo, loadClub } = useClub();
  const [clubs, setClubs] = useState<ClubCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargarClubes = useCallback(async () => {
    try {
      const todos = await SupabaseServiceV2.getAllClubs();
      const cards: ClubCard[] = todos.map(c => ({ ...c, statsLoading: true }));
      setClubs(cards);

      // Cargar stats de todos en paralelo (batches de 10 para no saturar)
      const batch = 10;
      for (let i = 0; i < cards.length; i += batch) {
        const slice = cards.slice(i, i + batch);
        const results = await Promise.all(
          slice.map(c => SupabaseServiceV2.getClubStats(c.id))
        );
        setClubs(prev => prev.map(card => {
          const idx = slice.findIndex(s => s.id === card.id);
          if (idx === -1) return card;
          return { ...card, stats: results[idx], statsLoading: false };
        }));
      }
    } catch (e) {
      console.error('Error cargando clubes dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarClubes();
  }, [cargarClubes]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarClubes();
  };

  const handleGestionar = async (c: ClubCard) => {
    if (c.id !== clubActivo?.id) {
      await loadClub(c.id);
    }
    navigation.navigate('Home');
  };

  const handleCrearAdmin = (c: ClubCard) => {
    loadClub(c.id).then(() => {
      navigation.navigate('Admin');
    });
  };

  const clubsFiltrados = clubs.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const renderClub = ({ item }: { item: ClubCard }) => {
    const esActivo = item.id === clubActivo?.id;
    return (
      <View style={[styles.card, esActivo && styles.cardActiva]}>
        {/* Cabecera de la card */}
        <View style={styles.cardHeader}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>{item.nombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
              {esActivo && (
                <View style={styles.activoBadge}>
                  <Text style={styles.activoBadgeText}>ACTIVO</Text>
                </View>
              )}
            </View>
            {item.slug && (
              <Text style={styles.cardSlug}>@{item.slug}</Text>
            )}
          </View>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            {item.statsLoading ? (
              <ActivityIndicator size="small" color="#1a472a" />
            ) : (
              <Text style={styles.kpiNum}>{item.stats?.jugadores ?? 0}</Text>
            )}
            <Text style={styles.kpiLabel}>Jugadores</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            {item.statsLoading ? (
              <ActivityIndicator size="small" color="#1a472a" />
            ) : (
              <Text style={styles.kpiNum}>{item.stats?.usuarios ?? 0}</Text>
            )}
            <Text style={styles.kpiLabel}>Usuarios</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            {item.statsLoading ? (
              <ActivityIndicator size="small" color="#1a472a" />
            ) : (
              <Text style={styles.kpiNum}>{item.stats?.categorias ?? 0}</Text>
            )}
            <Text style={styles.kpiLabel}>Categorías</Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.btnGestionar, esActivo && styles.btnGestionarActivo]}
            onPress={() => handleGestionar(item)}
          >
            <Text style={[styles.btnGestionarText, esActivo && styles.btnGestionarTextActivo]}>
              {esActivo ? '✓ Club activo · Ver Home' : '🏠 Ir como este club'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnAdmin}
            onPress={() => handleCrearAdmin(item)}
          >
            <Text style={styles.btnAdminText}>⚙️ Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar club..."
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor="#999"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Text style={{ color: '#999', fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Resumen */}
      <View style={styles.resumen}>
        <Text style={styles.resumenText}>
          {clubsFiltrados.length} {clubsFiltrados.length === 1 ? 'club' : 'clubes'}
          {busqueda ? ' encontrados' : ' registrados'}
        </Text>
        {clubActivo && (
          <Text style={styles.resumenActivo}>Club activo: {clubActivo.nombre}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#1a472a" barStyle="light-content" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Volver</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Gestión de Clubes</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Cargando clubes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a472a" barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Gestión de Clubes</Text>
        <View style={{ width: 70 }} />
      </View>

      <FlatList
        data={clubsFiltrados}
        keyExtractor={item => item.id}
        renderItem={renderClub}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a472a" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏟️</Text>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>No se encontraron clubes con "{busqueda}"</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  topBar: {
    backgroundColor: '#1a472a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  backBtnText: { color: '#a8d5a8', fontSize: 16, fontWeight: '600' },
  topBarTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  centerLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#555', fontSize: 15 },
  list: { padding: 16, gap: 14, paddingBottom: 40 },

  // Buscador
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dde8dd',
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#222', height: 46 },

  // Resumen
  resumen: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 2 },
  resumenText: { fontSize: 13, color: '#666' },
  resumenActivo: { fontSize: 13, color: '#1a472a', fontWeight: '600' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e8ede8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardActiva: {
    borderColor: '#1a472a',
    borderWidth: 2,
    backgroundColor: '#f7fbf7',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  logo: { width: 50, height: 50, borderRadius: 10 },
  logoPlaceholder: {
    width: 50, height: 50, borderRadius: 10,
    backgroundColor: '#1a472a', alignItems: 'center', justifyContent: 'center',
  },
  logoPlaceholderText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  cardNombre: { fontSize: 16, fontWeight: 'bold', color: '#1b2e1b', flex: 1 },
  cardSlug: { fontSize: 12, color: '#888', marginTop: 2 },
  activoBadge: {
    backgroundColor: '#1a472a', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  activoBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f9f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  kpiItem: { flex: 1, alignItems: 'center', gap: 2 },
  kpiNum: { fontSize: 22, fontWeight: 'bold', color: '#1a472a' },
  kpiLabel: { fontSize: 11, color: '#777' },
  kpiDivider: { width: 1, backgroundColor: '#d8e8d8', marginVertical: 4 },

  // Acciones
  cardActions: { flexDirection: 'row', gap: 8 },
  btnGestionar: {
    flex: 1, backgroundColor: '#f0f4f0', borderRadius: 10, paddingVertical: 11,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#c8d8c8',
  },
  btnGestionarActivo: { backgroundColor: '#1a472a', borderColor: '#1a472a' },
  btnGestionarText: { fontSize: 14, fontWeight: '600', color: '#1a472a' },
  btnGestionarTextActivo: { color: '#fff' },
  btnAdmin: {
    backgroundColor: '#e8f0e8', borderRadius: 10, paddingVertical: 11,
    paddingHorizontal: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#c8d8c8',
  },
  btnAdminText: { fontSize: 14, fontWeight: '600', color: '#1a472a' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center' },
});

export default SuperAdminDashboardScreen;
