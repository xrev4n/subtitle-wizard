/**
 * Subtitle Timing & Editing Utilities
 * In-memory manipulation, integrity diagnostics, splitting, merging and shifts.
 */

import { msToTime, timeToMs } from './srtParser';

/**
 * Shifts timestamps of subtitles by offsetMs across specified scope.
 * Clamps timestamps to 00:00:00,000.
 *
 * @param {Array<object>} subtitles 
 * @param {number} offsetMs - positive or negative milliseconds (e.g. +500 or -1000)
 * @param {object} options
 * @param {'all' | 'fromSelected' | 'selectedOnly'} [options.targetRange='all']
 * @param {number} [options.fromId] - Subtitle ID when scope is 'fromSelected'
 * @param {Array<number>} [options.selectedIds=[]] - Subtitle IDs when scope is 'selectedOnly'
 * @returns {Array<object>}
 */
export function shiftTimestamps(subtitles, offsetMs, options = {}) {
  if (!Array.isArray(subtitles) || subtitles.length === 0 || typeof offsetMs !== 'number') {
    return subtitles;
  }

  const targetRange = options.targetRange || 'all';
  const fromId = options.fromId;
  const selectedIds = new Set(options.selectedIds || []);

  return subtitles.map((sub) => {
    let shouldShift = false;

    if (targetRange === 'all') {
      shouldShift = true;
    } else if (targetRange === 'fromSelected' && fromId !== undefined) {
      shouldShift = sub.id >= fromId;
    } else if (targetRange === 'selectedOnly') {
      shouldShift = selectedIds.has(sub.id);
    }

    if (!shouldShift) {
      return sub;
    }

    const newStartMs = Math.max(0, sub.startMs + offsetMs);
    const newEndMs = Math.max(newStartMs + 100, sub.endMs + offsetMs);

    return {
      ...sub,
      startMs: newStartMs,
      endMs: newEndMs,
      startTime: msToTime(newStartMs),
      endTime: msToTime(newEndMs),
      status: sub.status === 'pending' ? 'pending' : 'editing',
    };
  });
}

/**
 * Validates temporal integrity and detects overlaps, invalid durations, and empty cues.
 *
 * @param {Array<object>} subtitles 
 * @returns {{
 *   totalIssues: number,
 *   overlapCount: number,
 *   durationErrorCount: number,
 *   emptyCount: number,
 *   issuesByCueId: Record<number, Array<{ type: string, message: string, deltaMs?: number }>>
 * }}
 */
export function validateSubtitleIntegrity(subtitles) {
  const result = {
    totalIssues: 0,
    overlapCount: 0,
    durationErrorCount: 0,
    emptyCount: 0,
    issuesByCueId: {},
  };

  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return result;
  }

  for (let i = 0; i < subtitles.length; i++) {
    const cue = subtitles[i];
    const issues = [];

    // 1. Check overlap with preceding cue
    if (i > 0) {
      const prevCue = subtitles[i - 1];
      if (cue.startMs < prevCue.endMs) {
        const deltaMs = prevCue.endMs - cue.startMs;
        issues.push({
          type: 'overlap',
          message: `Solapamiento de ${deltaMs}ms con el bloque anterior (#${prevCue.id})`,
          deltaMs,
        });
        result.overlapCount++;
      }
    }

    // 2. Check duration
    const cueDuration = cue.endMs - cue.startMs;
    if (cue.endMs <= cue.startMs || cueDuration < 100) {
      issues.push({
        type: 'duration',
        message: 'Duración inválida: debe ser de al menos 100ms',
        durationMs: cueDuration,
      });
      result.durationErrorCount++;
    }

    // 3. Check empty text
    const hasSource = Boolean(cue.sourceText && cue.sourceText.trim());
    const hasTarget = Boolean(cue.targetText && cue.targetText.trim());
    if (!hasSource && !hasTarget) {
      issues.push({
        type: 'empty',
        message: 'El bloque no tiene contenido de texto',
      });
      result.emptyCount++;
    }

    if (issues.length > 0) {
      result.issuesByCueId[cue.id] = issues;
      result.totalIssues += issues.length;
    }
  }

  return result;
}

/**
 * Splits text approximately in half by line breaks or words.
 */
function splitTextHelper(text) {
  if (!text || typeof text !== 'string') return ['', ''];
  const trimmed = text.trim();
  const lines = trimmed.split('\n');

  if (lines.length >= 2) {
    const mid = Math.ceil(lines.length / 2);
    return [lines.slice(0, mid).join('\n'), lines.slice(mid).join('\n')];
  }

  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  return [trimmed, ''];
}

/**
 * Splits a single subtitle cue into two consecutive cues.
 *
 * @param {Array<object>} subtitles 
 * @param {number} cueId - ID of cue to split
 * @param {number} [splitRatio=0.5] - Position of split (0.1 to 0.9)
 * @returns {Array<object>} updated subtitles with re-indexed IDs
 */
export function splitCueInList(subtitles, cueId, splitRatio = 0.5) {
  const index = subtitles.findIndex((s) => s.id === cueId);
  if (index === -1) return subtitles;

  const targetCue = subtitles[index];
  const totalDuration = Math.max(200, targetCue.endMs - targetCue.startMs);
  const splitMs = targetCue.startMs + Math.round(totalDuration * splitRatio);

  const [sourceA, sourceB] = splitTextHelper(targetCue.sourceText);
  const [targetA, targetB] = splitTextHelper(targetCue.targetText);

  const cueA = {
    ...targetCue,
    endMs: splitMs,
    endTime: msToTime(splitMs),
    sourceText: sourceA,
    targetText: targetA,
    status: 'editing',
  };

  const cueB = {
    ...targetCue,
    startMs: splitMs,
    startTime: msToTime(splitMs),
    sourceText: sourceB,
    targetText: targetB,
    status: 'editing',
  };

  const updated = [
    ...subtitles.slice(0, index),
    cueA,
    cueB,
    ...subtitles.slice(index + 1),
  ];

  // Re-index IDs sequentially
  return updated.map((c, i) => ({ ...c, id: i + 1 }));
}

/**
 * Merges a subtitle cue with its subsequent neighbor.
 *
 * @param {Array<object>} subtitles 
 * @param {number} cueId - ID of first cue to merge with next
 * @returns {Array<object>}
 */
export function mergeWithNextCue(subtitles, cueId) {
  const index = subtitles.findIndex((s) => s.id === cueId);
  if (index === -1 || index >= subtitles.length - 1) {
    return subtitles;
  }

  const cueA = subtitles[index];
  const cueB = subtitles[index + 1];

  const mergedSource = [cueA.sourceText, cueB.sourceText].filter(Boolean).join('\n');
  const mergedTarget = [cueA.targetText, cueB.targetText].filter(Boolean).join('\n');

  const mergedCue = {
    id: cueA.id,
    startMs: cueA.startMs,
    startTime: cueA.startTime,
    endMs: Math.max(cueA.endMs, cueB.endMs),
    endTime: msToTime(Math.max(cueA.endMs, cueB.endMs)),
    sourceText: mergedSource,
    targetText: mergedTarget,
    status: 'editing',
  };

  const updated = [
    ...subtitles.slice(0, index),
    mergedCue,
    ...subtitles.slice(index + 2),
  ];

  return updated.map((c, i) => ({ ...c, id: i + 1 }));
}

/**
 * Inserts a new blank subtitle cue after a given ID.
 *
 * @param {Array<object>} subtitles 
 * @param {number} afterId 
 * @returns {Array<object>}
 */
export function insertCueAfter(subtitles, afterId) {
  const index = subtitles.findIndex((s) => s.id === afterId);
  if (index === -1) return subtitles;

  const current = subtitles[index];
  const next = subtitles[index + 1];

  // Compute sensible start and end ms
  let newStartMs = current.endMs + 50;
  let newEndMs = newStartMs + 2000;

  if (next && next.startMs > newStartMs) {
    newEndMs = Math.min(newStartMs + 2000, next.startMs - 50);
  }

  const newCue = {
    id: afterId + 1,
    startMs: newStartMs,
    endMs: Math.max(newStartMs + 500, newEndMs),
    startTime: msToTime(newStartMs),
    endTime: msToTime(Math.max(newStartMs + 500, newEndMs)),
    sourceText: 'Nuevo subtítulo',
    targetText: '',
    status: 'editing',
  };

  const updated = [
    ...subtitles.slice(0, index + 1),
    newCue,
    ...subtitles.slice(index + 1),
  ];

  return updated.map((c, i) => ({ ...c, id: i + 1 }));
}

/**
 * Deletes a subtitle cue by ID and re-indexes remaining cues.
 *
 * @param {Array<object>} subtitles 
 * @param {number} cueId 
 * @returns {Array<object>}
 */
export function removeCue(subtitles, cueId) {
  const updated = subtitles.filter((s) => s.id !== cueId);
  return updated.map((c, i) => ({ ...c, id: i + 1 }));
}

/**
 * Updates properties of a single cue (with timestamp recalculation if edited).
 *
 * @param {Array<object>} subtitles 
 * @param {number} cueId 
 * @param {object} updates 
 * @returns {Array<object>}
 */
export function updateCueInList(subtitles, cueId, updates) {
  return subtitles.map((sub) => {
    if (sub.id !== cueId) return sub;

    let { startTime, endTime, startMs, endMs, sourceText, targetText, status } = {
      ...sub,
      ...updates,
    };

    // If string timestamps were edited, recalculate startMs/endMs
    if (updates.startTime !== undefined) {
      startMs = timeToMs(updates.startTime);
      startTime = msToTime(startMs);
    }
    if (updates.endTime !== undefined) {
      endMs = timeToMs(updates.endTime);
      endTime = msToTime(endMs);
    }

    return {
      ...sub,
      startTime,
      endTime,
      startMs,
      endMs,
      sourceText: sourceText !== undefined ? sourceText : sub.sourceText,
      targetText: targetText !== undefined ? targetText : sub.targetText,
      status: status || 'editing',
    };
  });
}
