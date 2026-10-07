import { useEffect, useRef, useState } from 'react';

export interface PerfMetrics {
  fps: number;
  targetFps: number;
  isBoostActive: boolean;
  frameDropCount: number;
  avgFrameTimeMs: number;
}

const BOOST_STORAGE_KEY = 'omnichat_experimental_fps_boost';
const BOOST_EVENT = 'omnichat:fps-boost';

function readBoostPreference(): boolean {
  try {
    return localStorage.getItem(BOOST_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useGlobalPerfObserver(initialTargetFps: number = 90) {
  const [targetFps, setTargetFps] = useState(initialTargetFps);
  const [manualBoost, setManualBoost] = useState(readBoostPreference);
  const targetFpsRef = useRef(initialTargetFps);
  const manualBoostRef = useRef(manualBoost);

  useEffect(() => {
    targetFpsRef.current = targetFps;
  }, [targetFps]);

  useEffect(() => {
    manualBoostRef.current = manualBoost;
    try {
      localStorage.setItem(BOOST_STORAGE_KEY, manualBoost ? '1' : '0');
    } catch {}
    window.dispatchEvent(new CustomEvent(BOOST_EVENT, { detail: { enabled: manualBoost } }));
  }, [manualBoost]);

  const [metrics, setMetrics] = useState<PerfMetrics>({
    fps: initialTargetFps,
    targetFps: initialTargetFps,
    isBoostActive: manualBoost,
    frameDropCount: 0,
    avgFrameTimeMs: 1000 / initialTargetFps,
  });

  useEffect(() => {
    let frameCount = 0;
    let sampleStart = performance.now();
    let previousFrame = sampleStart;
    let totalFrameTime = 0;
    let maxFrameDelta = 0;
    let lowFpsCount = 0;
    let highFpsCount = 0;
    let lastAutoBoostTime = 0;
    let rafId = 0;
    let calibratedMaxFps = 0;

    const applyBoost = (enabled: boolean) => {
      document.documentElement.classList.toggle('perf-boost', enabled);
      document.body.classList.toggle('perf-boost', enabled);
    };

    applyBoost(manualBoostRef.current);

    const resetSample = (now: number) => {
      frameCount = 0;
      totalFrameTime = 0;
      maxFrameDelta = 0;
      sampleStart = now;
      previousFrame = now;
    };

    const tick = (now: number) => {
      const frameDelta = now - previousFrame;
      previousFrame = now;

      if (frameDelta > 0 && frameDelta < 1000) {
        frameCount++;
        totalFrameTime += frameDelta;
        maxFrameDelta = Math.max(maxFrameDelta, frameDelta);
      }

      if (now - sampleStart >= 500) {
        const elapsed = now - sampleStart;
        const measuredFps = frameCount > 0 ? Math.round((frameCount * 1000) / elapsed) : 0;
        const currentFps = Math.min(240, measuredFps);
        const avgFrameTime = frameCount > 0 ? totalFrameTime / frameCount : 1000 / Math.max(1, currentFps);

        if (currentFps > calibratedMaxFps) calibratedMaxFps = currentFps;

        const requestedTarget = targetFpsRef.current || 90;
        const displayTarget =
          calibratedMaxFps > 100 ? Math.min(requestedTarget, 120) :
          calibratedMaxFps > 75 ? Math.min(requestedTarget, 90) :
          60;

        const targetFrameTime = 1000 / Math.max(30, displayTarget);
        const lowThreshold = Math.round(displayTarget * 0.78);
        const highThreshold = Math.round(displayTarget * 0.90);
        const severeSpike = maxFrameDelta > Math.max(50, targetFrameTime * 3);
        const lagging = currentFps > 0 && (currentFps < lowThreshold || avgFrameTime > targetFrameTime * 1.35);

        let autoBoost = document.body.classList.contains('perf-boost') && !manualBoostRef.current;

        if (severeSpike || lagging) {
          lowFpsCount++;
          highFpsCount = 0;
          if (!manualBoostRef.current && (severeSpike || lowFpsCount >= 2)) {
            applyBoost(true);
            autoBoost = true;
            lastAutoBoostTime = now;
          }
        } else if (currentFps >= highThreshold && avgFrameTime <= targetFrameTime * 1.1) {
          highFpsCount++;
          lowFpsCount = 0;
          if (!manualBoostRef.current && highFpsCount >= 5 && autoBoost && now - lastAutoBoostTime > 3000) {
            applyBoost(false);
            autoBoost = false;
          }
        }

        const boostActive = manualBoostRef.current || autoBoost;
        setMetrics({
          fps: currentFps || Math.round(1000 / Math.max(1, avgFrameTime)),
          targetFps: displayTarget,
          isBoostActive: boostActive,
          frameDropCount: lowFpsCount,
          avgFrameTimeMs: Math.round(avgFrameTime * 10) / 10,
        });

        resetSample(now);
      }

      rafId = requestAnimationFrame(tick);
    };

    const resetAfterVisibilityChange = () => resetSample(performance.now());
    document.addEventListener('visibilitychange', resetAfterVisibilityChange);
    window.addEventListener('focus', resetAfterVisibilityChange);

    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      try {
        observer = new PerformanceObserver((list) => {
          if (manualBoostRef.current) return;
          const hasLongTask = list.getEntries().some((entry) => entry.duration > 80);
          if (hasLongTask) {
            applyBoost(true);
            lastAutoBoostTime = performance.now();
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch {}
    }

    const onBoostEvent = (event: Event) => {
      const enabled = Boolean((event as CustomEvent).detail?.enabled);
      applyBoost(enabled);
      setMetrics((prev) => ({ ...prev, isBoostActive: enabled || prev.isBoostActive }));
    };
    window.addEventListener(BOOST_EVENT, onBoostEvent);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', resetAfterVisibilityChange);
      window.removeEventListener('focus', resetAfterVisibilityChange);
      window.removeEventListener(BOOST_EVENT, onBoostEvent);
      observer?.disconnect();
      document.documentElement.classList.remove('perf-boost');
      document.body.classList.remove('perf-boost');
    };
  }, []);

  return {
    metrics,
    targetFps,
    setTargetFps,
    experimentalBoost: manualBoost,
    setExperimentalBoost: setManualBoost,
  };
}
