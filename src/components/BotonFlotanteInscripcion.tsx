import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface Props {
  onOpenFormulario: () => void;
}

type ModalView = 'none' | 'menu' | 'qr';

export default function BotonFlotanteInscripcion({ onOpenFormulario }: Props) {
  const [currentView, setCurrentView] = useState<ModalView>('none');

  // URL del formulario web desplegado en Vercel
  const FORMULARIO_URL = 'https://formulariorugby.vercel.app';

  const handleOpenMenu = () => {
    console.log('🔵 [BOTÓN QR] Abriendo menú...');
    setCurrentView('menu');
  };

  const handleClose = () => {
    console.log('❌ [BOTÓN QR] Cerrando modal...');
    setCurrentView('none');
  };

  const handleOpenFormulario = () => {
    console.log('📋 [BOTÓN QR] Abriendo formulario...');
    setCurrentView('none');
    // Pequeño delay para iOS
    setTimeout(() => {
      onOpenFormulario();
    }, 100);
  };

  const handleShowQR = () => {
    console.log('📱 [BOTÓN QR] Mostrando código QR...');
    setCurrentView('qr');
  };

  return (
    <>
      {/* Botón flotante */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenMenu}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>📝</Text>
      </TouchableOpacity>

      {/* Modal único con diferentes vistas */}
      <Modal
        visible={currentView !== 'none'}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          {/* Vista del Menú */}
          {currentView === 'menu' && (
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Inscripción de Jugadores</Text>
              
              <TouchableOpacity
                style={styles.menuOption}
                onPress={handleOpenFormulario}
              >
                <Text style={styles.menuOptionIcon}>📋</Text>
                <View style={styles.menuOptionText}>
                  <Text style={styles.menuOptionTitle}>Abrir Formulario</Text>
                  <Text style={styles.menuOptionSubtitle}>
                    Completa el formulario en la app
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={handleShowQR}
              >
                <Text style={styles.menuOptionIcon}>📱</Text>
                <View style={styles.menuOptionText}>
                  <Text style={styles.menuOptionTitle}>Mostrar Código QR</Text>
                  <Text style={styles.menuOptionSubtitle}>
                    Escanea para inscribirte desde tu móvil
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Vista del QR */}
          {currentView === 'qr' && (
            <View style={styles.qrContainer}>
              <Text style={styles.qrTitle}>📱 Escanea el código QR</Text>
              <Text style={styles.qrSubtitle}>
                Apunta tu cámara al código para acceder al formulario de inscripción
              </Text>

              <View style={styles.qrBox}>
                <QRCode
                  value={FORMULARIO_URL}
                  size={250}
                  backgroundColor="#fff"
                />
              </View>

              <Text style={styles.qrUrl}>{FORMULARIO_URL}</Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a472a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 20,
    textAlign: 'center',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuOptionIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  menuOptionText: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuOptionSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  qrContainer: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 10,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  qrUrl: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#1a472a',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
