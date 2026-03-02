import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useClub } from '../../context/ClubContext';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';

const ClubTab: React.FC = () => {
  const { club, updateClub } = useClub();
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const handleCambiarLogo = async () => {
    if (!club) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita acceso a la galería para cambiar el logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;

    setSubiendoLogo(true);
    try {
      const logoUrl = await SupabaseServiceV2.subirLogoClub(club.id, uri);
      if (logoUrl) {
        await updateClub({ logoUrl });
        Alert.alert('✅ Logo actualizado', 'El logo del club se ha cambiado correctamente.');
      } else {
        Alert.alert('Error', 'No se pudo subir la imagen. Inténtalo de nuevo.');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error al subir el logo.');
    } finally {
      setSubiendoLogo(false);
    }
  };

  if (!club) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Cargando información del club...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logo actual */}
      <View style={styles.logoSection}>
        <View style={styles.logoWrap}>
          {club.logoUrl ? (
            <Image source={{ uri: club.logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>🏉</Text>
            </View>
          )}
        </View>
        <Text style={styles.clubName}>{club.nombre}</Text>
      </View>

      {/* Botón cambiar logo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Logo del club</Text>
        <Text style={styles.cardDesc}>
          El logo aparece en la pantalla de inicio y en el perfil del club.
          Se recomienda una imagen cuadrada (1:1).
        </Text>
        <TouchableOpacity
          style={[styles.btn, subiendoLogo && styles.btnDisabled]}
          onPress={handleCambiarLogo}
          disabled={subiendoLogo}
          activeOpacity={0.8}
        >
          {subiendoLogo ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.btnText}>  Subiendo...</Text>
            </>
          ) : (
            <Text style={styles.btnText}>🖼️  Cambiar logo</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    width: 100,
    height: 100,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e9',
  },
  logoPlaceholderText: {
    fontSize: 48,
  },
  clubName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a472a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#1a472a',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#888',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ClubTab;
