import { describe, expect, it } from 'vitest';
import { parseScript, sceneIdentifier } from '../lib/parser/parseScript';

const characters = { PERSONAJE_A: {}, PERSONAJE_B: {} };

describe('parseScript', () => {
  it('lee escenas, diálogos multilínea y pantallas negras', () => {
    const result = parseScript(
      `# ESCENA 1 | TÍTULO
[PERSONAJE_A]
Primera línea.

Tercera línea.

@BLACK`,
      characters,
    );
    expect(result.scenes).toHaveLength(1);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]).toMatchObject({ kind: 'dialogue', id: 'E01-C001', characterId: 'PERSONAJE_A' });
    expect((result.cues[0] as { lines: string[] }).lines).toEqual(['Primera línea.', '', 'Tercera línea.']);
  });

  it('detecta personajes desconocidos, texto fuera de personaje y escena vacía', () => {
    const result = parseScript('# ESCENA FINAL\nTexto fuera\n[OTRO]\n', characters);
    expect(result.messages.map((message) => message.code)).toEqual(
      expect.arrayContaining(['TEXT_OUTSIDE_CHARACTER', 'UNKNOWN_CHARACTER', 'EMPTY_DIALOGUE']),
    );
  });

  it('genera un cue por repetición del mismo personaje', () => {
    const result = parseScript(`# ESCENA 1\n[PERSONAJE_A]\nUno\n[PERSONAJE_A]\nDos`, characters);
    expect(result.cues).toHaveLength(2);
  });

  it('conserva caracteres Unicode y detecta negras consecutivas', () => {
    const result = parseScript('# ESCENA FINAL\n[PERSONAJE_A]\nÁéíñ\n@BLACK\n@BLACK', characters);
    expect((result.cues[0] as { lines: string[] }).lines[0]).toBe('Áéíñ');
    expect(result.messages.some((message) => message.code === 'CONSECUTIVE_BLACK')).toBe(true);
  });

  it('normaliza identificadores textuales', () => {
    expect(sceneIdentifier('FINAL')).toBe('FINAL');
    expect(sceneIdentifier('1')).toBe('E01');
  });

  it('detecta comentarios dentro de diálogo sin crear línea', () => {
    const result = parseScript('# ESCENA 1\n[PERSONAJE_A]\nUno\n// interno\nDos', characters);
    expect((result.cues[0] as { lines: string[] }).lines).toEqual(['Uno', 'Dos']);
  });
});
