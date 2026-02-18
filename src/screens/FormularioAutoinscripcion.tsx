import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import SupabaseServiceV2 from '../services/SupabaseServiceV2';
import { Categoria } from '../types/v2';
import { validarRUT, formatearRUT } from '../utils/rutUtils';
import { useClub } from '../context/ClubContext';

interface Props {
  navigation?: any;
  onSuccess?: () => void;
}

export default function FormularioAutoinscripcion({ navigation, onSuccess }: Props) {
  const { club } = useClub();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  // Datos personales
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rut, setRut] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [email, setEmail] = useState('');
  
  // Contacto de emergencia
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [telEmergencia, setTelEmergencia] = useState('');
  
  // Categoría (UUID en V2)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  
  // Salud
  const [sistemaSalud, setSistemaSalud] = useState('');
  const [seguroComplementario, setSeguroComplementario] = useState('');
  
  // Tutor (para menores)
  const [nombreTutor, setNombreTutor] = useState('');
  const [rutTutor, setRutTutor] = useState('');
  const [telTutor, setTelTutor] = useState('');
  
  // Información médica
  const [fuma, setFuma] = useState(false);
  const [fumaFrecuencia, setFumaFrecuencia] = useState('');
  const [enfermedades, setEnfermedades] = useState('');
  const [alergias, setAlergias] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [lesiones, setLesiones] = useState('');
  
  // Actividad
  const [actividad, setActividad] = useState<'Estudio' | 'Trabajo' | 'Ambos' | ''>('');
  
  // Autorización de uso de imagen
  const [autorizoUsoImagen, setAutorizoUsoImagen] = useState<boolean | null>(null);

  // Estados para errores de validación de RUT
  const [rutError, setRutError] = useState('');
  const [rutTutorError, setRutTutorError] = useState('');

  useEffect(() => {
    cargarCategorias();
  }, []);

  // Validar RUT en tiempo real
  const validarRUTEnTiempoReal = (rutValue: string) => {
    console.log('📝 [FORMULARIO] validarRUTEnTiempoReal - RUT:', rutValue);
    if (rutValue.trim() && !validarRUT(rutValue)) {
      console.log('📝 [FORMULARIO] RUT inválido');
      setRutError('❌ RUT inválido. Verifica el dígito verificador.');
    } else {
      console.log('📝 [FORMULARIO] RUT válido o vacío');
      setRutError('');
    }
  };

  // Validar RUT tutor en tiempo real
  const validarRUTTutorEnTiempoReal = (rutValue: string) => {
    if (rutValue.trim() && !validarRUT(rutValue)) {
      setRutTutorError('❌ RUT inválido. Verifica el dígito verificador.');
    } else {
      setRutTutorError('');
    }
  };

  const cargarCategorias = async () => {
    if (!club) {
      console.warn('⚠️ [FORMULARIO] No hay club cargado');
      return;
    }

    try {
      const cats = await SupabaseServiceV2.getCategoriasByClub(club.id);
      setCategorias(cats);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const validarFormulario = (): boolean => {
    if (!nombreCompleto.trim()) {
      Alert.alert('Error', 'El nombre completo es obligatorio');
      return false;
    }
    
    if (!rut.trim()) {
      Alert.alert('Error', 'El RUT es obligatorio');
      return false;
    }
    
    if (!validarRUT(rut)) {
      Alert.alert('Error', 'El RUT ingresado no es válido. Por favor verifica el dígito verificador.');
      return false;
    }
    
    if (!fechaNacimiento.trim()) {
      Alert.alert('Error', 'La fecha de nacimiento es obligatoria');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'El correo electrónico es obligatorio');
      return false;
    }
    
    if (!contactoEmergencia.trim()) {
      Alert.alert('Error', 'El contacto de emergencia es obligatorio');
      return false;
    }
    
    if (!telEmergencia.trim()) {
      Alert.alert('Error', 'El teléfono de emergencia es obligatorio');
      return false;
    }
    
    if (!categoriaSeleccionada) {
      Alert.alert('Error', 'Debes seleccionar una categoría');
      return false;
    }
    
    if (!sistemaSalud.trim()) {
      Alert.alert('Error', 'El sistema de salud es obligatorio');
      return false;
    }
    
    if (!actividad) {
      Alert.alert('Error', 'Debes indicar si estudias, trabajas o ambos');
      return false;
    }
    
    return true;
  };

  const handleEnviar = async () => {
    if (!validarFormulario()) return;

    if (!club) {
      Alert.alert('Error', 'No se pudo obtener el club');
      return;
    }

    setLoading(true);

    try {
      const nuevoJugador = {
        clubId: club.id,
        rut: rut.trim(),
        nombre: nombreCompleto.trim(),
        categoriaId: categoriaSeleccionada!,
        
        // Datos adicionales (camelCase para V2)
        fechaNacimiento: fechaNacimiento,
        email: email.trim(),
        contactoEmergencia: contactoEmergencia.trim(),
        telEmergencia: telEmergencia.trim(),
        sistemaSalud: sistemaSalud.trim(),
        seguroComplementario: seguroComplementario.trim() || undefined,
        nombreTutor: nombreTutor.trim() || undefined,
        rutTutor: rutTutor.trim() || undefined,
        telTutor: telTutor.trim() || undefined,
        fuma: fuma,
        fumaFrecuencia: fuma ? fumaFrecuencia.trim() : undefined,
        enfermedades: enfermedades.trim() || undefined,
        alergias: alergias.trim() || undefined,
        medicamentos: medicamentos.trim() || undefined,
        lesiones: lesiones.trim() || undefined,
        actividad,
        autorizoUsoImagen: autorizoUsoImagen ?? false,
      };

      const success = await SupabaseServiceV2.crearJugador(nuevoJugador);

      if (success) {
        Alert.alert(
          '✅ Inscripción Exitosa',
          'Te has registrado correctamente. ¡Bienvenido al club!',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSuccess) {
                  onSuccess();
                } else if (navigation) {
                  navigation.goBack();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo completar la inscripción. Intenta nuevamente.');
      }
    } catch (error: any) {
      console.error('Error al enviar formulario:', error);
      Alert.alert('Error', error.message || 'Ocurrió un error al enviar el formulario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Volver</Text>
          </TouchableOpacity>
        )}
        {onSuccess && (
          <TouchableOpacity onPress={onSuccess}>
            <Text style={styles.backButton}>✕ Cerrar</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>📝 Formulario de Inscripción</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>
          Completa todos los campos para registrarte en el club
        </Text>

        {/* DATOS PERSONALES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Datos Personales</Text>
          
          <Text style={styles.label}>Nombre completo *</Text>
          <TextInput
            style={styles.input}
            value={nombreCompleto}
            onChangeText={setNombreCompleto}
            placeholder="Ej: Juan Pérez González"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>RUT *</Text>
          <TextInput
            style={[styles.input, rutError && styles.inputError]}
            value={rut}
            onChangeText={(text) => {
              console.log('📝 [FORMULARIO] RUT texto ingresado:', text);
              const formatted = formatearRUT(text);
              console.log('📝 [FORMULARIO] RUT formateado:', formatted);
              setRut(formatted);
              setRutError(''); // Limpiar error mientras escribe
            }}
            onBlur={() => {
              console.log('📝 [FORMULARIO] onBlur - validando RUT');
              validarRUTEnTiempoReal(rut);
            }}
            placeholder="Ej: 12345678-9"
            placeholderTextColor="#999"
            maxLength={10}
            keyboardType="default"
            autoCapitalize="characters"
          />
          {rutError ? <Text style={styles.errorText}>{rutError}</Text> : null}

          <Text style={styles.label}>Fecha de nacimiento *</Text>
          <TextInput
            style={styles.input}
            value={fechaNacimiento}
            onChangeText={setFechaNacimiento}
            placeholder="YYYY-MM-DD (Ej: 2000-01-15)"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Correo electrónico *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
        </View>

        {/* CONTACTO DE EMERGENCIA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Contacto de Emergencia</Text>
          
          <Text style={styles.label}>Nombre del contacto *</Text>
          <TextInput
            style={styles.input}
            value={contactoEmergencia}
            onChangeText={setContactoEmergencia}
            placeholder="Nombre completo"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Teléfono de emergencia *</Text>
          <TextInput
            style={styles.input}
            value={telEmergencia}
            onChangeText={setTelEmergencia}
            placeholder="+56 9 1234 5678"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
        </View>

        {/* CATEGORÍA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏉 Categoría</Text>
          
          <Text style={styles.label}>Selecciona tu categoría *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={categoriaSeleccionada}
              onValueChange={(value: string | null) => setCategoriaSeleccionada(value)}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona una categoría..." value={null} />
              {categorias.map((cat) => (
                <Picker.Item key={cat.id} label={cat.nombre} value={cat.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* SISTEMA DE SALUD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Sistema de Salud</Text>
          
          <Text style={styles.label}>Sistema de salud *</Text>
          <TextInput
            style={styles.input}
            value={sistemaSalud}
            onChangeText={setSistemaSalud}
            placeholder="Fonasa o Isapre"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Seguro complementario (opcional)</Text>
          <TextInput
            style={styles.input}
            value={seguroComplementario}
            onChangeText={setSeguroComplementario}
            placeholder="Nombre del seguro"
            placeholderTextColor="#999"
          />
        </View>

        {/* TUTOR (PARA MENORES) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Datos del Tutor (Menores de edad)</Text>
          
          <Text style={styles.label}>Nombre del tutor</Text>
          <TextInput
            style={styles.input}
            value={nombreTutor}
            onChangeText={setNombreTutor}
            placeholder="Nombre completo del tutor"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>RUT del tutor</Text>
          <TextInput
            style={[styles.input, rutTutorError && styles.inputError]}
            value={rutTutor}
            onChangeText={(text) => {
              const formatted = formatearRUT(text);
              setRutTutor(formatted);
              setRutTutorError(''); // Limpiar error mientras escribe
            }}
            onBlur={() => validarRUTTutorEnTiempoReal(rutTutor)}
            placeholder="12345678-9"
            placeholderTextColor="#999"
            maxLength={10}
            keyboardType="default"
            autoCapitalize="characters"
          />
          {rutTutorError ? <Text style={styles.errorText}>{rutTutorError}</Text> : null}

          <Text style={styles.label}>Teléfono del tutor</Text>
          <TextInput
            style={styles.input}
            value={telTutor}
            onChangeText={setTelTutor}
            placeholder="+56 9 1234 5678"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
        </View>

        {/* INFORMACIÓN MÉDICA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚕️ Información Médica</Text>
          
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setFuma(!fuma)}
          >
            <View style={[styles.checkbox, fuma && styles.checkboxChecked]}>
              {fuma && <Text style={styles.checkboxText}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>¿Fuma?</Text>
          </TouchableOpacity>

          {fuma && (
            <>
              <Text style={styles.label}>Frecuencia</Text>
              <TextInput
                style={styles.input}
                value={fumaFrecuencia}
                onChangeText={setFumaFrecuencia}
                placeholder="Ej: Ocasional, Diaria"
                placeholderTextColor="#999"
              />
            </>
          )}

          <Text style={styles.label}>¿Posee alguna enfermedad de alto riesgo?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={enfermedades}
            onChangeText={setEnfermedades}
            placeholder="Describe si tienes alguna enfermedad"
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>¿Posee alguna alergia?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={alergias}
            onChangeText={setAlergias}
            placeholder="Describe si tienes alergias"
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>¿Toma algún tipo de medicamento?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={medicamentos}
            onChangeText={setMedicamentos}
            placeholder="Lista los medicamentos que tomas"
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>¿Posee alguna lesión importante de informar?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={lesiones}
            onChangeText={setLesiones}
            placeholder="Describe lesiones importantes"
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />
        </View>

        {/* ACTIVIDAD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Actividad</Text>
          
          <Text style={styles.label}>¿Estudias o trabajas? *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setActividad('Estudio')}
            >
              <View style={[styles.radio, actividad === 'Estudio' && styles.radioSelected]}>
                {actividad === 'Estudio' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Estudio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setActividad('Trabajo')}
            >
              <View style={[styles.radio, actividad === 'Trabajo' && styles.radioSelected]}>
                {actividad === 'Trabajo' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Trabajo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setActividad('Ambos')}
            >
              <View style={[styles.radio, actividad === 'Ambos' && styles.radioSelected]}>
                {actividad === 'Ambos' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Ambos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AUTORIZACIÓN DE USO DE IMAGEN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Autorización de Uso de Imagen</Text>
          <Text style={styles.label}>¿Autorizas el uso de tu imagen para fines deportivos y promocionales del club?</Text>
          
          <View style={styles.radioButtonGroup}>
            <TouchableOpacity
              style={[styles.radioButton, autorizoUsoImagen === true && styles.radioButtonSelected]}
              onPress={() => setAutorizoUsoImagen(true)}
            >
              <Text style={[styles.radioButtonText, autorizoUsoImagen === true && styles.radioButtonTextSelected]}>
                Sí
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.radioButton, autorizoUsoImagen === false && styles.radioButtonSelected]}
              onPress={() => setAutorizoUsoImagen(false)}
            >
              <Text style={[styles.radioButtonText, autorizoUsoImagen === false && styles.radioButtonTextSelected]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTÓN ENVIAR */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleEnviar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>✅ Enviar Inscripción</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1a472a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#1a472a',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  radioButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  radioButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#1a472a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioButtonSelected: {
    backgroundColor: '#1a472a',
  },
  radioButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a472a',
  },
  radioButtonTextSelected: {
    color: '#fff',
  },
  radioGroup: {
    marginTop: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a472a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioSelected: {
    borderColor: '#1a472a',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a472a',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#1a472a',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
