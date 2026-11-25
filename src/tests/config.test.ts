import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '../schemas/config';
import { DEFAULT_CONFIG } from '../lib/constants';

describe('configuración', () => {
  it('acepta configuración válida', () => {
    const result = parseProjectConfig(structuredClone(DEFAULT_CONFIG));
    expect(result.data).toBeDefined();
  });

  it('rechaza color inválido', () => {
    const config = structuredClone(DEFAULT_CONFIG) as unknown as { presentacion: { fondo: string }; [key: string]: unknown };
    config.presentacion.fondo = 'negro';
    expect(parseProjectConfig(config).messages.some((message) => message.severity === 'error')).toBe(true);
  });

  it('rechaza tamaños incoherentes', () => {
    const config = structuredClone(DEFAULT_CONFIG) as unknown as { texto: { tamano_minimo: number }; [key: string]: unknown };
    config.texto.tamano_minimo = 100;
    expect(parseProjectConfig(config).messages.some((message) => message.severity === 'error')).toBe(true);
  });

  it('avisa por propiedades desconocidas', () => {
    const config = { ...structuredClone(DEFAULT_CONFIG), desconocida: true };
    expect(parseProjectConfig(config).unknownKeys).toContain('desconocida');
  });
});
