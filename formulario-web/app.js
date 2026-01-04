// Configuración de Supabase
const SUPABASE_URL = 'https://ynrotwnxqwjekuivungk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kB7pkMYhwTkFY5hZVCco2A_TefA9SRc';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias DOM
const form = document.getElementById('inscripcionForm');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const categoriaSelect = document.getElementById('categoria');
const fumaCheckbox = document.getElementById('fuma');
const frecuenciaField = document.getElementById('frecuenciaField');

// Cargar categorías desde Supabase
async function cargarCategorias() {
    try {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .eq('activo', true)
            .order('numero', { ascending: true });

        if (error) throw error;

        categoriaSelect.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
        
        data.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.numero;
            option.textContent = cat.nombre;
            categoriaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        mostrarError('No se pudieron cargar las categorías. Recarga la página.');
    }
}

// Mostrar/ocultar campo de frecuencia de fumar
fumaCheckbox.addEventListener('change', (e) => {
    frecuenciaField.style.display = e.target.checked ? 'block' : 'none';
    if (!e.target.checked) {
        document.getElementById('fumaFrecuencia').value = '';
    }
});

// Validar RUT chileno
function validarRUT(rut) {
    // Formato básico: 12345678-9
    const rutRegex = /^\d{7,8}-[\dkK]$/;
    return rutRegex.test(rut.trim());
}

// Mostrar error
function mostrarError(mensaje) {
    errorMessage.textContent = '❌ ' + mensaje;
    errorMessage.classList.add('active');
    setTimeout(() => {
        errorMessage.classList.remove('active');
    }, 5000);
}

// Mostrar éxito
function mostrarExito() {
    successMessage.classList.add('active');
    form.style.display = 'none';
    
    // Opcional: redirigir después de 3 segundos
    setTimeout(() => {
        window.location.reload();
    }, 5000);
}

// Manejar envío del formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener valores
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

    // Validaciones
    if (!validarRUT(rut)) {
        mostrarError('El RUT no tiene el formato correcto. Debe ser: 12345678-9');
        return;
    }

    if (!actividad) {
        mostrarError('Debes seleccionar si estudias, trabajas o ambos');
        return;
    }

    // Preparar datos
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

    // Mostrar loading
    submitBtn.disabled = true;
    loading.classList.add('active');

    try {
        // Verificar si el RUT ya existe
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

        // Insertar en Supabase
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

// Cargar categorías al iniciar
cargarCategorias();

// Auto-completar fecha de nacimiento con formato correcto
document.getElementById('fechaNacimiento').setAttribute('max', new Date().toISOString().split('T')[0]);
