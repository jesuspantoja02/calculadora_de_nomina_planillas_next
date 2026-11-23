/** Base de conocimiento del sistema para el asistente (consultas en español). */
export interface FragmentoConocimiento {
  id: string;
  titulo: string;
  etiquetas: string[];
  texto: string;
}

export const CONOCIMIENTO_SISTEMA: FragmentoConocimiento[] = [
  {
    id: 'que-es',
    titulo: 'Qué es el sistema',
    etiquetas: ['sistema', 'app', 'planilla', 'nomina', 'qué es', 'para qué', 'ayuda'],
    texto: `Esta es la Calculadora de Nómina / Planillas. Sirve para registrar empleados, procesar pagos (quincena y fin de mes), emitir boletas, ver el dashboard y ajustar la configuración de tasas (AFP, ONP, RMV, UIT, empresa). Está orientada a la normativa laboral peruana.`,
  },
  {
    id: 'modulos',
    titulo: 'Módulos y menú',
    etiquetas: ['modulos', 'menú', 'navegacion', 'pantallas', 'donde', 'empleados', 'boletas', 'dashboard', 'usuarios', 'configuracion'],
    texto: `Módulos principales:
- Empleados: alta, edición, filtros, exportar CSV/Excel (.xlsx con tabla). Datos: DNI, nombre, cargo, sueldo, régimen AFP/ONP, administradora AFP, hijos (asignación familiar).
- Procesar pago: simular o emitir boleta (adelanto quincenal o fin de mes), horas extra, faltas, etc.
- Boletas: historial de boletas emitidas, búsqueda y exportar PDF.
- Dashboard: totales, distribución AFP/ONP, extremos de sueldo.
- Usuarios: cuentas de acceso (según rol). Puedes subir foto de perfil.
- Configuración: tasas AFP por administradora, ONP, EsSalud, RMV, UIT, adelanto quincenal, datos de empresa y logo. Solo admin/jefe/gerente.`,
  },
  {
    id: 'roles',
    titulo: 'Roles y permisos',
    etiquetas: ['rol', 'roles', 'permisos', 'admin', 'jefe', 'gerente', 'usuario', 'acceso'],
    texto: `Roles: admin, jefe, gerente y usuario.
- Admin: acceso total, gestiona usuarios y configuración.
- Jefe / gerente: pueden gestionar planilla y configuración; crear usuarios con roles limitados.
- Usuario: operativo (empleados/pagos según menú), sin listar todas las cuentas ni entrar a configuración.
Configuración está restringida a admin, jefe y gerente.`,
  },
  {
    id: 'afp',
    titulo: 'AFP y descuentos de pensión',
    etiquetas: ['afp', 'integra', 'prima', 'profuturo', 'habitat', 'pension', 'comision', 'prima seguro', 'aporte', 'flujo', 'saldo'],
    texto: `Régimen AFP (privado):
- Aporte obligatorio al fondo: 10 % (hasta la remuneración máxima asegurable).
- Prima de seguro: ~1,37 % (editable por AFP en Configuración).
- Comisión por flujo: se descuenta del sueldo si el esquema es "flujo" (porcentaje distinto por AFP: Habitat, Integra, Prima, Profuturo).
- Comisión sobre saldo: no se descuenta del sueldo; se cobra al fondo.
ONP: 13 % sobre la base, sin el tope de remuneración máxima asegurable.
Las tasas por AFP se editan en Configuración.`,
  },
  {
    id: 'calculo-fin-mes',
    titulo: 'Cálculo de fin de mes',
    etiquetas: ['fin de mes', 'sueldo', 'neto', 'bruto', 'descuento', 'boleta', 'calculo', 'como se calcula'],
    texto: `Fin de mes:
- Remuneración ordinaria = sueldo + asignación familiar (si tiene hijos).
- Hora ordinaria = remuneración ordinaria / 30 / 8.
- Horas extra: primeras 2 del día al 125 %, siguientes al 135 %.
- Falta: descuenta un treintavo y reduce la base de pensión.
- Descuentos de ley: AFP u ONP (+ quinta categoría si está activa).
- EsSalud (9 %) es a cargo del empleador; no se descuenta al trabajador.
- Neto = ingresos − descuentos del trabajador.`,
  },
  {
    id: 'quincena',
    titulo: 'Adelanto quincenal',
    etiquetas: ['quincena', 'adelanto', 'quincenal', '40%'],
    texto: `El adelanto quincenal es un porcentaje del sueldo definido por la empresa (por defecto 40 % en Configuración). La ley no lo fija. No lleva descuentos de AFP/ONP ni quinta: es un adelanto que luego se considera en el cierre de mes según el flujo de la app.`,
  },
  {
    id: 'asignacion',
    titulo: 'Asignación familiar',
    etiquetas: ['asignacion', 'familiar', 'hijos', 'rmv', '10%'],
    texto: `Asignación familiar (Ley 25129): 10 % de la RMV vigente si el trabajador tiene hijos registrados. La RMV se configura en Configuración (referencia oct 2026: S/ 1 230).`,
  },
  {
    id: 'gratificacion',
    titulo: 'Gratificación',
    etiquetas: ['gratificacion', 'julio', 'diciembre', 'bonificacion', 'eps', '30334', '27735'],
    texto: `Gratificación (Ley 27735): un sueldo computable por semestre según meses trabajados/6, sin descuento de pensión. Bonificación extraordinaria Ley 30334: 9 % de la gratificación, o 6,75 % si está en EPS. No integra renta de quinta.`,
  },
  {
    id: 'cts',
    titulo: 'CTS',
    etiquetas: ['cts', 'compensacion', 'tiempo', 'servicio', 'deposito'],
    texto: `CTS (D.S. 001-97-TR): (básico + asignación + un sexto de la gratificación) × tiempo / 12, más treintavo diario según corresponda. Es un depósito, no un pago de sueldo líquido en boleta ordinaria.`,
  },
  {
    id: 'quinta',
    titulo: 'Impuesto de quinta categoría',
    etiquetas: ['quinta', 'impuesto', 'renta', 'uit', 'retencion', '5ta'],
    texto: `Quinta categoría: se proyecta renta anual estable (12 remuneraciones + 2 gratificaciones), se restan 7 UIT y el aporte deducible a pensión (10 % AFP u ONP; prima y comisión no deducibles). Tramos: 8 %, 14 %, 17 %, 20 % y 30 %. El impuesto anual se reparte en 12. Se puede activar/desactivar en Configuración.`,
  },
  {
    id: 'horas-extra',
    titulo: 'Horas extra y feriados',
    etiquetas: ['horas', 'extra', 'feriado', 'descanso', 'sobretasa', '125', '135'],
    texto: `Horas extra (D.S. 007-2002-TR): valor hora = remuneración ordinaria / 30 / 8. Dos primeras horas del día al 125 %; siguientes al 135 %. Descanso o feriado trabajado sin sustitutorio: sobretasa del 100 % (el día ya está en el sueldo mensual).`,
  },
  {
    id: 'perfil',
    titulo: 'Perfil y foto',
    etiquetas: ['foto', 'perfil', 'avatar', 'contraseña', 'password', 'mi perfil'],
    texto: `Desde el menú lateral puedes abrir Mi perfil: cambiar foto (recorte circular) y contraseña. Al crear o editar usuarios también se puede asignar foto de perfil. En Usuarios del sistema, al editar una cuenta hay un switch para habilitarla o deshabilitarla (un usuario deshabilitado no puede iniciar sesión). Login: tras 3 intentos fallidos la cuenta se bloquea 5 minutos (o hasta que un admin la libere en Usuarios). Si un administrador olvida su clave, en el login «¿Olvidaste tu clave?» el sistema detecta la cuenta del usuario escrito y, solo si es admin, permite restablecerla con ADMIN_RECOVERY_KEY del servidor (.env).`,
  },
  {
    id: 'config',
    titulo: 'Configuración de la empresa',
    etiquetas: ['configuracion', 'empresa', 'ruc', 'logo', 'tasas', 'exportar', 'importar'],
    texto: `En Configuración (gestores) se editan: tasas AFP por administradora, ONP, EsSalud, RMV, UIT, % de adelanto quincenal, quinta categoría, nombre/RUC/eslogan/logo de empresa. Se puede exportar/importar la configuración en JSON.`,
  },
];

export function construirPromptSistema(contextoVivo: string): string {
  const base = CONOCIMIENTO_SISTEMA.map((f) => `### ${f.titulo}\n${f.texto}`).join('\n\n');
  return `Eres el asistente de la Calculadora de Nómina / Planillas (Perú). Respondes en español, claro y breve, con tono profesional y cercano.
Solo ayudas con este sistema: empleados, planilla, AFP/ONP, boletas, dashboard, usuarios, configuración y normativa que aplica la app.
Si preguntan algo fuera de alcance, indícalo y vuelve al tema de planillas.
No inventes botones o pantallas que no existan. Usa los datos vigentes del contexto cuando den números.

## Contexto vigente de la instalación
${contextoVivo}

## Conocimiento del sistema
${base}`;
}
