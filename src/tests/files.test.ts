import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from '../lib/utils/files';

describe('nombres de archivo', () => {
  it('normaliza nombres y elimina caracteres peligrosos', () => {
    expect(sanitizeFilename('Título / Proyecto?', 'fallback', 'pdf')).toBe('titulo-proyecto.pdf');
  });
  it('usa fallback para nombres vacíos', () => {
    expect(sanitizeFilename('///', 'titulo-del-proyecto', 'pptx')).toBe('titulo-del-proyecto.pptx');
  });
});
