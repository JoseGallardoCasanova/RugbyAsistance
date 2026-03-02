import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContextV2';
import SupabaseServiceV2 from '../../services/SupabaseServiceV2';
import { CodigoInvitacion } from '../../types/v2';

const CodigosTab: React.FC = () => {
  const { user } = useAuth();
  const [codigos, setCodigos] = useState<CodigoInvitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);

  const cargarCodigos = async () => {
    setLoading(true);
    try {
      const data = await SupabaseServiceV2.getCodigosInvitacion();
      setCodigos(data);
    } catch (e) {
      console.error('Error al cargar códigos:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarCodigos();
    }, [])
  );

  const handleGenerar = async () => {
    if (!user?.id) return;
    setGenerando(true);
    try {
      const codigo = await SupabaseServiceV2.generarCodigoInvitacion(user.id);
      if (codigo) {
        Alert.alert(
          '✅ Código generado',
          `Nuevo código de invitación:\n\n${codigo.codigo}\n\nCompártelo con el administrador del nuevo club.`,
          [
            {
              text: 'Copiar',
              onPress: () => {
                Clipboard.setString(codigo.codigo);
                Alert.alert('✓', 'Código copiado al portapapeles');
              },
            },
            { text: 'OK' },
          ]
        );
        cargarCodigos();
      } else {
        Alert.alert('Error', 'No se pudo generar el código');
      }
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al generar el código');
    } finally {
      setGenerando(false);
    }
  };

  const handleCopiar = (codigo: string) => {
    Clipboard.setString(codigo);
    Alert.alert('✓', 'Código copiado al portapapeles');
  };

  const renderItem = ({ item }: { item: CodigoInvitacion }) => {
    const fecha = new Date(item.createdAt).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return (
      <View style={[styles.codigoCard, item.usado && styles.codigoCardUsado]}>
        <View style={styles.codigoHeader}>
          <Text style={[styles.codigoText, item.usado && styles.codigoTextUsado]}>
            {item.codigo}
          </Text>
          <View style={[styles.badge, item.usado ? styles.badgeUsado : styles.badgeDisponible]}>
            <Text style={styles.badgeText}>{item.usado ? 'Usado' : 'Disponible'}</Text>
          </View>
        </View>
        <View style={styles.codigoFooter}>
          <Text style={styles.fechaText}>📅 {fecha}</Text>
          {!item.usado && (
            <TouchableOpacity
              style={styles.copiarButton}
              onPress={() => handleCopiar(item.codigo)}
            >
              <Text style={styles.copiarButtonText}>📋 Copiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const disponibles = codigos.filter(c => !c.usado).length;
  const usados = codigos.filter(c => c.usado).length;

  return (
    <View style={styles.container}>
      {/* Resumen */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
          <Text style={styles.summaryNumber}>{disponibles}</Text>
          <Text style={styles.summaryLabel}>Disponibles</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#f5f5f5' }]}>
          <Text style={styles.summaryNumber}>{usados}</Text>
          <Text style={styles.summaryLabel}>Usados</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
          <Text style={styles.summaryNumber}>{codigos.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Botón generar */}
      <TouchableOpacity
        style={[styles.generarButton, generando && styles.generarButtonDisabled]}
        onPress={handleGenerar}
        disabled={generando}
      >
        {generando ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.generarButtonText}>➕ Generar nuevo código</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        💡 Cada código puede ser utilizado por un solo club para registrarse en la plataforma.
      </Text>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#1a472a" size="large" />
      ) : (
        <FlatList
          data={codigos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔑</Text>
              <Text style={styles.emptyText}>No hay códigos generados aún.</Text>
              <Text style={styles.emptySubText}>Genera un código para invitar a un nuevo club.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a472a',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  generarButton: {
    backgroundColor: '#1a472a',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  generarButtonDisabled: {
    opacity: 0.6,
  },
  generarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 20,
    gap: 10,
  },
  codigoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1a472a',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  codigoCardUsado: {
    borderLeftColor: '#bdbdbd',
    opacity: 0.7,
  },
  codigoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codigoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a472a',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  codigoTextUsado: {
    color: '#999',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeDisponible: {
    backgroundColor: '#e8f5e9',
  },
  badgeUsado: {
    backgroundColor: '#eeeeee',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  codigoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fechaText: {
    fontSize: 13,
    color: '#888',
  },
  copiarButton: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copiarButtonText: {
    fontSize: 13,
    color: '#1a472a',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default CodigosTab;
