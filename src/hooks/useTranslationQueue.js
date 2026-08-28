import { useState, useRef, useCallback } from 'react';
import { translateBatch } from '../services/translationService';

/**
 * Custom Hook managing the Translation Queue state and lifecycle.
 *
 * @param {object} params
 * @param {Array<object>} params.subtitles - Subtitle array
 * @param {Function} params.setSubtitles - Subtitle state updater
 * @param {object} params.settings - LLM settings
 */
export function useTranslationQueue({ subtitles, setSubtitles, settings }) {
  const [queueStatus, setQueueStatus] = useState('idle'); // 'idle' | 'translating' | 'paused' | 'completed' | 'error'
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [speed, setSpeed] = useState(0); // cues per second
  const [etaSeconds, setEtaSeconds] = useState(0);

  const abortControllerRef = useRef(null);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const startTimeRef = useRef(0);
  const translatedSoFarRef = useRef(0);

  // Helper to chunk an array into batchSize subarrays
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  /**
   * Internal queue execution loop.
   */
  const processQueue = useCallback(
    async (targetCues) => {
      if (!targetCues || targetCues.length === 0) {
        setQueueStatus('completed');
        return;
      }

      const batchSize = Math.max(1, settings.batchSize || 10);
      const batches = chunkArray(targetCues, batchSize);

      setTotalBatches(batches.length);
      setCurrentBatchIndex(0);
      setQueueStatus('translating');
      isPausedRef.current = false;
      isCancelledRef.current = false;
      startTimeRef.current = performance.now();
      translatedSoFarRef.current = 0;

      for (let i = 0; i < batches.length; i++) {
        // Check for cancellation
        if (isCancelledRef.current) {
          setQueueStatus('idle');
          return;
        }

        // Check for pause
        if (isPausedRef.current) {
          setQueueStatus('paused');
          return;
        }

        const batch = batches[i];
        setCurrentBatchIndex(i + 1);

        // Mark current batch cues as 'translating'
        const batchIds = new Set(batch.map((c) => c.id));
        setSubtitles((prev) =>
          prev.map((c) => (batchIds.has(c.id) ? { ...c, status: 'translating' } : c))
        );

        abortControllerRef.current = new AbortController();

        const result = await translateBatch({
          cues: batch,
          sourceLang,
          targetLang,
          settings,
          signal: abortControllerRef.current.signal,
        });

        if (isCancelledRef.current) {
          // Revert translating cues to pending
          setSubtitles((prev) =>
            prev.map((c) => (c.status === 'translating' ? { ...c, status: 'pending' } : c))
          );
          setQueueStatus('idle');
          return;
        }

        if (result.ok && result.translations) {
          const translationsMap = result.translations;
          let successfulCount = 0;
          setSubtitles((prev) =>
            prev.map((c) => {
              if (batchIds.has(c.id)) {
                const translatedText = translationsMap[c.id];
                if (translatedText !== undefined && translatedText.length > 0) {
                  successfulCount++;
                  return {
                    ...c,
                    targetText: translatedText,
                    status: 'translated',
                  };
                } else {
                  return { ...c, status: 'error' };
                }
              }
              return c;
            })
          );
          translatedSoFarRef.current += successfulCount;
        } else {
          // Mark batch as error
          setSubtitles((prev) =>
            prev.map((c) => (batchIds.has(c.id) ? { ...c, status: 'error' } : c))
          );
        }

        // Compute performance telemetry (Speed & ETA)
        const elapsedSec = (performance.now() - startTimeRef.current) / 1000;
        if (elapsedSec > 0 && translatedSoFarRef.current > 0) {
          const currentSpeed = parseFloat((translatedSoFarRef.current / elapsedSec).toFixed(1));
          setSpeed(currentSpeed);

          const remainingCues = targetCues.length - translatedSoFarRef.current;
          const remainingTime = currentSpeed > 0 ? Math.round(remainingCues / currentSpeed) : 0;
          setEtaSeconds(Math.max(0, remainingTime));
        }
      }

      setQueueStatus('completed');
      setSpeed(0);
      setEtaSeconds(0);
    },
    [settings, sourceLang, targetLang, setSubtitles]
  );

  /**
   * Start translation for all pending or all cues.
   */
  const startTranslation = useCallback(() => {
    if (!subtitles || subtitles.length === 0) return;
    const pendingCues = subtitles.filter((s) => s.status !== 'translated');
    const cuesToTranslate = pendingCues.length > 0 ? pendingCues : subtitles;
    processQueue(cuesToTranslate);
  }, [subtitles, processQueue]);

  /**
   * Pause the active queue at batch boundary.
   */
  const pauseTranslation = useCallback(() => {
    isPausedRef.current = true;
    setQueueStatus('paused');
  }, []);

  /**
   * Resume paused translation.
   */
  const resumeTranslation = useCallback(() => {
    isPausedRef.current = false;
    const remainingCues = subtitles.filter((s) => s.status !== 'translated');
    processQueue(remainingCues);
  }, [subtitles, processQueue]);

  /**
   * Cancel and abort active translation.
   */
  const cancelTranslation = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    abortControllerRef.current?.abort();

    setSubtitles((prev) =>
      prev.map((c) => (c.status === 'translating' ? { ...c, status: 'pending' } : c))
    );

    setQueueStatus('idle');
    setSpeed(0);
    setEtaSeconds(0);
  }, [setSubtitles]);

  /**
   * Retry all cues that ended in error status.
   */
  const retryFailedCues = useCallback(() => {
    const errorCues = subtitles.filter((s) => s.status === 'error');
    if (errorCues.length > 0) {
      processQueue(errorCues);
    }
  }, [subtitles, processQueue]);

  /**
   * Retry a single cue by ID.
   */
  const retrySingleCue = useCallback(
    async (cueId) => {
      const cue = subtitles.find((s) => s.id === cueId);
      if (!cue) return;

      setSubtitles((prev) =>
        prev.map((c) => (c.id === cueId ? { ...c, status: 'translating' } : c))
      );

      const controller = new AbortController();
      const result = await translateBatch({
        cues: [cue],
        sourceLang,
        targetLang,
        settings,
        signal: controller.signal,
      });

      if (result.ok && result.translations && result.translations[cueId]) {
        setSubtitles((prev) =>
          prev.map((c) =>
            c.id === cueId
              ? { ...c, targetText: result.translations[cueId], status: 'translated' }
              : c
          )
        );
      } else {
        setSubtitles((prev) =>
          prev.map((c) => (c.id === cueId ? { ...c, status: 'error' } : c))
        );
      }
    },
    [subtitles, sourceLang, targetLang, settings, setSubtitles]
  );

  // Compute aggregate counts
  const totalCues = subtitles?.length || 0;
  const translatedCount = subtitles?.filter((s) => s.status === 'translated').length || 0;
  const errorCount = subtitles?.filter((s) => s.status === 'error').length || 0;
  const pendingCount = subtitles?.filter((s) => s.status === 'pending').length || 0;
  const progressPercent = totalCues > 0 ? Math.round((translatedCount / totalCues) * 100) : 0;

  return {
    queueStatus,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    currentBatchIndex,
    totalBatches,
    speed,
    etaSeconds,
    progressPercent,
    totalCues,
    translatedCount,
    errorCount,
    pendingCount,
    startTranslation,
    pauseTranslation,
    resumeTranslation,
    cancelTranslation,
    retryFailedCues,
    retrySingleCue,
  };
}
