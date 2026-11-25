import type { BlackCue, Cue, DialogueCue, ParsedDocument, Scene, ValidationMessage } from '../../types';

function safeSceneId(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return `E${trimmed.padStart(2, '0')}`;
  const safe = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
  return safe || 'ESCENA';
}

export function sceneIdentifier(raw: string): string {
  return safeSceneId(raw);
}

export function parseScript(text: string, characters: Record<string, unknown>): ParsedDocument {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const scenes: Scene[] = [];
  const allCues: Cue[] = [];
  const messages: ValidationMessage[] = [];
  let currentScene: Scene | undefined;
  let openDialogue: DialogueCue | undefined;
  const seenSceneIds = new Set<string>();
  const cueCounters = new Map<string, number>();
  let previousBlack = false;

  const closeDialogue = () => {
    if (!openDialogue) return;
    openDialogue.lines = openDialogue.lines.map((line, index, arr) =>
      index === 0 || index === arr.length - 1 ? line : line,
    );
    while (openDialogue.lines.length && openDialogue.lines[0] === '') openDialogue.lines.shift();
    while (openDialogue.lines.length && openDialogue.lines[openDialogue.lines.length - 1] === '') openDialogue.lines.pop();
    if (!openDialogue.lines.length) {
      messages.push({
        severity: 'warning',
        code: 'EMPTY_DIALOGUE',
        message: 'El personaje no tiene diálogo.',
        sceneId: openDialogue.sceneId,
        cueId: openDialogue.id,
        line: openDialogue.line,
      });
    }
    openDialogue = undefined;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNumber = i + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) continue;

    const sceneMatch = line.match(/^#\s*ESCENA\s+(.+)$/i);
    if (sceneMatch) {
      closeDialogue();
      const parts = sceneMatch[1].split('|');
      const rawId = parts.shift()?.trim() || '';
      const title = parts.join('|').trim() || undefined;
      if (!rawId) {
        messages.push({ severity: 'error', code: 'SCENE_ID_REQUIRED', message: 'El encabezado de escena requiere un identificador.', line: lineNumber });
        continue;
      }
      const sceneId = safeSceneId(rawId);
      if (seenSceneIds.has(sceneId)) {
        messages.push({ severity: 'error', code: 'DUPLICATE_SCENE', message: `La escena ${sceneId} está duplicada.`, line: lineNumber, sceneId });
      }
      seenSceneIds.add(sceneId);
      cueCounters.set(sceneId, 0);
      currentScene = { id: sceneId, title, cues: [], startLine: lineNumber };
      scenes.push(currentScene);
      previousBlack = false;
      continue;
    }

    if (!currentScene) {
      if (trimmed) {
        messages.push({ severity: 'error', code: 'TEXT_OUTSIDE_CHARACTER', message: 'El texto debe aparecer dentro de una escena y después de un personaje.', line: lineNumber });
      }
      continue;
    }

    if (trimmed === '@BLACK') {
      closeDialogue();
      if (previousBlack) {
        messages.push({ severity: 'warning', code: 'CONSECUTIVE_BLACK', message: 'Hay dos pantallas negras consecutivas.', line: lineNumber, sceneId: currentScene.id });
      }
      const count = (cueCounters.get(currentScene.id) || 0) + 1;
      cueCounters.set(currentScene.id, count);
      const cue: BlackCue = { kind: 'black', id: `${currentScene.id}-C${String(count).padStart(3, '0')}`, sceneId: currentScene.id, line: lineNumber };
      currentScene.cues.push(cue);
      allCues.push(cue);
      previousBlack = true;
      continue;
    }

    const characterMatch = line.match(/^\[([^\]]+)\]$/);
    if (characterMatch) {
      closeDialogue();
      const characterId = characterMatch[1].trim();
      if (!Object.prototype.hasOwnProperty.call(characters, characterId)) {
        messages.push({ severity: 'error', code: 'UNKNOWN_CHARACTER', message: `Personaje desconocido: ${characterId}`, line: lineNumber, sceneId: currentScene.id });
      }
      const count = (cueCounters.get(currentScene.id) || 0) + 1;
      cueCounters.set(currentScene.id, count);
      const cue: DialogueCue = {
        kind: 'dialogue',
        id: `${currentScene.id}-C${String(count).padStart(3, '0')}`,
        sceneId: currentScene.id,
        characterId,
        lines: [],
        line: lineNumber,
      };
      openDialogue = cue;
      currentScene.cues.push(cue);
      allCues.push(cue);
      previousBlack = false;
      continue;
    }

    if (openDialogue) {
      openDialogue.lines.push(line);
      continue;
    }

    if (trimmed) {
      messages.push({ severity: 'error', code: 'TEXT_OUTSIDE_CHARACTER', message: 'El texto de diálogo debe aparecer después de un personaje.', line: lineNumber, sceneId: currentScene.id });
    }
  }
  closeDialogue();

  for (const scene of scenes) {
    if (!scene.cues.length) {
      messages.push({ severity: 'warning', code: 'EMPTY_SCENE', message: `La escena ${scene.id} no tiene cues.`, line: scene.startLine, sceneId: scene.id });
    }
  }
  if (allCues.length > 10_000) {
    messages.push({ severity: 'error', code: 'TOO_MANY_CUES', message: 'El libreto supera el límite de 10.000 cues.' });
  }
  return { scenes, cues: allCues, messages };
}
