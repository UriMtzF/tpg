import type { ProjectConfig, SlideModel, TextLayoutResult } from '../../types';
import type { ParsedDocument } from '../../types';

export function dimensionsFor(config: ProjectConfig) {
  return config.presentacion.relacion_aspecto === '16:9'
    ? { width: 1280, height: 720 }
    : { width: 960, height: 720 };
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const rgb = hexToRgb(hex).map((channel) => {
      const s = channel / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function measureLines(lines: string[], fontSize: number, font: string, maxWidth: number): { wrapped: string[]; fits: boolean } {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const context = canvas?.getContext('2d');
  if (context) context.font = `${fontSize}px ${font}`;
  const wrapped: string[] = [];
  let fits = true;
  for (const line of lines) {
    if (line === '') {
      wrapped.push('');
      continue;
    }
    const estimatedWidth = context
      ? context.measureText(line).width
      : Array.from(line).length * fontSize * 0.58;
    if (estimatedWidth <= maxWidth) {
      wrapped.push(line);
      continue;
    }
    const words = line.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const candidateWidth = context
        ? context.measureText(candidate).width
        : Array.from(candidate).length * fontSize * 0.58;
      if (candidateWidth > maxWidth && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) wrapped.push(current);
  }
  const contentWidth = wrapped.some((line) => {
    const width = context ? context.measureText(line).width : line.length * fontSize * 0.58;
    return width > maxWidth;
  });
  if (contentWidth) fits = false;
  return { wrapped, fits };
}

export function composeSlides(document: ParsedDocument, config: ProjectConfig): SlideModel[] {
  const { width, height } = dimensionsFor(config);
  const horizontalMargin = width * config.texto.margen_horizontal / 100;
  const verticalMargin = height * config.texto.margen_vertical / 100;
  const availableWidth = width - horizontalMargin * 2;
  const availableHeight = height - verticalMargin * 2;
  const slides: SlideModel[] = [];
  let cueIndex = 0;

  for (const scene of document.scenes) {
    for (const cue of scene.cues) {
      if (cue.kind === 'black') {
        const layout: TextLayoutResult = {
          fontSize: 0,
          fits: true,
          adjustedToMinimum: false,
          overflow: false,
          namePosition: { x: 0, y: 0 },
          dialoguePosition: { x: 0, y: 0 },
          lineHeight: 0,
          lines: [],
        };
        slides.push({
          cue,
          scene,
          background: '#000000',
          textColor: '#FFFFFF',
          layout,
          cueIndex,
          width,
          height,
        });
        cueIndex += 1;
        continue;
      }

      const character = config.personajes[cue.characterId];
      const name = character?.nombre;
      const nameHeight = config.personaje.mostrar_nombre ? config.personaje.tamano * 1.2 : 0;
      const nameAndGap = config.personaje.mostrar_nombre
        ? nameHeight + config.personaje.separacion_dialogo
        : 0;
      let fontSize = config.texto.tamano_maximo;
      let result = measureLines(cue.lines, fontSize, config.texto.fuente, availableWidth);
      let fits = result.fits &&
        nameAndGap + result.wrapped.length * (fontSize * 1.18) <= availableHeight;

      while (!fits && config.ajuste.automatico && fontSize > config.texto.tamano_minimo) {
        fontSize = Math.max(config.texto.tamano_minimo, fontSize - config.texto.decremento);
        result = measureLines(cue.lines, fontSize, config.texto.fuente, availableWidth);
        fits = result.fits &&
          nameAndGap + result.wrapped.length * (fontSize * 1.18) <= availableHeight;
      }
      const overflow = !fits;
      const adjustedToMinimum = fontSize === config.texto.tamano_minimo && overflow;
      const lineHeight = fontSize * 1.18;
      const totalHeight = nameAndGap + result.wrapped.length * lineHeight;
      const vertical = config.texto.alineacion_vertical;
      let top = verticalMargin;
      if (vertical === 'centro') top = (height - totalHeight) / 2;
      if (vertical === 'abajo') top = height - verticalMargin - totalHeight;
      const nameY = top;
      const dialogueY = top + nameAndGap;
      const horizontal = config.texto.alineacion_horizontal;
      let x = horizontalMargin;
      if (horizontal === 'centro') x = width / 2;
      if (horizontal === 'derecha') x = width - horizontalMargin;
      const layout: TextLayoutResult = {
        fontSize,
        fits,
        adjustedToMinimum,
        overflow,
        namePosition: { x, y: nameY },
        dialoguePosition: { x, y: dialogueY },
        lineHeight,
        lines: result.wrapped,
        characterId: cue.characterId,
      };
      slides.push({
        cue,
        scene,
        background: config.presentacion.fondo,
        name,
        textColor: character?.color ?? config.texto.color_predeterminado,
        dialogueLines: result.wrapped,
        layout,
        cueIndex,
        width,
        height,
      });
      cueIndex += 1;
    }
  }
  return slides;
}
