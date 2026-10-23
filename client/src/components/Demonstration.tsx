import { useEffect, useRef, useState } from 'react';
import type { AnimationAsset } from '../types';

const speeds = [0.5, 1, 1.5] as const;

type CueSections = {
  setup: string;
  steps: string[];
  breathing: string;
  mistakes: string;
};

function splitCues(instructions: string): CueSections | null {
  const match =
    /^Setup: ([\s\S]*?)\n((?:\d+\. .*(?:\n|$))+)Breathing: ([\s\S]*?)\nCommon mistakes: ([\s\S]*)$/.exec(
      instructions.trim(),
    );
  if (!match) {
    return null;
  }
  const steps = match[2]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+\.\s*/, ''));
  if (steps.length === 0 || !match[1].trim() || !match[3].trim() || !match[4].trim()) {
    return null;
  }
  return {
    setup: match[1].trim(),
    steps,
    breathing: match[3].trim(),
    mistakes: match[4].trim(),
  };
}

function approvedVideo(animations: AnimationAsset[] | undefined) {
  return animations?.find((asset) => asset.format === 'video') ?? null;
}

export function Demonstration({
  instructions,
  animations,
}: {
  instructions: string;
  animations?: AnimationAsset[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = approvedVideo(animations);
  const [failed, setFailed] = useState(false);
  const [speed, setSpeed] = useState<(typeof speeds)[number]>(1);
  const cues = splitCues(instructions);

  useEffect(() => {
    setFailed(false);
    setSpeed(1);
  }, [video?.assetUrl]);

  function play() {
    void videoRef.current?.play().catch(() => setFailed(true));
  }

  function pause() {
    videoRef.current?.pause();
  }

  function replay() {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    element.currentTime = 0;
    void element.play().catch(() => setFailed(true));
  }

  function chooseSpeed(next: (typeof speeds)[number]) {
    setSpeed(next);
    if (videoRef.current) {
      videoRef.current.playbackRate = next;
    }
  }

  return (
    <div className="mt-3">
      {video && !failed ? (
        <div className="mb-4">
          <video
            ref={videoRef}
            src={video.assetUrl}
            playsInline
            preload="metadata"
            aria-label="Exercise demonstration"
            onError={() => setFailed(true)}
            className="w-full rounded-xl bg-paper"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={play}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent"
            >
              Play
            </button>
            <button
              type="button"
              onClick={pause}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={replay}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold"
            >
              Replay
            </button>
            {speeds.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={speed === option}
                onClick={() => chooseSpeed(option)}
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold"
              >
                {option}x
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Original illustration of the movement. This is not filmed footage.
          </p>
        </div>
      ) : null}
      {cues ? (
        <div className="space-y-4">
          <section>
            <h3 className="font-display text-xl font-semibold">Setup</h3>
            <p className="mt-2 leading-7">{cues.setup}</p>
          </section>
          <section>
            <h3 className="font-display text-xl font-semibold">Execution</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 leading-7">
              {cues.steps.map((step, index) => (
                <li key={`${index}-${step}`}>{step}</li>
              ))}
            </ol>
          </section>
          <section>
            <h3 className="font-display text-xl font-semibold">Breathing</h3>
            <p className="mt-2 leading-7">{cues.breathing}</p>
          </section>
          <section>
            <h3 className="font-display text-xl font-semibold">Common mistakes</h3>
            <p className="mt-2 leading-7">{cues.mistakes}</p>
          </section>
        </div>
      ) : (
        <p className="whitespace-pre-line leading-7">{instructions}</p>
      )}
    </div>
  );
}
