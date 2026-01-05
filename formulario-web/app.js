(function() {
    'use strict';
    
    // Configuración de Supabase
    const SUPABASE_URL = 'https://ynrotwnxqwjekuivungk.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlucm90d254cXdqZWt1aXZ1bmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDM5OTEsImV4cCI6MjA4Mjk3OTk5MX0.Iu5kBp57jbO7dVRhB1V2CzJ724Vz3f0GgEa7HDkl9zQ';

    // Inicializar Supabase
    console.log('🔧 Inicializando Supabase...');
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase inicializado');

// Referencias DOM - se obtienen después de que el DOM esté listo
let form, submitBtn, loading, successMessage, errorMessage, categoriaSelect, fumaCheckbox, frecuenciaField;

// Cargar categorías desde Supabase
async function cargarCategorias() {
    try {
        console.log('📥 Cargando categorías desde Supabase...');
        
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .eq('activo', true)
            .order('numero', { ascending: true });

        if (error) {
            console.error('❌ Error al consultar Supabase:', error);
            throw error;
        }

        console.log('✅ Categorías recibidas:', data);
        console.log('📊 Total categorías:', data ? data.length : 0);

        categoriaSelect.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
        
        if (data && data.length > 0) {
            data.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.numero;
                option.textContent = cat.nombre;
                categoriaSelect.appendChild(option);
                console.log(`➕ Categoría agregada: ${cat.numero} - ${cat.nombre}`);
            });
            console.log('✅ Todas las categorías agregadas al select');
        } else {
            console.warn('⚠️ No se encontraron categorías activas');
            mostrarError('No hay categorías disponibles. Contacta al administrador.');
        }
    } catch (error) {
        console.error('❌ Error al cargar categorías:', error);
        mostrarError('No se pudieron cargar las categorías. Recarga la página.');
    }
}

// Mostrar/ocultar campo de frecuencia de fumar
function setupFumaCheckbox() {
    fumaCheckbox.addEventListener('change', (e) => {
        frecuenciaField.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
            document.getElementById('fumaFrecuencia').value = '';
        }
    });
}

// Validar RUT chileno
function validarRUT(rut) {
    const rutRegex = /^\d{7,8}-[\dkK]$/;
    return rutRegex.test(rut.trim());
}

// Mostrar error
function mostrarError(mensaje) {
    errorMessage.textContent = '❌ ' + mensaje;
    successMessage.classList.remove('active'); // Ocultar éxito
    errorMessage.classList.add('active');
    // NO se oculta automáticamente, permanece hasta el siguiente envío
}

// Mostrar éxito
function mostrarExito() {
    errorMessage.classList.remove('active'); // Ocultar error
    successMessage.classList.add('active');
    form.style.display = 'none';
    setTimeout(() => {
        window.location.reload();
    }, 3000); // Reducido a 3 segundos
}

// Manejar envío del formulario
function setupFormSubmit() {
    console.log('📝 Configurando manejador de submit...');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🚀 Formulario enviado');
        
        // Ocultar mensajes previos al inicio
        errorMessage.classList.remove('active');
        successMessage.classList.remove('active');

        const nombreCompleto = document.getElementById('nombreCompleto').value.trim();
    const rut = document.getElementById('rut').value.trim();
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;
    const email = document.getElementById('email').value.trim();
    const contactoEmergencia = document.getElementById('contactoEmergencia').value.trim();
    const telEmergencia = document.getElementById('telEmergencia').value.trim();
    const categoria = parseInt(document.getElementById('categoria').value);
    const sistemaSalud = document.getElementById('sistemaSalud').value.trim();
    const seguroComplementario = document.getElementById('seguroComplementario').value.trim();
    const nombreTutor = document.getElementById('nombreTutor').value.trim();
    const rutTutor = document.getElementById('rutTutor').value.trim();
    const telTutor = document.getElementById('telTutor').value.trim();
    const fuma = document.getElementById('fuma').checked;
    const fumaFrecuencia = fuma ? document.getElementById('fumaFrecuencia').value.trim() : null;
    const enfermedades = document.getElementById('enfermedades').value.trim();
    const alergias = document.getElementById('alergias').value.trim();
    const medicamentos = document.getElementById('medicamentos').value.trim();
    const lesiones = document.getElementById('lesiones').value.trim();
    const actividad = document.querySelector('input[name="actividad"]:checked')?.value;

    if (!validarRUT(rut)) {
        mostrarError('El RUT no tiene el formato correcto. Debe ser: 12345678-9');
        return;
    }

    if (!actividad) {
        mostrarError('Debes seleccionar si estudias, trabajas o ambos');
        return;
    }

    const nuevoJugador = {
        rut,
        nombre: nombreCompleto,
        categoria,
        activo: true,
        fecha_nacimiento: fechaNacimiento,
        email,
        contacto_emergencia: contactoEmergencia,
        tel_emergencia: telEmergencia,
        sistema_salud: sistemaSalud,
        seguro_complementario: seguroComplementario || null,
        nombre_tutor: nombreTutor || null,
        rut_tutor: rutTutor || null,
        tel_tutor: telTutor || null,
        fuma_frecuencia: fumaFrecuencia,
        enfermedades: enfermedades || null,
        alergias: alergias || null,
        medicamentos: medicamentos || null,
        lesiones: lesiones || null,
        actividad
    };

    submitBtn.disabled = true;
    loading.classList.add('active');

    try {
        const { data: existente, error: errorConsulta } = await supabase
            .from('jugadores')
            .select('rut')
            .eq('rut', rut)
            .single();

        if (existente) {
            mostrarError('Este RUT ya está registrado en el sistema.');
            submitBtn.disabled = false;
            loading.classList.remove('active');
            return;
        }

        const { data, error } = await supabase
            .from('jugadores')
            .insert([nuevoJugador])
            .select();

        if (error) {
            console.error('Error de Supabase:', error);
            throw error;
        }

        console.log('✅ Jugador inscrito:', data);
        mostrarExito();

    } catch (error) {
        console.error('Error al enviar formulario:', error);
        
        if (error.message.includes('duplicate key')) {
            mostrarError('Este RUT ya está registrado en el sistema.');
        } else {
            mostrarError('Ocurrió un error al enviar la inscripción. Por favor, intenta nuevamente.');
        }
        
        submitBtn.disabled = false;
        loading.classList.remove('active');
    }
});
}

// Inicializar cuando el DOM esté listo
function init() {
    console.log('🔄 Inicializando aplicación...');
    
    // Obtener referencias DOM
    form = document.getElementById('inscripcionForm');
    submitBtn = document.getElementById('submitBtn');
    loading = document.getElementById('loading');
    successMessage = document.getElementById('successMessage');
    errorMessage = document.getElementById('errorMessage');
    categoriaSelect = document.getElementById('categoria');
    fumaCheckbox = document.getElementById('fuma');
    frecuenciaField = document.getElementById('frecuenciaField');
    
    console.log('✅ Referencias DOM obtenidas');
    console.log('Form:', form ? 'OK' : 'ERROR');
    console.log('Submit button:', submitBtn ? 'OK' : 'ERROR');
    
    // Configurar event listeners
    setupFumaCheckbox();
    setupFormSubmit();
    
    // Cargar categorías
    cargarCategorias();
    
    // Configurar fecha máxima
    document.getElementById('fechaNacimiento').setAttribute('max', new Date().toISOString().split('T')[0]);
    
    console.log('✅ Aplicación inicializada');
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})(); // Fin de la función autoejecutable
