import { create } from 'zustand';
import { parse } from 'yaml';
import { DEFAULT_CONFIG, FILE_LIMITS } from '../lib/constants';
import { parseProjectConfig } from '../schemas/config';
import { parseScript } from '../lib/parser/parseScript';
import { composeSlides } from '../lib/layout/composeSlides';
import type { ParsedDocument, ProjectConfig, SlideModel, ValidationMessage } from '../types';

interface ProjectStore {
  scriptText: string;
  config: ProjectConfig;
  parsed: ParsedDocument;
  slides: SlideModel[];
  messages: ValidationMessage[];
  scriptName: string;
  configName: string;
  currentIndex: number;
  showGuides: boolean;
  zoom: number;
  setScriptText: (text: string, name?: string) => void;
  setConfigText: (text: string, name?: string) => void;
  updateConfig: (config: ProjectConfig) => void;
  setCurrentIndex: (index: number) => void;
  setShowGuides: (value: boolean) => void;
  setZoom: (value: number) => void;
  loadExample: () => Promise<void>;
}

function rebuild(scriptText: string, config: ProjectConfig) {
  const parsed = parseScript(scriptText, config.personajes);
  const slides = composeSlides(parsed, config);
  const configMessages: ValidationMessage[] = parsed.messages;
  if (parsed.cues.length > FILE_LIMITS.maxCues) {
    configMessages.push({ severity: 'error', code: 'TOO_MANY_CUES', message: 'El proyecto supera el límite de 10.000 cues.' });
  }
  return { parsed, slides, messages: configMessages };
}

const initial = rebuild(
  '',
  structuredClone(DEFAULT_CONFIG) as unknown as ProjectConfig,
);

export const useProjectStore = create<ProjectStore>((set, get) => ({
  scriptText: '',
  config: structuredClone(DEFAULT_CONFIG) as unknown as ProjectConfig,
  parsed: initial.parsed,
  slides: initial.slides,
  messages: [],
  scriptName: '',
  configName: '',
  currentIndex: 0,
  showGuides: false,
  zoom: 70,
  setScriptText: (text, name = 'obra.txt') => {
    const state = get();
    const rebuilt = rebuild(text, state.config);
    set({ scriptText: text, scriptName: name, ...rebuilt, currentIndex: 0 });
  },
  setConfigText: (text, name = 'config.yaml') => {
    try {
      const yaml = parse(text);
      const result = parseProjectConfig(yaml);
      const extraMessages: ValidationMessage[] = result.messages.map((message) => ({
        severity: message.severity,
        code: message.code,
        message: message.message,
      }));
      if (result.data) {
        const rebuilt = rebuild(get().scriptText, result.data);
        set({
          config: result.data,
          configName: name,
          messages: [...rebuilt.messages, ...extraMessages],
          parsed: rebuilt.parsed,
          slides: rebuilt.slides,
        });
      } else {
        set({ configName: name, messages: [...get().parsed.messages, ...extraMessages] });
      }
    } catch (error) {
      set({
        configName: name,
        messages: [{
          severity: 'error',
          code: 'YAML_PARSE',
          message: error instanceof Error ? error.message : 'YAML inválido',
        }],
      });
    }
  },
  updateConfig: (config) => {
    const rebuilt = rebuild(get().scriptText, config);
    set({ config, ...rebuilt });
  },
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setShowGuides: (showGuides) => set({ showGuides }),
  setZoom: (zoom) => set({ zoom }),
  loadExample: async () => {
    const [scriptResponse, configResponse] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}examples/obra-ejemplo.txt`),
      fetch(`${import.meta.env.BASE_URL}examples/config-ejemplo.yaml`),
    ]);
    if (!scriptResponse.ok || !configResponse.ok) throw new Error('No se pudieron cargar los archivos de ejemplo.');
    const scriptText = await scriptResponse.text();
    const configText = await configResponse.text();
    get().setScriptText(scriptText, 'obra-ejemplo.txt');
    get().setConfigText(configText, 'config-ejemplo.yaml');
  },
}));
