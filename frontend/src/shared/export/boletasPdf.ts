import { jsPDF } from 'jspdf';
import type { Boleta, Pago } from '../../modules/planilla/domain/pago.model';
import { formatoFecha, formatoMoneda, modalidadLabel } from '../formatters';
import { etiquetaSistemaPensiones } from '../pensiones';
import { stampFechaArchivo } from './downloadBlob';

function linea(doc: jsPDF, y: number, etiqueta: string, valor: string, xEtiqueta = 18, xValor = 118): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(etiqueta, xEtiqueta, y);
  doc.setTextColor(20);
  doc.text(valor, xValor, y, { align: 'right' });
  return y + 6.2;
}

function seccion(doc: jsPDF, y: number, titulo: string): number {
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(14, 74, 92);
  doc.text(titulo.toUpperCase(), 18, y);
  doc.setDrawColor(200);
  doc.line(18, y + 1.5, 192, y + 1.5);
  return y + 8;
}

function dibujarBoleta(doc: jsPDF, b: Boleta): void {
  let y = 22;

  doc.setFillColor(14, 74, 92);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('BOLETA DE PAGO', 18, 10.5);

  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(b.empresaNombre || 'Empresa', 18, y);
  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`RUC ${b.empresaRuc || '—'}`, 18, y);
  y += 6;
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${modalidadLabel(b.modalidad)} · ${formatoFecha(b.fechaPago)}`, 18, y);

  y = seccion(doc, y + 4, 'Empleado');
  y = linea(doc, y, 'Nombre', b.nombre.toUpperCase());
  y = linea(doc, y, 'DNI', b.dni);
  y = linea(doc, y, 'Cargo', b.cargo);
  y = linea(doc, y, 'Sistema de pensiones', etiquetaSistemaPensiones(b.regimen, b.afp));

  y = seccion(doc, y + 2, 'Remuneración');
  y = linea(doc, y, 'Sueldo básico', formatoMoneda(b.sueldoBase));
  if (b.asignacionFamiliar > 0) y = linea(doc, y, 'Asignación familiar', formatoMoneda(b.asignacionFamiliar));
  if (b.pagoHoras25 > 0) y = linea(doc, y, 'Horas extra 25%', formatoMoneda(b.pagoHoras25));
  if (b.pagoHoras35 > 0) y = linea(doc, y, 'Horas extra 35%', formatoMoneda(b.pagoHoras35));
  if (b.pagoDescanso > 0) y = linea(doc, y, 'Descanso / feriado', formatoMoneda(b.pagoDescanso));
  if (b.gratificacion > 0) y = linea(doc, y, 'Gratificación', formatoMoneda(b.gratificacion));
  if (b.bonificacionExtraordinaria > 0) {
    y = linea(doc, y, 'Bonificación extraordinaria', formatoMoneda(b.bonificacionExtraordinaria));
  }
  if (b.cts > 0) y = linea(doc, y, 'CTS', formatoMoneda(b.cts));
  if (b.adelanto > 0) y = linea(doc, y, 'Adelanto quincenal', formatoMoneda(b.adelanto));
  y = linea(doc, y, 'Bruto', formatoMoneda(b.bruto));

  y = seccion(doc, y + 2, 'Descuentos');
  if (b.descuentoTardanza > 0) y = linea(doc, y, 'Tardanzas', formatoMoneda(b.descuentoTardanza));
  if (b.descuentoFalta > 0) y = linea(doc, y, 'Faltas', formatoMoneda(b.descuentoFalta));
  if (b.aporteAfp > 0) y = linea(doc, y, 'Aporte AFP', formatoMoneda(b.aporteAfp));
  if (b.primaSeguro > 0) y = linea(doc, y, 'Prima de seguro', formatoMoneda(b.primaSeguro));
  if (b.comisionAfp > 0) y = linea(doc, y, 'Comisión AFP', formatoMoneda(b.comisionAfp));
  if (b.pension > 0 && b.regimen === 'ONP') y = linea(doc, y, 'ONP', formatoMoneda(b.pension));
  if (b.quintaCategoria > 0) y = linea(doc, y, '5.ª categoría', formatoMoneda(b.quintaCategoria));
  y = linea(doc, y, 'Total descuentos', formatoMoneda(b.totalDescuentos));

  y += 6;
  doc.setFillColor(215, 239, 233);
  doc.roundedRect(18, y - 5, 174, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(10, 61, 52);
  const etiquetaNeto =
    b.modalidad === 'Quincena' ? 'Adelanto a pagar' : b.modalidad === 'CTS' ? 'CTS a depositar' : 'Neto a pagar';
  doc.text(etiquetaNeto, 22, y + 4);
  doc.text(formatoMoneda(b.neto), 188, y + 4, { align: 'right' });

  if (b.essaludEmpleador > 0) {
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`EsSalud a cargo del empleador: ${formatoMoneda(b.essaludEmpleador)} (no se descuenta al trabajador).`, 18, y);
  }

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text('Generado por Planilla Nómina · documento informativo', 105, 287, { align: 'center' });
}

function slugNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

export function descargarBoletaPdf(boleta: Boleta): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  dibujarBoleta(doc, boleta);
  doc.save(`boleta_${slugNombre(boleta.nombre)}_${boleta.fechaPago}.pdf`);
}

/** Una página por boleta (listado filtrado). */
export function descargarBoletasPdf(boletas: Array<Boleta | Pago>): void {
  if (boletas.length === 0) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  boletas.forEach((b, i) => {
    if (i > 0) doc.addPage();
    dibujarBoleta(doc, b);
  });
  doc.save(`boletas_${stampFechaArchivo()}.pdf`);
}
