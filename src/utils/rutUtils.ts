/**
 * Utilidades para manejo y validación de RUT chileno
 */

/**
 * Limpia el RUT eliminando puntos, guiones y espacios
 */
export const limpiarRUT = (rut: string): string => {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
};

/**
 * Formatea el RUT mientras se escribe con guión automático
 * Formato: 12345678-9
 * Solo permite números y la letra K
 */
export const formatearRUT = (rut: string): string => {
  console.log('🔧 [RUT UTILS] formatearRUT - Input:', rut);
  
  // Limpiar todo excepto números y K
  let limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  console.log('🔧 [RUT UTILS] formatearRUT - Limpio:', limpio);
  
  // Limitar longitud máxima (8 dígitos + 1 verificador = 9)
  if (limpio.length > 9) {
    limpio = limpio.slice(0, 9);
  }
  
  // Si tiene más de 1 carácter, agregar guión antes del último
  if (limpio.length > 1) {
    const resultado = limpio.slice(0, -1) + '-' + limpio.slice(-1);
    console.log('🔧 [RUT UTILS] formatearRUT - Resultado:', resultado);
    return resultado;
  }
  
  console.log('🔧 [RUT UTILS] formatearRUT - Resultado (sin guion):', limpio);
  return limpio;
};

/**
 * Valida un RUT chileno usando el algoritmo del dígito verificador
 * Acepta formato: 12345678-9 o 123456789
 */
export const validarRUT = (rut: string): boolean => {
  // Limpiar el RUT
  const rutLimpio = limpiarRUT(rut);
  
  // Verificar que tenga al menos 2 caracteres (1 número + verificador)
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
  
  let dvCalculado: string;
  if (dvEsperado === 11) {
    dvCalculado = '0';
  } else if (dvEsperado === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = dvEsperado.toString();
  }
  
  // Comparar con el dígito verificador ingresado
  return digitoVerificador === dvCalculado;
};

/**
 * Formatea un RUT para mostrarlo con guión
 * Ejemplo: 123456789 -> 12345678-9
 */
export const formatearRUTConGuion = (rut: string): string => {
  const rutLimpio = limpiarRUT(rut);
  if (rutLimpio.length < 2) return rut;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  
  return `${cuerpo}-${dv}`;
};
