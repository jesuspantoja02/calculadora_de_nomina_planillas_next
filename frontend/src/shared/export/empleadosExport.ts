import type { Empleado } from '../../modules/empleados/domain/empleado.model';
import { etiquetaSistemaPensiones } from '../pensiones';
import { descargarBlob, stampFechaArchivo } from './downloadBlob';

const HEADERS = [
  'DNI',
  'Nombre',
  'Cargo',
  'Sueldo base',
  'Régimen',
  'AFP',
  'Sistema de pensiones',
  'Tiene hijos',
  'Hijos (detalle)',
  'Creado en',
  'Actualizado en',
] as const;

const ANCHOS_COLUMNA = [12, 28, 22, 14, 10, 12, 28, 12, 36, 14, 14];

type FilaEmpleado = [
  string,
  string,
  string,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

function filas(empleados: Empleado[]): FilaEmpleado[] {
  return empleados.map((e) => [
    e.dni,
    e.nombre,
    e.cargo,
    e.sueldoBase,
    e.regimen,
    e.afp ?? '',
    etiquetaSistemaPensiones(e.regimen, e.afp),
    e.tieneHijos ? 'Sí' : 'No',
    e.hijos.map((h) => `${h.nombre} (${h.edad})`).join('; '),
    e.creadoEn,
    e.actualizadoEn,
  ]);
}

/** RFC 4180 + comillas si hace falta (CSV UTF-8 de Excel). */
function escaparCsv(valor: string): string {
  if (/[",\n\r]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function celdaCsv(valor: string | number): string {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor.toFixed(2) : '';
  }
  return escaparCsv(valor);
}

function letraColumna(indiceCero: number): string {
  let n = indiceCero;
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/**
 * CSV UTF-8 (formato moderno de Excel).
 * BOM + directiva `sep=,` para que Excel en español abra las columnas correctamente.
 */
export async function descargarEmpleadosCsv(empleados: Empleado[]): Promise<void> {
  const lineas = [
    'sep=,',
    HEADERS.map(escaparCsv).join(','),
    ...filas(empleados).map((r) => r.map(celdaCsv).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  descargarBlob(blob, `empleados_${stampFechaArchivo()}.csv`);
}

/** Libro Excel moderno (.xlsx) con tabla nativa y encabezados de color. */
export async function descargarEmpleadosExcel(empleados: Empleado[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Calculadora de nómina';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Empleados', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const datos = filas(empleados);
  const ultimaCol = letraColumna(HEADERS.length - 1);
  const ultimaFila = datos.length + 1;

  sheet.addTable({
    name: 'Empleados',
    displayName: 'Empleados',
    ref: `A1:${ultimaCol}${ultimaFila}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: HEADERS.map((name) => ({ name, filterButton: true })),
    rows: datos,
  });

  ANCHOS_COLUMNA.forEach((width, i) => {
    sheet.getColumn(i + 1).width = width;
  });

  sheet.getColumn(4).numFmt = '#,##0.00';

  const header = sheet.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  descargarBlob(blob, `empleados_${stampFechaArchivo()}.xlsx`);
}
