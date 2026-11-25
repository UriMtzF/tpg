export type AspectRatio = '16:9' | '4:3';

export interface CharacterConfig {
  nombre: string;
  color: string;
}

export interface ProjectConfig {
  version: 1;
  metadata: { titulo: string; autor: string; idioma: string };
  presentacion: { relacion_aspecto: AspectRatio; fondo: string };
  texto: {
    fuente: string;
    color_predeterminado: string;
    negrita: boolean;
    tamano_maximo: number;
    tamano_minimo: number;
    decremento: number;
    alineacion_horizontal: 'izquierda' | 'centro' | 'derecha';
    alineacion_vertical: 'arriba' | 'centro' | 'abajo';
    margen_horizontal: number;
    margen_vertical: number;
    respetar_saltos_linea: boolean;
    respetar_lineas_vacias: boolean;
  };
  personaje: {
    mostrar_nombre: boolean;
    tamano: number;
    negrita: boolean;
    separacion_dialogo: number;
  };
  cues: {
    mostrar_identificador: boolean;
    tamano_identificador: number;
    color_identificador: string;
  };
  ajuste: { automatico: boolean; advertir_si_no_cabe: boolean; detener_si_no_cabe: boolean };
  personajes: Record<string, CharacterConfig>;
}

export interface ValidationMessage {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line?: number;
  column?: number;
  sceneId?: string;
  cueId?: string;
  suggestion?: string;
}

export interface DialogueCue {
  kind: 'dialogue';
  id: string;
  sceneId: string;
  characterId: string;
  lines: string[];
  line: number;
}

export interface BlackCue {
  kind: 'black';
  id: string;
  sceneId: string;
  line: number;
}

export type Cue = DialogueCue | BlackCue;

export interface Scene {
  id: string;
  title?: string;
  cues: Cue[];
  startLine: number;
}

export interface ParsedDocument {
  scenes: Scene[];
  cues: Cue[];
  messages: ValidationMessage[];
}

export interface TextLayoutResult {
  fontSize: number;
  fits: boolean;
  adjustedToMinimum: boolean;
  overflow: boolean;
  namePosition: { x: number; y: number };
  dialoguePosition: { x: number; y: number };
  lineHeight: number;
  lines: string[];
  characterId?: string;
}

export interface SlideModel {
  cue: Cue;
  scene: Scene;
  background: string;
  name?: string;
  textColor: string;
  dialogueLines?: string[];
  layout: TextLayoutResult;
  cueIndex: number;
  width: number;
  height: number;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}
