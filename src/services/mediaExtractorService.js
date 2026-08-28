/**
 * Universal Client-Side Subtitle Extraction & Demuxing Service
 * 100% In-Browser binary inspection and extraction for:
 * - Matroska / WebM (.mkv, .webm) via hierarchical EBML demuxing
 * - MP4 / QuickTime (.mp4, .mov, .m4v) via ISO Atom inspection
 * - Standalone conversions (.vtt, .ass, .ssa) to standard .srt
 * Zero server dependencies, pure ArrayBuffer / DataView execution.
 */

import { msToTime } from '../utils/srtParser';

/**
 * @typedef {Object} MediaSubtitleTrack
 * @property {number|string} id - Track number or index
 * @property {string} title - Track name/description
 * @property {string} language - ISO 639-1 / 639-2 language code (e.g. 'spa', 'eng', 'und')
 * @property {string} format - Codec format: 'SRT', 'ASS', 'SSA', 'VTT', 'MOV_TEXT', 'PGS', 'VOBSUB', etc.
 * @property {string} codecId - Raw codec identifier
 * @property {boolean} isBitmap - True if image-based (PGS/VobSub) and cannot be converted to plain text
 * @property {number} [trackNumber] - Internal container track number
 */

// Common media container extensions
export const MEDIA_EXTENSIONS = ['.mkv', '.webm', '.mp4', '.mov', '.m4v', '.mp3', '.wav', '.m4a'];
export const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa'];
export const ALL_SUPPORTED_EXTENSIONS = [...SUBTITLE_EXTENSIONS, ...MEDIA_EXTENSIONS];

/**
 * Checks if a file is a media container (video/audio).
 * @param {File|string} fileOrName 
 * @returns {boolean}
 */
export function isMediaContainer(fileOrName) {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName?.name || '';
  const lower = name.toLowerCase();
  return MEDIA_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Checks if a file is a standalone subtitle format.
 * @param {File|string} fileOrName 
 * @returns {boolean}
 */
export function isStandaloneSubtitle(fileOrName) {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName?.name || '';
  const lower = name.toLowerCase();
  return SUBTITLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Strips formatting tags from ASS/SSA dialogue lines (e.g. {\i1}, {\pos(..)}, etc.)
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeAssText(text) {
  if (!text) return '';
  return text
    .replace(/\{[^}]+\}/g, '') // remove override tags {\...}
    .replace(/\\N/g, '\n')     // replace ASS newline \N
    .replace(/\\n/g, '\n')
    .replace(/\\h/g, ' ')      // replace non-breaking space
    .trim();
}

/**
 * Converts WebVTT string content to canonical SRT format.
 * @param {string} vttText 
 * @returns {string}
 */
export function convertVttToSrt(vttText) {
  if (!vttText || typeof vttText !== 'string') return '';

  const lines = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const srtBlocks = [];
  let blockIndex = 1;
  let i = 0;

  // Skip WEBVTT header and note blocks
  while (i < lines.length && (lines[i].startsWith('WEBVTT') || lines[i].startsWith('NOTE') || lines[i].trim() === '')) {
    if (lines[i].startsWith('NOTE')) {
      while (i < lines.length && lines[i].trim() !== '') i++;
    }
    i++;
  }

  while (i < lines.length) {
    let line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Optional cue identifier before timestamp line
    if (!line.includes('-->') && i + 1 < lines.length && lines[i + 1].includes('-->')) {
      i++;
      line = lines[i].trim();
    }

    if (line.includes('-->')) {
      const timeParts = line.split('-->');
      if (timeParts.length === 2) {
        let start = timeParts[0].trim().split(' ')[0].replace('.', ',');
        let end = timeParts[1].trim().split(' ')[0].replace('.', ',');

        if (start.split(':').length === 2) start = `00:${start}`;
        if (end.split(':').length === 2) end = `00:${end}`;

        i++;
        const textLines = [];
        while (i < lines.length && lines[i].trim() !== '') {
          const cleanLine = lines[i].replace(/<[^>]+>/g, '').trim();
          if (cleanLine) textLines.push(cleanLine);
          i++;
        }

        if (textLines.length > 0) {
          srtBlocks.push(`${blockIndex}\n${start} --> ${end}\n${textLines.join('\n')}`);
          blockIndex++;
        }
      }
    }
    i++;
  }

  return srtBlocks.join('\n\n');
}

/**
 * Converts ASS/SSA text content to canonical SRT format.
 * @param {string} assText 
 * @returns {string}
 */
export function convertAssToSrt(assText) {
  if (!assText || typeof assText !== 'string') return '';

  const lines = assText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const dialogues = [];
  let formatFields = ['Layer', 'Start', 'End', 'Style', 'Name', 'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Format:')) {
      formatFields = trimmed
        .replace(/^Format:\s*/i, '')
        .split(',')
        .map((f) => f.trim().toLowerCase());
    } else if (trimmed.startsWith('Dialogue:')) {
      const rawContent = trimmed.replace(/^Dialogue:\s*/i, '');
      const parts = rawContent.split(',');

      if (parts.length >= formatFields.length) {
        const startIdx = formatFields.indexOf('start');
        const endIdx = formatFields.indexOf('end');
        const textIdx = formatFields.indexOf('text');

        const rawStart = parts[startIdx]?.trim();
        const rawEnd = parts[endIdx]?.trim();
        const rawDialog = parts.slice(textIdx).join(',');

        if (rawStart && rawEnd && rawDialog) {
          const cleanText = sanitizeAssText(rawDialog);
          if (cleanText) {
            const parseAssTime = (t) => {
              const [h, m, sWithMs] = t.split(':');
              const [s, cs] = (sWithMs || '0.0').split('.');
              const ms = parseInt(cs || '0', 10) * 10;
              return parseInt(h || '0', 10) * 3600000 + parseInt(m || '0', 10) * 60000 + parseInt(s || '0', 10) * 1000 + ms;
            };

            const startMs = parseAssTime(rawStart);
            const endMs = parseAssTime(rawEnd);

            dialogues.push({
              startMs,
              endMs,
              text: cleanText,
            });
          }
        }
      }
    }
  }

  dialogues.sort((a, b) => a.startMs - b.startMs);

  return dialogues
    .map((d, idx) => `${idx + 1}\n${msToTime(d.startMs)} --> ${msToTime(d.endMs)}\n${d.text}`)
    .join('\n\n');
}

/* =========================================================================
 * 1. EBML / Matroska / WebM Inspector & Demuxer
 * ========================================================================= */

function readVint(view, offset) {
  if (offset >= view.byteLength) return null;
  const firstByte = view.getUint8(offset);
  if (firstByte === 0) return null;

  let length = 1;
  let mask = 0x80;

  while (length <= 8 && (firstByte & mask) === 0) {
    length++;
    mask >>= 1;
  }

  if (length > 8 || offset + length > view.byteLength) return null;

  let value = firstByte & (~mask);
  for (let i = 1; i < length; i++) {
    value = (value * 256) + view.getUint8(offset + i);
  }

  return { value, length };
}

function readElementId(view, offset) {
  if (offset >= view.byteLength) return null;
  const firstByte = view.getUint8(offset);
  if (firstByte === 0) return null;

  let length = 1;
  let mask = 0x80;

  while (length <= 4 && (firstByte & mask) === 0) {
    length++;
    mask >>= 1;
  }

  if (length > 4 || offset + length > view.byteLength) return null;

  let id = 0;
  for (let i = 0; i < length; i++) {
    id = (id * 256) + view.getUint8(offset + i);
  }

  return { id, length };
}

function readUint(view, offset, size) {
  if (offset + size > view.byteLength) return 0;
  if (size === 1) return view.getUint8(offset);
  if (size === 2) return view.getUint16(offset);
  if (size === 3) return (view.getUint8(offset) << 16) | view.getUint16(offset + 1);
  if (size === 4) return view.getUint32(offset);
  let val = 0;
  for (let i = 0; i < size; i++) val = (val * 256) + view.getUint8(offset + i);
  return val;
}

function findByteSequence(bytes, sequence, start = 0) {
  const max = bytes.length - sequence.length;
  for (let i = start; i <= max; i++) {
    let match = true;
    for (let j = 0; j < sequence.length; j++) {
      if (bytes[i + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Inspects Matroska / WebM EBML Tracks header for embedded subtitle tracks.
 * @param {File} file 
 * @returns {Promise<Array<MediaSubtitleTrack>>}
 */
export async function detectMkvSubtitleTracks(file) {
  const headerSliceSize = Math.min(file.size, 30 * 1024 * 1024);
  const buffer = await file.slice(0, headerSliceSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const tracks = [];
  const textDecoder = new TextDecoder('utf-8');

  // Search for Tracks element sequence: 0x16, 0x54, 0xAE, 0x6B
  const tracksSeq = [0x16, 0x54, 0xAE, 0x6B];
  let tracksPos = findByteSequence(bytes, tracksSeq, 0);

  while (tracksPos !== -1) {
    const elId = readElementId(view, tracksPos);
    if (elId && elId.id === 0x1654AE6B) {
      const tracksOffset = tracksPos + elId.length;
      const elSize = readVint(view, tracksOffset);
      if (elSize) {
        const tracksDataStart = tracksOffset + elSize.length;
        const tracksDataEnd = Math.min(tracksDataStart + elSize.value, view.byteLength);

        let currOffset = tracksDataStart;
        while (currOffset < tracksDataEnd - 4) {
          const entryId = readElementId(view, currOffset);
          if (!entryId) {
            currOffset++;
            continue;
          }

          if (entryId.id === 0xAE) {
            const entrySizeOffset = currOffset + entryId.length;
            const entrySize = readVint(view, entrySizeOffset);
            if (entrySize) {
              const entryStart = entrySizeOffset + entrySize.length;
              const entryEnd = Math.min(entryStart + entrySize.value, tracksDataEnd);

              let trackNum = null;
              let trackType = null;
              let codecId = '';
              let language = 'und';
              let trackName = '';

              let subOffset = entryStart;
              while (subOffset < entryEnd - 2) {
                const subId = readElementId(view, subOffset);
                if (!subId) {
                  subOffset++;
                  continue;
                }

                const subSizeOffset = subOffset + subId.length;
                const subSize = readVint(view, subSizeOffset);
                if (!subSize) {
                  subOffset++;
                  continue;
                }

                const valOffset = subSizeOffset + subSize.length;
                const valLen = subSize.value;

                if (valOffset + valLen <= entryEnd) {
                  if (subId.id === 0xD7) {
                    trackNum = readUint(view, valOffset, valLen);
                  } else if (subId.id === 0x83) {
                    trackType = view.getUint8(valOffset);
                  } else if (subId.id === 0x86) {
                    codecId = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + valOffset, valLen)).replace(/\0/g, '').trim();
                  } else if (subId.id === 0x22B59C || subId.id === 0x22B59D) {
                    language = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + valOffset, valLen)).replace(/\0/g, '').trim();
                  } else if (subId.id === 0x536E) {
                    trackName = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + valOffset, valLen)).replace(/\0/g, '').trim();
                  }
                }

                subOffset = valOffset + valLen;
              }

              const isSubtitle = trackType === 17 || trackType === 0x11 || (codecId && codecId.toUpperCase().startsWith('S_'));

              if (isSubtitle && trackNum !== null) {
                const upperCodec = (codecId || '').toUpperCase();
                let format = 'SRT';
                let isBitmap = false;

                if (upperCodec.includes('ASS')) format = 'ASS';
                else if (upperCodec.includes('SSA')) format = 'SSA';
                else if (upperCodec.includes('WEBVTT') || upperCodec.includes('VTT')) format = 'VTT';
                else if (upperCodec.includes('PGS') || upperCodec.includes('HDMV')) {
                  format = 'PGS';
                  isBitmap = true;
                } else if (upperCodec.includes('VOBSUB')) {
                  format = 'VOBSUB';
                  isBitmap = true;
                }

                if (!tracks.some((t) => t.id === trackNum)) {
                  tracks.push({
                    id: trackNum,
                    trackNumber: trackNum,
                    title: trackName || `Track #${trackNum} (${format})`,
                    language: language || 'und',
                    format,
                    codecId: codecId || format,
                    isBitmap,
                  });
                }
              }

              currOffset = entryEnd;
              continue;
            }
          }

          currOffset++;
        }

        if (tracks.length > 0) return tracks;
      }
    }

    tracksPos = findByteSequence(bytes, tracksSeq, tracksPos + 4);
  }

  return tracks;
}

/**
 * Demuxes subtitle cues from Matroska / WebM clusters across the file.
 * Validates cluster timecodes and extracts Block / SimpleBlock payloads accurately.
 * @param {File} file 
 * @param {number} targetTrackNum 
 * @param {string} format 
 * @returns {Promise<string>}
 */
export async function extractMkvSubtitleTrack(file, targetTrackNum, format) {
  const fileSize = file.size;
  const chunkSize = 32 * 1024 * 1024; // 32MB chunks
  const overlap = 128 * 1024; // 128KB overlap

  let timecodeScale = 1000000;
  const rawCues = [];
  const textDecoder = new TextDecoder('utf-8');

  // 1. Read TimecodeScale from Info element in header
  const headerBuf = await file.slice(0, Math.min(fileSize, 20 * 1024 * 1024)).arrayBuffer();
  const headerBytes = new Uint8Array(headerBuf);
  const headerView = new DataView(headerBuf);

  const tcSeq = [0x2A, 0xD7, 0xB1]; // TimecodeScale
  const tcPos = findByteSequence(headerBytes, tcSeq, 0);
  if (tcPos !== -1 && tcPos < 100000) {
    const elId = readElementId(headerView, tcPos);
    if (elId) {
      const sizeInfo = readVint(headerView, tcPos + elId.length);
      if (sizeInfo) {
        const valOffset = tcPos + elId.length + sizeInfo.length;
        timecodeScale = readUint(headerView, valOffset, sizeInfo.value) || 1000000;
      }
    }
  }

  // 2. Scan Clusters across the file
  const clusterSeq = [0x1F, 0x43, 0xB6, 0x75];
  let fileOffset = 0;

  while (fileOffset < fileSize) {
    const readEnd = Math.min(fileOffset + chunkSize, fileSize);
    const chunkBuf = await file.slice(fileOffset, readEnd).arrayBuffer();
    const chunkBytes = new Uint8Array(chunkBuf);
    const chunkView = new DataView(chunkBuf);

    let clusterPos = findByteSequence(chunkBytes, clusterSeq, 0);

    while (clusterPos !== -1 && clusterPos < chunkBytes.length - 8) {
      const nextClusterPos = findByteSequence(chunkBytes, clusterSeq, clusterPos + 4);
      const clusterEnd = nextClusterPos !== -1 ? nextClusterPos : chunkBytes.length;

      // Verify cluster has 0xE7 Timecode in first 80 bytes
      let clusterTimecode = null;
      const headerSearchEnd = Math.min(clusterPos + 80, clusterEnd);
      let scanHead = clusterPos + 4;

      const cSize = readVint(chunkView, scanHead);
      if (cSize) scanHead += cSize.length;

      while (scanHead < headerSearchEnd - 2) {
        const elId = readElementId(chunkView, scanHead);
        if (elId && elId.id === 0xE7) {
          const sInfo = readVint(chunkView, scanHead + elId.length);
          if (sInfo && sInfo.value >= 1 && sInfo.value <= 8) {
            const valOff = scanHead + elId.length + sInfo.length;
            clusterTimecode = readUint(chunkView, valOff, sInfo.value);
            scanHead = valOff + sInfo.value;
            break;
          }
        }
        scanHead++;
      }

      if (clusterTimecode === null) {
        // False positive cluster signature inside video stream, continue to next match
        clusterPos = findByteSequence(chunkBytes, clusterSeq, clusterPos + 4);
        continue;
      }

      // Iterate through elements in this confirmed cluster
      let blockScan = scanHead;
      while (blockScan < clusterEnd - 4) {
        const elId = readElementId(chunkView, blockScan);
        if (!elId) {
          blockScan++;
          continue;
        }

        const sizeInfo = readVint(chunkView, blockScan + elId.length);
        if (!sizeInfo) {
          blockScan++;
          continue;
        }

        const headerLen = elId.length + sizeInfo.length;
        const dataOffset = blockScan + headerLen;
        const dataSize = sizeInfo.value;

        // BlockGroup (0xA0)
        if (elId.id === 0xA0) {
          let bgOff = dataOffset;
          const bgEnd = Math.min(dataOffset + dataSize, clusterEnd);
          let blockDataOff = null;
          let blockDataSize = null;
          let blockDuration = null;

          while (bgOff < bgEnd - 2) {
            const bgSubId = readElementId(chunkView, bgOff);
            if (!bgSubId) { bgOff++; continue; }
            const bgSubSize = readVint(chunkView, bgOff + bgSubId.length);
            if (!bgSubSize) { bgOff++; continue; }
            const bgValOff = bgOff + bgSubId.length + bgSubSize.length;
            const bgValSize = bgSubSize.value;

            if (bgSubId.id === 0xA1) {
              blockDataOff = bgValOff;
              blockDataSize = bgValSize;
            } else if (bgSubId.id === 0x9B) {
              blockDuration = readUint(chunkView, bgValOff, bgValSize);
            }
            bgOff = bgValOff + bgValSize;
          }

          if (blockDataOff !== null && blockDataSize > 0) {
            parseBlock(chunkView, blockDataOff, blockDataSize, clusterTimecode, timecodeScale, targetTrackNum, blockDuration, rawCues, format, textDecoder);
          }

          blockScan = dataOffset + dataSize;
          continue;
        }

        // SimpleBlock (0xA3)
        if (elId.id === 0xA3) {
          parseBlock(chunkView, dataOffset, dataSize, clusterTimecode, timecodeScale, targetTrackNum, null, rawCues, format, textDecoder);
          blockScan = dataOffset + dataSize;
          continue;
        }

        blockScan = dataOffset + dataSize;
      }

      clusterPos = nextClusterPos;
    }

    fileOffset += chunkSize - overlap;
  }

  if (rawCues.length === 0) {
    throw new Error(`No subtitle cues found for track #${targetTrackNum}. The track may be empty or formatted in an uncompressed image format.`);
  }

  // 3. Sort chronologically by start time
  rawCues.sort((a, b) => a.startMs - b.startMs);

  // 4. Resolve end timestamps and build standard SRT blocks
  const formattedBlocks = [];
  let blockIndex = 1;

  for (let idx = 0; idx < rawCues.length; idx++) {
    const cue = rawCues[idx];
    let endMs = cue.endMs;

    if (!endMs || endMs <= cue.startMs) {
      const nextStart = rawCues[idx + 1]?.startMs;
      if (nextStart && nextStart > cue.startMs && nextStart - cue.startMs < 6000) {
        endMs = Math.max(cue.startMs + 500, nextStart - 50);
      } else {
        endMs = cue.startMs + 3000;
      }
    }

    if (cue.text.trim().length > 0) {
      formattedBlocks.push(
        `${blockIndex}\n${msToTime(cue.startMs)} --> ${msToTime(endMs)}\n${cue.text}`
      );
      blockIndex++;
    }
  }

  return formattedBlocks.join('\n\n');
}

function parseBlock(view, bOffset, bSize, clusterTimecode, tcScale, targetTrack, duration, cues, fmt, decoder) {
  const trackVint = readVint(view, bOffset);
  if (!trackVint) return;

  if (trackVint.value === targetTrack) {
    const trackBytes = trackVint.length;
    if (bOffset + trackBytes + 2 + 1 > view.byteLength) return;

    const relTimecode = view.getInt16(bOffset + trackBytes);
    const headerBytes = trackBytes + 2 + 1; // trackVint + int16 + flags
    const payloadOff = bOffset + headerBytes;
    const payloadLen = bSize - headerBytes;

    if (payloadLen > 0 && payloadOff + payloadLen <= view.byteLength) {
      const scaleMult = (tcScale || 1000000) / 1000000;
      const startMs = Math.max(0, Math.round((clusterTimecode + relTimecode) * scaleMult));
      const endMs = duration ? Math.round(startMs + duration * scaleMult) : null;
      const rawPayload = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + payloadOff, payloadLen)).trim();

      let cleanText = rawPayload;
      if (fmt === 'ASS' || fmt === 'SSA') {
        let commaCount = 0;
        let textIdx = -1;
        for (let i = 0; i < rawPayload.length; i++) {
          if (rawPayload[i] === ',') {
            commaCount++;
            if (commaCount === 8) {
              textIdx = i + 1;
              break;
            }
          }
        }
        if (textIdx !== -1) cleanText = rawPayload.slice(textIdx);
        cleanText = sanitizeAssText(cleanText);
      } else if (fmt === 'VTT') {
        cleanText = cleanText.replace(/<[^>]+>/g, '').trim();
      }

      if (cleanText) {
        const isDuplicate = cues.some((c) => c.startMs === startMs && c.text === cleanText);
        if (!isDuplicate) {
          cues.push({ startMs, endMs, text: cleanText });
        }
      }
    }
  }
}

/* =========================================================================
 * 2. MP4 / MOV / QuickTime Atom Inspector & Demuxer
 * ========================================================================= */

export async function detectMp4SubtitleTracks(file) {
  const headerSliceSize = Math.min(file.size, 20 * 1024 * 1024);
  const buffer = await file.slice(0, headerSliceSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const textDecoder = new TextDecoder('utf-8');
  const tracks = [];

  const moovSeq = [0x6D, 0x6F, 0x6F, 0x76]; // 'moov'
  const moovPos = findByteSequence(bytes, moovSeq, 0);
  if (moovPos === -1 || moovPos < 4) return [];

  const moovStart = moovPos - 4;
  const moovSize = view.getUint32(moovStart);
  const moovEnd = Math.min(moovStart + (moovSize > 0 ? moovSize : 20 * 1024 * 1024), view.byteLength);

  let trakIndex = 1;
  const trakSeq = [0x74, 0x72, 0x61, 0x6B]; // 'trak'
  let trakPos = findByteSequence(bytes, trakSeq, moovStart);

  while (trakPos !== -1 && trakPos < moovEnd - 8) {
    const trakStart = trakPos - 4;
    const trakSize = view.getUint32(trakStart);
    const trakEnd = Math.min(trakStart + (trakSize > 0 ? trakSize : 50000), moovEnd);

    const hdlrSeq = [0x68, 0x64, 0x6C, 0x72]; // 'hdlr'
    const hdlrPos = findByteSequence(bytes, hdlrSeq, trakStart);

    if (hdlrPos !== -1 && hdlrPos < trakEnd) {
      const handlerType = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + hdlrPos + 12, 4));

      if (handlerType === 'sbtl' || handlerType === 'text' || handlerType === 'subt') {
        let codecFormat = 'MOV_TEXT';
        let language = 'und';
        let trackName = '';

        const mdhdSeq = [0x6D, 0x64, 0x68, 0x64]; // 'mdhd'
        const mdhdPos = findByteSequence(bytes, mdhdSeq, trakStart);
        if (mdhdPos !== -1 && mdhdPos < trakEnd) {
          const langCode = view.getUint16(mdhdPos + 20);
          const char1 = String.fromCharCode(((langCode >> 10) & 0x1f) + 0x60);
          const char2 = String.fromCharCode(((langCode >> 5) & 0x1f) + 0x60);
          const char3 = String.fromCharCode((langCode & 0x1f) + 0x60);
          const langStr = `${char1}${char2}${char3}`;
          if (langStr !== '```') language = langStr;
        }

        const stsdSeq = [0x73, 0x74, 0x73, 0x64]; // 'stsd'
        const stsdPos = findByteSequence(bytes, stsdSeq, trakStart);
        if (stsdPos !== -1 && stsdPos < trakEnd) {
          const sampleFormat = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + stsdPos + 16, 4));
          if (sampleFormat === 'wvtt') codecFormat = 'VTT';
          else if (sampleFormat === 'c608') codecFormat = 'CEA-608';
        }

        const nameSeq = [0x6E, 0x61, 0x6D, 0x65]; // 'name'
        const namePos = findByteSequence(bytes, nameSeq, trakStart);
        if (namePos !== -1 && namePos < trakEnd) {
          const nameStr = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + namePos + 4, 32)).replace(/\0/g, '').trim();
          if (nameStr) trackName = nameStr;
        }

        tracks.push({
          id: trakIndex,
          trackNumber: trakIndex,
          title: trackName || `Track #${trakIndex} (${codecFormat})`,
          language,
          format: codecFormat,
          codecId: handlerType || codecFormat,
          isBitmap: false,
        });
      }
    }

    trakIndex++;
    trakPos = findByteSequence(bytes, trakSeq, trakPos + 4);
  }

  return tracks;
}

export async function extractMp4SubtitleTrack(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const textDecoder = new TextDecoder('utf-8');

  let offset = 0;
  const rawCues = [];
  let sampleTimeMs = 0;

  while (offset < view.byteLength - 8) {
    const boxSize = view.getUint32(offset);
    const boxType = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4));

    if (boxSize < 8) break;

    if (boxType === 'mdat') {
      const mdatEnd = Math.min(offset + boxSize, view.byteLength);
      let mdatOffset = offset + 8;

      while (mdatOffset < mdatEnd - 4) {
        const sampleLen = view.getUint16(mdatOffset);
        if (sampleLen > 0 && sampleLen < 500 && mdatOffset + 2 + sampleLen <= mdatEnd) {
          const sampleText = textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + mdatOffset + 2, sampleLen)).trim();
          if (sampleText && !sampleText.includes('\0') && /[\w\s.,!?-]/.test(sampleText)) {
            const startMs = sampleTimeMs;
            const endMs = startMs + 3000;
            rawCues.push({
              startMs,
              endMs,
              text: sampleText,
            });
            sampleTimeMs += 3500;
          }
          mdatOffset += 2 + sampleLen;
        } else {
          mdatOffset += 4;
        }
      }
      break;
    }

    offset += boxSize > 0 ? boxSize : 8;
  }

  if (rawCues.length === 0) {
    throw new Error('No readable timed text samples found in MP4 container.');
  }

  return rawCues
    .map((cue, idx) => `${idx + 1}\n${msToTime(cue.startMs)} --> ${msToTime(cue.endMs)}\n${cue.text}`)
    .join('\n\n');
}

/* =========================================================================
 * 3. Unified Media Subtitle Detection & Extraction API
 * ========================================================================= */

export async function detectSubtitleTracks(file) {
  if (!file) return [];

  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.mkv') || name.endsWith('.webm')) {
      return await detectMkvSubtitleTracks(file);
    }

    if (name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.m4v')) {
      return await detectMp4SubtitleTracks(file);
    }
  } catch (err) {
    console.warn('[MediaExtractor] Error detecting subtitle tracks:', err);
  }

  return [];
}

export async function extractTrackAsSRT(file, track) {
  if (!file) throw new Error('No file provided');

  const name = file.name.toLowerCase();
  const trackNum = typeof track === 'object' ? track.trackNumber || track.id : track;
  const format = typeof track === 'object' ? track.format : 'SRT';

  if (name.endsWith('.mkv') || name.endsWith('.webm')) {
    return await extractMkvSubtitleTrack(file, Number(trackNum), format);
  }

  if (name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.m4v')) {
    return await extractMp4SubtitleTrack(file, trackNum);
  }

  throw new Error(`Unsupported container format for extraction: ${file.name}`);
}

export function convertSubtitleToSRT(rawContent, fileName = '') {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.vtt') || rawContent.startsWith('WEBVTT')) {
    return convertVttToSrt(rawContent);
  }

  if (lower.endsWith('.ass') || lower.endsWith('.ssa') || rawContent.includes('[Script Info]')) {
    return convertAssToSrt(rawContent);
  }

  return rawContent;
}
