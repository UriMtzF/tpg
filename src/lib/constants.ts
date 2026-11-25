export const FILE_LIMITS = {
  obraBytes: 5 * 1024 * 1024,
  configBytes: 1024 * 1024,
  maxCues: 10_000,
} as const;

export const SAFE_FONTS = [
  'Arial',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
] as const;

export const DEFAULT_CONFIG = {
  version: 1,
  metadata: { titulo: 'Título del proyecto', autor: '', idioma: 'es' },
  presentacion: { relacion_aspecto: '16:9', fondo: '#000000' },
  texto: {
    fuente: 'Arial',
    color_predeterminado: '#FFFFFF',
    negrita: true,
    tamano_maximo: 64,
    tamano_minimo: 40,
    decremento: 2,
    alineacion_horizontal: 'centro',
    alineacion_vertical: 'centro',
    margen_horizontal: 8,
    margen_vertical: 8,
    respetar_saltos_linea: true,
    respetar_lineas_vacias: true,
  },
  personaje: { mostrar_nombre: true, tamano: 26, negrita: true, separacion_dialogo: 18 },
  cues: { mostrar_identificador: false, tamano_identificador: 10, color_identificador: '#808080' },
  ajuste: { automatico: true, advertir_si_no_cabe: true, detener_si_no_cabe: false },
  personajes: {
    PERSONAJE_A: { nombre: 'PERSONAJE A', color: '#FFD700' },
    PERSONAJE_B: { nombre: 'PERSONAJE B', color: '#00E5FF' },
  },
} as const;
