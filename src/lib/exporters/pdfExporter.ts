import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { ExportResult, ProjectConfig, SlideModel } from '../../types';
import { sanitizeFilename } from '../utils/files';

function parseHex(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

export async function exportPdf(slides: SlideModel[], config: ProjectConfig): Promise<ExportResult> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(config.metadata.titulo);
  pdf.setAuthor(config.metadata.autor || 'TPG');
  pdf.setLanguage(config.metadata.idioma);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const slide of slides) {
    const page = pdf.addPage([slide.width, slide.height]);
    const background = parseHex(slide.background);
    page.drawRectangle({ x: 0, y: 0, width: slide.width, height: slide.height, color: rgb(background.r, background.g, background.b) });
    if (slide.cue.kind === 'black') continue;

    const scaleY = (y: number) => slide.height - y;
    if (config.personaje.mostrar_nombre && slide.name) {
      const color = parseHex(slide.textColor);
      let x = slide.layout.namePosition.x;
      if (config.texto.alineacion_horizontal === 'centro') {
        x -= font.widthOfTextAtSize(slide.name, config.personaje.tamano) / 2;
      } else if (config.texto.alineacion_horizontal === 'derecha') {
        x -= font.widthOfTextAtSize(slide.name, config.personaje.tamano);
      }
      page.drawText(slide.name, {
        x,
        y: scaleY(slide.layout.namePosition.y + config.personaje.tamano),
        size: config.personaje.tamano,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    }
    const color = parseHex(slide.textColor);
    const lineHeight = slide.layout.lineHeight;
    slide.layout.lines.forEach((line, index) => {
      if (line === '') return;
      let x = slide.layout.dialoguePosition.x;
      if (config.texto.alineacion_horizontal === 'centro') {
        const width = font.widthOfTextAtSize(line, slide.layout.fontSize);
        x -= width / 2;
      } else if (config.texto.alineacion_horizontal === 'derecha') {
        x -= font.widthOfTextAtSize(line, slide.layout.fontSize);
      }
      page.drawText(line, {
        x,
        y: scaleY(slide.layout.dialoguePosition.y + slide.layout.fontSize + index * lineHeight),
        size: slide.layout.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    });
  }
  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return {
    blob,
    filename: sanitizeFilename(config.metadata.titulo, 'titulo-del-proyecto', 'pdf'),
    mimeType: 'application/pdf',
  };
}
