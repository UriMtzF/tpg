import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseProjectConfig } from '../schemas/config';
import { parseScript } from '../lib/parser/parseScript';
import { composeSlides } from '../lib/layout/composeSlides';

describe('integración de archivos de ejemplo', () => {
  it('construye escenas y diapositivas', () => {
    const script = readFileSync('public/examples/obra-ejemplo.txt', 'utf8');
    const yaml = parse(readFileSync('public/examples/config-ejemplo.yaml', 'utf8'));
    const configResult = parseProjectConfig(yaml);
    expect(configResult.data).toBeDefined();
    const parsed = parseScript(script, configResult.data!.personajes);
    const slides = composeSlides(parsed, configResult.data!);
    expect(parsed.scenes).toHaveLength(2);
    expect(parsed.cues).toHaveLength(4);
    expect(slides).toHaveLength(4);
  });
});
