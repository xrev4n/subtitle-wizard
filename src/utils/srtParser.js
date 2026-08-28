/**
 * Core SRT Parser and Serializer
 * 100% In-memory, zero server dependency.
 */

/**
 * Converts timestamp string (HH:MM:SS,mmm or HH:MM:SS.mmm) to milliseconds.
 * @param {string} timeStr - e.g. "00:01:23,456"
 * @returns {number} milliseconds
 */
export function timeToMs(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  // Normalize separator (period to comma)
  const normalized = timeStr.trim().replace('.', ',');
  const parts = normalized.split(':');
  
  if (parts.length < 2) return 0;
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let milliseconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    const secParts = parts[2].split(',');
    seconds = parseInt(secParts[0], 10) || 0;
    milliseconds = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10) || 0;
    const secParts = parts[1].split(',');
    seconds = parseInt(secParts[0], 10) || 0;
    milliseconds = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
  }

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

/**
 * Converts milliseconds to canonical SRT timestamp "HH:MM:SS,mmm"
 * @param {number} ms - milliseconds
 * @returns {string} canonical timestamp
 */
export function msToTime(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) {
    return '00:00:00,000';
  }

  const hours = Math.floor(ms / 3600000);
  const remainingAfterHours = ms % 3600000;
  const minutes = Math.floor(remainingAfterHours / 60000);
  const remainingAfterMinutes = remainingAfterHours % 60000;
  const seconds = Math.floor(remainingAfterMinutes / 1000);
  const milliseconds = Math.floor(remainingAfterMinutes % 1000);

  const pad = (n, width = 2) => String(n).padStart(width, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * Formats duration in ms to a friendly human readable string (e.g. "01:25" or "01:14:32")
 * @param {number} ms 
 * @returns {string}
 */
export function formatDuration(ms) {
  if (!ms || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parses raw SRT string content into an array of strictly structured subtitle objects.
 * Handles Windows (\r\n) / Unix (\n) line endings, BOM, multiline cues, and irregular spacing.
 *
 * @param {string} rawText - Raw SRT file content
 * @returns {Array<{
 *   id: number,
 *   startTime: string,
 *   endTime: string,
 *   startMs: number,
 *   endMs: number,
 *   sourceText: string,
 *   targetText: string,
 *   status: 'pending' | 'translated' | 'editing' | 'error'
 * }>}
 */
export function parseSRT(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  // 1. Strip UTF-8 Byte Order Mark (BOM)
  let cleanText = rawText.replace(/^\uFEFF/, '');

  // 2. Normalize Windows (\r\n) and legacy Mac (\r) line breaks to Unix (\n)
  cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Separate blocks by two or more consecutive newlines
  const rawBlocks = cleanText.split(/\n\s*\n+/);
  const subtitles = [];
  let autoId = 1;

  // Regex to match SRT timestamp line: 00:00:01,000 --> 00:00:04,000 (also supporting periods)
  const timestampRegex = /(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/;

  for (const block of rawBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;

    const lines = trimmedBlock.split('\n');
    let timeLineIndex = -1;
    let timeMatch = null;

    // Locate the line containing the timestamp arrow
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(timestampRegex);
      if (match) {
        timeLineIndex = i;
        timeMatch = match;
        break;
      }
    }

    // If no valid timestamp pattern found, skip malformed block
    if (timeLineIndex === -1 || !timeMatch) {
      continue;
    }

    // Extract ID (either the line preceding the timestamp, or autoId)
    let id = autoId;
    if (timeLineIndex > 0) {
      const parsedId = parseInt(lines[timeLineIndex - 1].trim(), 10);
      if (!isNaN(parsedId)) {
        id = parsedId;
      }
    }

    const rawStartTime = timeMatch[1];
    const rawEndTime = timeMatch[2];
    const startMs = timeToMs(rawStartTime);
    const endMs = timeToMs(rawEndTime);

    // Standardize to canonical format HH:MM:SS,mmm
    const startTime = msToTime(startMs);
    const endTime = msToTime(endMs);

    // Text lines are all lines following the timestamp line
    const textLines = lines.slice(timeLineIndex + 1);
    const sourceText = textLines.join('\n').trim();

    subtitles.push({
      id: id,
      startTime: startTime,
      endTime: endTime,
      startMs: startMs,
      endMs: endMs,
      sourceText: sourceText,
      targetText: '',
      status: 'pending',
    });

    autoId = id + 1;
  }

  // Ensure sequential IDs if blocks had duplicate/missing IDs
  return subtitles.map((sub, index) => ({
    ...sub,
    id: index + 1,
  }));
}

/**
 * Serializes an array of subtitle objects back into a valid SRT string.
 * @param {Array<object>} subtitles 
 * @param {boolean} [useTargetText=false] - When true, outputs targetText (falling back to sourceText if empty)
 * @returns {string}
 */
export function serializeSRT(subtitles, useTargetText = false) {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return '';
  }

  return subtitles
    .map((sub, index) => {
      const blockId = index + 1;
      const text = useTargetText && sub.targetText ? sub.targetText : sub.sourceText || '';
      return `${blockId}\n${sub.startTime} --> ${sub.endTime}\n${text}`;
    })
    .join('\n\n') + '\n';
}

/**
 * Calculates aggregate stats from subtitle blocks.
 * @param {Array<object>} subtitles 
 */
export function calculateStats(subtitles) {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return {
      totalBlocks: 0,
      totalDurationMs: 0,
      formattedDuration: '00:00',
      totalCharacters: 0,
      totalWords: 0,
      avgDurationMs: 0,
      formattedAvgDuration: '0.0s',
    };
  }

  let totalDurationMs = 0;
  let totalCharacters = 0;
  let totalWords = 0;

  for (const sub of subtitles) {
    const cueDuration = Math.max(0, sub.endMs - sub.startMs);
    totalDurationMs += cueDuration;

    const text = sub.sourceText || '';
    totalCharacters += text.length;

    const words = text.trim().split(/\s+/).filter(Boolean);
    totalWords += words.length;
  }

  // Total span from first cue start to last cue end
  const firstCue = subtitles[0];
  const lastCue = subtitles[subtitles.length - 1];
  const overallTimelineSpanMs = lastCue ? Math.max(0, lastCue.endMs - (firstCue?.startMs || 0)) : totalDurationMs;

  const avgDurationMs = subtitles.length > 0 ? Math.round(totalDurationMs / subtitles.length) : 0;

  return {
    totalBlocks: subtitles.length,
    totalDurationMs: overallTimelineSpanMs,
    formattedDuration: formatDuration(overallTimelineSpanMs),
    totalCharacters,
    totalWords,
    avgDurationMs,
    formattedAvgDuration: `${(avgDurationMs / 1000).toFixed(1)}s`,
  };
}

/**
 * Sample SRT content for testing and instant preview
 */
export const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,500
Welcome to Subtitle Wizard, your in-browser AI translation suite.

2
00:00:05,000 --> 00:00:08,200
All parsing and processing runs 100% locally in your browser memory.

3
00:00:08,700 --> 00:00:12,400
No external servers, no cloud fees, and absolute privacy for your content.

4
00:00:13,000 --> 00:00:16,800
Multi-line subtitles, custom timing intervals,
and precise millisecond accuracy are fully supported.

5
00:00:17,200 --> 00:00:21,500
Ready to translate your video workflows with lightning speed!`;
