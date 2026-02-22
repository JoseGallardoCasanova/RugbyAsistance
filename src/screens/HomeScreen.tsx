import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContextV2';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { useClub } from '../context/ClubContext';
import { Categoria } from '../types/v2';
import BotonFlotanteInscripcion from '../components/BotonFlotanteInscripcion';
import FormularioAutoinscripcion from './FormularioAutoinscripcion';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout, reloadUser } = useAuth();
  const { club } = useClub();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState(user?.nombre || '');

  useEffect(() => {
    cargarCategorias();
  }, []);

  // Sincronizar nombre del usuario cuando cambie
  useEffect(() => {
    setUserDisplayName(user?.nombre || '');
  }, [user?.nombre]);

  // ✅ Auto-recargar categorías y usuario al volver a esta pantalla
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 [HOME] Pantalla enfocada, recargando datos...');
      reloadUser(); // Recargar usuario desde Supabase
      cargarCategorias();
    }, [])
  );

  const cargarCategorias = async () => {
    if (!club) {
      console.warn('⚠️ [HOME] No hay club cargado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await SupabaseServiceV2.getCategoriasByClub(club.id);
      
      // Ordenar por número
      const ordenadas = data.sort((a, b) => (a.numero || 0) - (b.numero || 0));
      
      setCategorias(ordenadas);
      console.log(`📥 Categorías cargadas: ${ordenadas.length}`);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoriaPress = (categoria: Categoria) => {
    // TODO V2: Actualizar verificación de permisos para usar UUIDs
    // Por ahora, solo verificar que el usuario tenga acceso (ya se verifica arriba)
    if (!puedeVerCategoria(categoria)) {
      Alert.alert(
        'Sin acceso',
        `No tienes permisos para ver esta categoría`
      );
      return;
    }

    // Navegar a marcar asistencia (pasar todo el objeto)
    navigation.navigate('Asistencia', { 
      categoria: categoria.id,
      categoriaNombre: categoria.nombre 
    });
  };

  const getCategoriaName = (categoriaId?: string) => {
    if (!categoriaId) return 'N/A';
    const cat = categorias.find(c => c.id === categoriaId);
    return cat ? cat.nombre : `Categoría`;
  };

  const handleAdminPress = () => {
    if (user?.role === 'admin' || user?.role === 'admin_club') {
      navigation.navigate('Admin');
      return;
    }

    if (user?.role === 'entrenador') {
      navigation.navigate('Admin', { initialTab: 'jugadores' });
      return;
    }

    Alert.alert('Sin permisos', 'Solo administradores y entrenadores pueden acceder');
  };

  const handlePerfilPress = () => {
    navigation.navigate('Perfil');
  };

  const puedeVerCategoria = (categoria: Categoria): boolean => {
    // TODO V2: Actualizar lógica de permisos para usar categorias_asignadas (UUID[])
    // Por ahora, admin_club y admin tienen acceso total
    if (user?.role === 'admin' || user?.role === 'admin_club') return true;
    
    // Para entrenadores, verificar si tienen la categoría asignada (por UUID)
    if (user?.role === 'entrenador') {
      // categoriasAsignadas es un array de UUIDs en V2
      return user.categoriasAsignadas?.includes(categoria.id) || false;
    }
    
    return false;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          backgroundColor="#1a472a" 
          barStyle="light-content" 
          translucent={false}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor="#1a472a" 
        barStyle="light-content" 
        translucent={false}
      />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo_Old_Green.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Hola, {userDisplayName}</Text>
            <Text style={styles.subtitle}>
              {user?.role === 'admin' && 'Administrador'}
              {user?.role === 'admin_club' && 'Administrador del Club'}
              {user?.role === 'entrenador' && 'Entrenador'}
              {user?.role === 'ayudante' && 'Ayudante'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          {(user?.role === 'admin' || user?.role === 'admin_club' || user?.role === 'entrenador') && (
            <TouchableOpacity onPress={handleAdminPress} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>⚙️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handlePerfilPress} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de categorías */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Selecciona una categoría:</Text>

        {categorias.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin categorías</Text>
            <Text style={styles.emptyText}>
              No hay categorías configuradas. {'\n'}
              Ve al Panel de Admin para crear categorías.
            </Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {categorias.map((categoria) => {
              const tieneAcceso = puedeVerCategoria(categoria);

              return (
                <TouchableOpacity
                  key={`categoria-${categoria.id}`}
                  style={[
                    styles.categoryCard,
                    !tieneAcceso && styles.categoryCardDisabled,
                  ]}
                  onPress={() => handleCategoriaPress(categoria)}
                  disabled={!tieneAcceso}
                >
                  <Text style={styles.categoryName}>{categoria.nombre}</Text>
                  {!tieneAcceso && (
                    <Text style={styles.categoryLocked}>🔒</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Botón flotante - Solo para admin, admin_club y entrenador */}
      {(user?.role === 'admin' || user?.role === 'admin_club' || user?.role === 'entrenador') && (
        <>
          {console.log('✅ [HOME] Mostrando botón flotante para role:', user?.role)}
          <BotonFlotanteInscripcion
            isAdmin={user?.role === 'admin' || user?.role === 'admin_club'}
            onOpenFormulario={() => {
              console.log('📋 [HOME] Callback onOpenFormulario ejecutado');
              setFormularioVisible(true);
            }}
          />
        </>
      )}

      {/* Modal con formulario */}
      <Modal
        visible={formularioVisible}
        animationType="slide"
        onRequestClose={() => setFormularioVisible(false)}
      >
        {console.log('📋 [HOME] Modal formulario visible:', formularioVisible)}
        <FormularioAutoinscripcion
          onSuccess={() => {
            setFormularioVisible(false);
            Alert.alert('✅ Éxito', 'Jugador inscrito correctamente');
          }}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1a472a',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#a8d5a8',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryCardDisabled: {
    opacity: 0.5,
  },
  categoryNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  categoryLocked: {
    fontSize: 16,
    marginTop: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default HomeScreen;
