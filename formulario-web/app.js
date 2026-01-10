(function() {
    'use strict';
    
    // Funciones de validación y formateo de RUT
    function limpiarRUT(rut) {
        return rut.replace(/[.\-\s]/g, '').toUpperCase();
    }
    
    function formatearRUT(rut) {
        // Limpiar todo excepto números y K
        let limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
        
        // Limitar longitud máxima (8 dígitos + 1 verificador = 9)
        if (limpio.length > 9) {
            limpio = limpio.slice(0, 9);
        }
        
        // Si tiene más de 1 carácter, agregar guión antes del último
        if (limpio.length > 1) {
            return limpio.slice(0, -1) + '-' + limpio.slice(-1);
        }
        
        return limpio;
    }
    
    function validarRUT(rut) {
        // Limpiar el RUT
        const rutLimpio = limpiarRUT(rut);
        
        // Verificar que tenga al menos 2 caracteres
        if (rutLimpio.length < 2) {
            return false;
        }
        
        // Separar cuerpo y dígito verificador
        const cuerpo = rutLimpio.slice(0, -1);
        const digitoVerificador = rutLimpio.slice(-1);
        
        // Verificar que el cuerpo solo contenga números
        if (!/^\d+$/.test(cuerpo)) {
            return false;
        }
        
        // Calcular dígito verificador esperado
        let suma = 0;
        let multiplicador = 2;
        
        // Recorrer el cuerpo de derecha a izquierda
        for (let i = cuerpo.length - 1; i >= 0; i--) {
            suma += parseInt(cuerpo[i]) * multiplicador;
            multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
        }
        
        const resto = suma % 11;
        const dvEsperado = 11 - resto;
        
        let dvCalculado;
        if (dvEsperado === 11) {
            dvCalculado = '0';
        } else if (dvEsperado === 10) {
            dvCalculado = 'K';
        } else {
            dvCalculado = dvEsperado.toString();
        }
        
        // Comparar con el dígito verificador ingresado
        return digitoVerificador === dvCalculado;
    }
    
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

// Mostrar error
function mostrarError(mensaje) {
    errorMessage.textContent = '❌ ' + mensaje;
    successMessage.classList.remove('active'); // Ocultar éxito
    errorMessage.classList.add('active');
    // NO se oculta automáticamente, permanece hasta el siguiente envío
}

// Mostrar éxito
function mostrarExito() {
    console.log('🎉 Mostrando mensaje de éxito');
    
    // Ocultar elementos
    errorMessage.classList.remove('active');
    loading.classList.remove('active');
    submitBtn.disabled = true;
    
    // Ocultar formulario
    form.style.display = 'none';
    
    // Mostrar mensaje de éxito
    successMessage.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
        <h2 style="margin: 0 0 15px 0; font-size: 28px; color: #155724;">¡Inscripción Exitosa!</h2>
        <p style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.6;">
            Te has registrado correctamente en el club.<br>
            <strong>¡Bienvenido! 🏉</strong>
        </p>
        <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">
            Esta página se recargará en 5 segundos...
        </p>
    `;
    successMessage.classList.add('active');
    successMessage.style.display = 'block';
    
    // Scroll al top para ver el mensaje
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ Mensaje de éxito mostrado');
    
    // Recargar después de 5 segundos
    setTimeout(() => {
        console.log('🔄 Recargando página...');
        window.location.reload();
    }, 5000);
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
    const autorizoUsoImagenValue = document.querySelector('input[name="autorizoUsoImagen"]:checked')?.value;
    const autorizoUsoImagen = autorizoUsoImagenValue === 'true';

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
        actividad,
        autorizo_uso_imagen: autorizoUsoImagen
    };

    submitBtn.disabled = true;
    loading.classList.add('active');

    try {
        // Verificar si el RUT ya existe
        // Verificar si ya existe un jugador con este RUT (activo o inactivo)
        const { data: existente, error: errorConsulta } = await supabase
            .from('jugadores')
            .select('rut, activo')
            .eq('rut', rut)
            .maybeSingle();

        if (errorConsulta) {
            console.error('Error al verificar RUT:', errorConsulta);
            throw errorConsulta;
        }

        let data, error;

        // Si existe y está inactivo, reactivarlo y actualizar sus datos
        if (existente && existente.activo === false) {
            console.log('🔄 Reactivando jugador inactivo:', rut);
            
            const resultado = await supabase
                .from('jugadores')
                .update({
                    ...nuevoJugador,
                    activo: true
                })
                .eq('rut', rut)
                .select();
            
            data = resultado.data;
            error = resultado.error;
        } 
        // Si existe y está activo, mostrar error
        else if (existente && existente.activo === true) {
            mostrarError('Este RUT ya está registrado en el sistema.');
            submitBtn.disabled = false;
            loading.classList.remove('active');
            return;
        }
        // Si no existe, crear nuevo jugador
        else {
            const resultado = await supabase
                .from('jugadores')
                .insert([nuevoJugador])
                .select();
            
            data = resultado.data;
            error = resultado.error;
        }

        if (error) {
            console.error('Error de Supabase:', error);
            throw error;
        }

        console.log('✅ Jugador inscrito:', data);
        
        // Ocultar loading antes de mostrar éxito
        loading.classList.remove('active');
        submitBtn.disabled = false;
        
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
    
    // Configurar autoformateo y validación de RUT
    const rutInput = document.getElementById('rut');
    const rutTutorInput = document.getElementById('rutTutor');
    const rutError = document.getElementById('rutError');
    const rutTutorError = document.getElementById('rutTutorError');
    
    if (rutInput) {
        // Autoformatear mientras escribe
        rutInput.addEventListener('input', function(e) {
            e.target.value = formatearRUT(e.target.value);
            // Ocultar error mientras escribe
            if (rutError) {
                rutError.style.display = 'none';
            }
        });
        
        // Validar cuando sale del campo
        rutInput.addEventListener('blur', function(e) {
            const valor = e.target.value.trim();
            if (valor && !validarRUT(valor)) {
                if (rutError) {
                    rutError.textContent = '❌ RUT inválido. Verifica el dígito verificador.';
                    rutError.style.display = 'block';
                }
                e.target.style.borderColor = '#d32f2f';
            } else {
                if (rutError) {
                    rutError.style.display = 'none';
                }
                e.target.style.borderColor = '';
            }
        });
    }
    
    if (rutTutorInput) {
        // Autoformatear mientras escribe
        rutTutorInput.addEventListener('input', function(e) {
            e.target.value = formatearRUT(e.target.value);
            // Ocultar error mientras escribe
            if (rutTutorError) {
                rutTutorError.style.display = 'none';
            }
        });
        
        // Validar cuando sale del campo (solo si tiene valor, es opcional)
        rutTutorInput.addEventListener('blur', function(e) {
            const valor = e.target.value.trim();
            if (valor && !validarRUT(valor)) {
                if (rutTutorError) {
                    rutTutorError.textContent = '❌ RUT inválido. Verifica el dígito verificador.';
                    rutTutorError.style.display = 'block';
                }
                e.target.style.borderColor = '#d32f2f';
            } else {
                if (rutTutorError) {
                    rutTutorError.style.display = 'none';
                }
                e.target.style.borderColor = '';
            }
        });
    }
    }
    
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
