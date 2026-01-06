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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import SupabaseService from '../services/SupabaseService';
import { Categoria } from '../types';
import BotonFlotanteInscripcion from '../components/BotonFlotanteInscripcion';
import FormularioAutoinscripcion from './FormularioAutoinscripcion';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [formularioVisible, setFormularioVisible] = useState(false);

  useEffect(() => {
    cargarCategorias();
  }, []);

  // ✅ Auto-recargar categorías al volver a esta pantalla
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 [HOME] Pantalla enfocada, recargando categorías...');
      cargarCategorias();
    }, [])
  );

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.obtenerCategorias();
      
      // Filtrar activas y ordenar por número
      const activas = data
        .filter(c => c.activo !== false)
        .sort((a, b) => a.numero - b.numero);
      
      setCategorias(activas);
      console.log(`📥 Categorías cargadas: ${activas.length}`);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoriaPress = (categoria: Categoria) => {
    // Verificar permisos
    if (user?.role === 'ayudante') {
      // Ayudante solo puede ver SU categoría
      if (user.categoriaAsignada !== categoria.numero) {
        Alert.alert(
          'Sin acceso',
          `Solo puedes marcar asistencia de tu categoría asignada (${getCategoriaName(user.categoriaAsignada)})`
        );
        return;
      }
    } else if (user?.role === 'entrenador') {
      // Entrenador solo puede ver SUS categorías
      if (!user.categoriasAsignadas?.includes(categoria.numero)) {
        Alert.alert(
          'Sin acceso',
          `Solo puedes marcar asistencia de tus categorías asignadas`
        );
        return;
      }
    }

    // Navegar a marcar asistencia
    navigation.navigate('Asistencia', { categoria: categoria.numero });
  };

  const getCategoriaName = (numero?: number) => {
    if (!numero) return 'N/A';
    const cat = categorias.find(c => c.numero === numero);
    return cat ? cat.nombre : `Categoría ${numero}`;
  };

  const handleAdminPress = () => {
    if (user?.role === 'admin') {
      navigation.navigate('Admin');
      return;
    }

    if (user?.role === 'entrenador') {
      navigation.navigate('Admin', { initialTab: 'jugadores' });
      return;
    }

    Alert.alert('Sin permisos', 'Solo administradores y entrenadores pueden acceder');
  };

  const handleConfigPress = () => {
    if (user?.role === 'admin') {
      navigation.navigate('Configuracion');
    } else {
      Alert.alert('Sin permisos', 'Solo los administradores pueden configurar');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const puedeVerCategoria = (categoria: Categoria): boolean => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'ayudante') return user.categoriaAsignada === categoria.numero;
    if (user?.role === 'entrenador') {
      return user.categoriasAsignadas?.includes(categoria.numero) || false;
    }
    return false;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a472a" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo_Old_Green.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hola, {user?.nombre}</Text>
            <Text style={styles.subtitle}>
              {user?.role === 'admin' && 'Administrador'}
              {user?.role === 'entrenador' && 'Entrenador'}
              {user?.role === 'ayudante' && 'Ayudante'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          {(user?.role === 'admin' || user?.role === 'entrenador') && (
            <>
              <TouchableOpacity onPress={handleAdminPress} style={styles.iconButton}>
                <Text style={styles.iconButtonText}>⚙️</Text>
              </TouchableOpacity>
              {user?.role === 'admin' && (
                <TouchableOpacity onPress={handleConfigPress} style={styles.iconButton}>
                  <Text style={styles.iconButtonText}>🔧</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>🚪</Text>
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
                  key={`categoria-${categoria.numero}`}
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

      {/* Botón flotante - Solo para admin y entrenador */}
      {(user?.role === 'admin' || user?.role === 'entrenador') && (
        <>
          {console.log('✅ [HOME] Mostrando botón flotante para role:', user?.role)}
          <BotonFlotanteInscripcion
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
    </SafeAreaView>
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
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
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
