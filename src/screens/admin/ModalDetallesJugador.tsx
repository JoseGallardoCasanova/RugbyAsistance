import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Jugador } from '../../types/v2';

interface Props {
  visible: boolean;
  jugador: Jugador | null;
  onClose: () => void;
}

export default function ModalDetallesJugador({ visible, jugador, onClose }: Props) {
  if (!jugador) return null;

  // Verificar si hay detalles adicionales
  const tieneDetallesAdicionales = 
    jugador.fechaNacimiento ||
    jugador.email ||
    jugador.contactoEmergencia ||
    jugador.telEmergencia ||
    jugador.sistemaSalud ||
    jugador.seguroComplementario ||
    jugador.nombreTutor ||
    jugador.rutTutor ||
    jugador.telTutor ||
    jugador.fumaFrecuencia ||
    jugador.enfermedades ||
    jugador.alergias ||
    jugador.medicamentos ||
    jugador.lesiones ||
    jugador.actividad;

  const renderField = (label: string, value: string | undefined | null) => {
    if (!value) return null;
    
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.backButton}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>👤 Detalles del Jugador</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Datos básicos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Datos Básicos</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={styles.fieldValue}>{jugador.nombre}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>RUT</Text>
              <Text style={styles.fieldValue}>{jugador.rut}</Text>
            </View>
            {renderField('Número', jugador.numero?.toString())}
            {renderField('Fecha de Nacimiento', jugador.fechaNacimiento)}
            {renderField('Email', jugador.email)}
          </View>

          {/* Contacto de emergencia */}
          {(jugador.contactoEmergencia || jugador.telEmergencia) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚨 Contacto de Emergencia</Text>
              {renderField('Nombre', jugador.contactoEmergencia)}
              {renderField('Teléfono', jugador.telEmergencia)}
            </View>
          )}

          {/* Sistema de salud */}
          {(jugador.sistemaSalud || jugador.seguroComplementario) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏥 Sistema de Salud</Text>
              {renderField('Sistema de Salud', jugador.sistemaSalud)}
              {renderField('Seguro Complementario', jugador.seguroComplementario)}
            </View>
          )}

          {/* Tutor */}
          {(jugador.nombreTutor || jugador.rutTutor || jugador.telTutor) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Datos del Tutor</Text>
              {renderField('Nombre', jugador.nombreTutor)}
              {renderField('RUT', jugador.rutTutor)}
              {renderField('Teléfono', jugador.telTutor)}
            </View>
          )}

          {/* Información médica */}
          {(jugador.fumaFrecuencia || jugador.enfermedades || jugador.alergias || 
            jugador.medicamentos || jugador.lesiones) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚕️ Información Médica</Text>
              
              {jugador.fumaFrecuencia && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Fuma</Text>
                  <Text style={styles.fieldValue}>Sí - {jugador.fumaFrecuencia}</Text>
                </View>
              )}
              
              {jugador.enfermedades && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Enfermedades</Text>
                  <Text style={[styles.fieldValue, styles.textMultiline]}>
                    {jugador.enfermedades}
                  </Text>
                </View>
              )}
              
              {jugador.alergias && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Alergias</Text>
                  <Text style={[styles.fieldValue, styles.textMultiline]}>
                    {jugador.alergias}
                  </Text>
                </View>
              )}
              
              {jugador.medicamentos && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Medicamentos</Text>
                  <Text style={[styles.fieldValue, styles.textMultiline]}>
                    {jugador.medicamentos}
                  </Text>
                </View>
              )}
              
              {jugador.lesiones && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Lesiones</Text>
                  <Text style={[styles.fieldValue, styles.textMultiline]}>
                    {jugador.lesiones}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Actividad */}
          {jugador.actividad && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📚 Actividad</Text>
              {renderField('¿Estudia o trabaja?', jugador.actividad)}
            </View>
          )}

          {/* Mensaje si no hay datos adicionales */}
          {!jugador.fechaNacimiento && !jugador.email && !jugador.contactoEmergencia && 
           !jugador.sistemaSalud && !jugador.nombreTutor && !jugador.fumaFrecuencia &&
           !jugador.enfermedades && !jugador.alergias && !jugador.medicamentos && 
           !jugador.lesiones && !jugador.actividad && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>ℹ️</Text>
              <Text style={styles.emptyText}>
                Este jugador no tiene información adicional registrada.
              </Text>
            </View>
          )}

          {/* Mensaje si no hay detalles adicionales */}
          {!tieneDetallesAdicionales && (
            <View style={styles.section}>
              <View style={styles.noDetailsContainer}>
                <Text style={styles.noDetailsIcon}>📝</Text>
                <Text style={styles.noDetailsTitle}>Sin detalles adicionales</Text>
                <Text style={styles.noDetailsText}>
                  Este jugador solo tiene los datos básicos registrados.{'\n'}
                  Puede editarlo para agregar más información.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a472a',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 15,
  },
  field: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
  },
  textMultiline: {
    lineHeight: 22,
  },
  noDetailsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  noDetailsIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  noDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noDetailsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
