import { describe, expect, it } from 'vitest';
import { composeSlides, contrastRatio } from '../lib/layout/composeSlides';
import { parseScript } from '../lib/parser/parseScript';
import { DEFAULT_CONFIG } from '../lib/constants';
import type { ProjectConfig } from '../types';

describe('composición', () => {
  it('genera un SlideModel por cue', () => {
    const config = structuredClone(DEFAULT_CONFIG) as unknown as ProjectConfig;
    const parsed = parseScript('# ESCENA 1\n[PERSONAJE_A]\nEjemplo\n@BLACK', config.personajes);
    const slides = composeSlides(parsed, config);
    expect(slides).toHaveLength(2);
    expect(slides[1].background).toBe('#000000');
  });

  it('calcula contraste y detecta insuficiencia', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeGreaterThan(4.5);
    expect(contrastRatio('#777777', '#999999')).toBeLessThan(2);
  });

  it('usa el color configurado del personaje para todo el cue', () => {
    const config = structuredClone(DEFAULT_CONFIG) as unknown as ProjectConfig;
    config.texto.color_predeterminado = '#00FF00';
    config.personajes.PERSONAJE_A.color = '#FF0000';
    const parsed = parseScript('# ESCENA 1\n[PERSONAJE_A]\nEjemplo', config.personajes);
    const slides = composeSlides(parsed, config);
    expect(slides[0].name).toBe('PERSONAJE A');
    expect(slides[0].textColor).toBe('#FF0000');
  });
});
