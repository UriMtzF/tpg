import { z } from 'zod';
import type { ProjectConfig } from '../types';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/i, 'Debe usar formato hexadecimal #RRGGBB');
const positive = z.number().finite().positive();

export const characterSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre visible es obligatorio'),
  color: hexColor,
});

export const projectConfigSchema = z.object({
  version: z.literal(1, { errorMap: () => ({ message: 'La versión compatible es 1' }) }),
  metadata: z.object({
    titulo: z.string(),
    autor: z.string(),
    idioma: z.string().trim().min(2),
  }),
  presentacion: z.object({
    relacion_aspecto: z.enum(['16:9', '4:3']),
    fondo: hexColor,
  }),
  texto: z.object({
    fuente: z.string().trim().min(1),
    color_predeterminado: hexColor,
    negrita: z.boolean(),
    tamano_maximo: positive,
    tamano_minimo: positive,
    decremento: positive,
    alineacion_horizontal: z.enum(['izquierda', 'centro', 'derecha']),
    alineacion_vertical: z.enum(['arriba', 'centro', 'abajo']),
    margen_horizontal: z.number().finite().min(0).max(30),
    margen_vertical: z.number().finite().min(0).max(30),
    respetar_saltos_linea: z.boolean(),
    respetar_lineas_vacias: z.boolean(),
  }).superRefine((value, ctx) => {
    if (value.tamano_minimo > value.tamano_maximo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'tamano_minimo no puede superar tamano_maximo', path: ['tamano_minimo'] });
    }
  }),
  personaje: z.object({
    mostrar_nombre: z.boolean(),
    tamano: positive,
    negrita: z.boolean(),
    separacion_dialogo: z.number().finite().min(0).max(200),
  }),
  cues: z.object({
    mostrar_identificador: z.boolean(),
    tamano_identificador: positive,
    color_identificador: hexColor,
  }),
  ajuste: z.object({
    automatico: z.boolean(),
    advertir_si_no_cabe: z.boolean(),
    detener_si_no_cabe: z.boolean(),
  }),
  personajes: z.record(characterSchema).refine((value) => Object.keys(value).length > 0, 'Debe existir al menos un personaje'),
}).passthrough();

export function parseProjectConfig(input: unknown): {
  data?: ProjectConfig;
  messages: { severity: 'error' | 'warning'; code: string; message: string; line?: number }[];
  unknownKeys: string[];
} {
  if (!input || typeof input !== 'object') {
    return { messages: [{ severity: 'error', code: 'CONFIG_OBJECT', message: 'La configuración debe ser un objeto YAML' }], unknownKeys: [] };
  }
  const record = input as Record<string, unknown>;
  const knownKeys = new Set(['version', 'metadata', 'presentacion', 'texto', 'personaje', 'cues', 'ajuste', 'personajes']);
  const unknownKeys = Object.keys(record).filter((key) => !knownKeys.has(key));
  const parsed = projectConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      messages: parsed.error.issues.map((issue) => ({
        severity: 'error' as const,
        code: 'CONFIG_INVALID',
        message: `${issue.path.join('.')}: ${issue.message}`,
      })),
      unknownKeys,
    };
  }
  return {
    data: parsed.data as ProjectConfig,
    messages: unknownKeys.map((key) => ({
      severity: 'warning' as const,
      code: 'UNKNOWN_PROPERTY',
      message: `Propiedad desconocida: ${key}`,
      line: undefined,
    })),
    unknownKeys,
  };
}
