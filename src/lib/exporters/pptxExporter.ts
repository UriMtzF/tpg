import PptxGenJS from 'pptxgenjs';
import type { ExportResult, ProjectConfig, SlideModel } from '../../types';
import { sanitizeFilename } from '../utils/files';

export async function exportPptx(slides: SlideModel[], config: ProjectConfig): Promise<ExportResult> {
  const pptx = new PptxGenJS();
  pptx.author = config.metadata.autor || 'TPG';
  pptx.subject = config.metadata.titulo;
  pptx.title = config.metadata.titulo;
  pptx.layout = config.presentacion.relacion_aspecto === '16:9' ? 'LAYOUT_WIDE' : 'LAYOUT_4X3';

  for (const slideModel of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: slideModel.background.replace('#', '') };
    const slideWidth = config.presentacion.relacion_aspecto === '16:9' ? 13.333 : 10;
    const slideHeight = 7.5;
    const xFromPixels = (value: number) => value / slideModel.width * slideWidth;
    const yFromPixels = (value: number) => value / slideModel.height * slideHeight;
    if (slideModel.cue.kind === 'black') continue;

    if (config.personaje.mostrar_nombre && slideModel.name) {
      slide.addText(slideModel.name, {
        x: xFromPixels(config.texto.margen_horizontal * slideModel.width / 100),
        y: yFromPixels(slideModel.layout.namePosition.y),
        w: slideWidth - 2 * xFromPixels(config.texto.margen_horizontal * slideModel.width / 100),
        h: yFromPixels(config.personaje.tamano * 1.2),
        fontFace: config.texto.fuente,
        fontSize: config.personaje.tamano,
        bold: config.personaje.negrita,
        color: slideModel.textColor.replace('#', ''),
        align: config.texto.alineacion_horizontal === 'izquierda'
          ? 'left'
          : config.texto.alineacion_horizontal === 'derecha'
            ? 'right'
            : 'center',
      });
    }
    slide.addText(slideModel.layout.lines.join('\n'), {
      x: xFromPixels(config.texto.margen_horizontal * slideModel.width / 100),
      y: yFromPixels(slideModel.layout.dialoguePosition.y),
      w: slideWidth - 2 * xFromPixels(config.texto.margen_horizontal * slideModel.width / 100),
      h: yFromPixels(Math.max(1, slideModel.layout.lines.length * slideModel.layout.lineHeight)),
      margin: 0,
      fontFace: config.texto.fuente,
      fontSize: slideModel.layout.fontSize,
      bold: config.texto.negrita,
      color: slideModel.textColor.replace('#', ''),
      breakLine: true,
      align: config.texto.alineacion_horizontal === 'izquierda'
        ? 'left'
        : config.texto.alineacion_horizontal === 'derecha'
          ? 'right'
          : 'center',
      valign: 'middle',
    });
  }
  const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  return {
    blob,
    filename: sanitizeFilename(config.metadata.titulo, 'titulo-del-proyecto', 'pptx'),
    mimeType: blob.type,
  };
}
