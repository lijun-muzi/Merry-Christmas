import { useEffect, useMemo, useRef, useState } from 'react';

type Track = {
  name: string;
  src: string;
};

type StoredState = {
  name: string;
  time: number;
};

const STORAGE_KEY = 'merry-music-state';

function formatTrackName(path: string) {
  const filename = path.split('/').pop() ?? path;
  const decoded = decodeURIComponent(filename);
  return decoded.replace(/\.[^/.]+$/, '');
}

export default function MusicPlayer() {
  const tracks = useMemo<Track[]>(() => {
    const modules = import.meta.glob('/mp3/*.mp3', { eager: true, import: 'default' }) as Record<string, string>;
    const preferredOrder = [
      'Matt吕彦良 - 小心温差',
      '陶喆 - 飞机场的10_30',
      '才二十三 - 方大同',
    ];
    const allTracks = Object.entries(modules).map(([path, src]) => ({ name: formatTrackName(path), src }));
    const ordered = preferredOrder
      .map((name) => allTracks.find((track) => track.name === name))
      .filter((track): track is Track => Boolean(track));
    const remaining = allTracks
      .filter((track) => !preferredOrder.includes(track.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    return [...ordered, ...remaining];
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeRef = useRef<StoredState | null>(null);
  const lastSavedTimeRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (tracks.length === 0) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredState;
        const index = tracks.findIndex((track) => track.name === parsed.name);
        if (index >= 0 && Number.isFinite(parsed.time)) {
          setCurrentIndex(index);
          setCurrentTime(Math.max(0, parsed.time));
          resumeRef.current = { name: parsed.name, time: Math.max(0, parsed.time) };
        }
      }
    } catch {
      // ignore storage failures
    }
    setIsReady(true);
  }, [tracks]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0.7;
    }
    const audio = audioRef.current;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const shouldSave = Math.abs(audio.currentTime - lastSavedTimeRef.current) >= 1;
      if (!shouldSave || tracks.length === 0) return;
      lastSavedTimeRef.current = audio.currentTime;
      const currentTrack = tracks[currentIndex];
      if (!currentTrack) return;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ name: currentTrack.name, time: audio.currentTime })
        );
      } catch {
        // ignore storage failures
      }
    };
    const handleEnded = () => {
      setCurrentIndex((prev) => (prev + 1) % tracks.length);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [tracks.length, tracks, currentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0 || !isReady) return;
    audio.src = tracks[currentIndex].src;
    audio.currentTime = 0;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    lastSavedTimeRef.current = 0;
    const applyResume = () => {
      const resume = resumeRef.current;
      if (!resume || resume.name !== tracks[currentIndex].name || resume.time <= 0) return;
      const safeTime = Math.min(resume.time, Math.max(0, (audio.duration || resume.time) - 0.25));
      audio.currentTime = safeTime;
      setCurrentTime(safeTime);
      resumeRef.current = null;
    };
    const handleLoadedMeta = () => {
      setDuration(audio.duration || 0);
      applyResume();
    };
    const handleCanPlay = () => {
      applyResume();
      if (isPlayingRef.current) {
        audio.play().catch(() => setIsPlaying(false));
      }
    };
    audio.addEventListener('loadedmetadata', handleLoadedMeta, { once: true });
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    if (isPlayingRef.current) {
      audio.play().catch(() => setIsPlaying(false));
    }
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMeta);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentIndex, tracks, isReady]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, isReady]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;
    const handleVisibility = () => {
      const currentTrack = tracks[currentIndex];
      if (!currentTrack) return;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ name: currentTrack.name, time: audio.currentTime })
        );
      } catch {
        // ignore storage failures
      }
    };
    window.addEventListener('beforeunload', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tracks, currentIndex]);

  if (tracks.length === 0) return null;
  const currentTrack = tracks[currentIndex];

  return (
    <div className="music-player">
      <div className="music-track" title={currentTrack.name}>
        {currentTrack.name}
      </div>
      <div className="music-controls">
        <button
          className="music-button"
          type="button"
          aria-label="上一首"
          onClick={() => {
            setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
          }}
        >
          ⏮
        </button>
        <button
          className="music-button"
          type="button"
          aria-label={isPlaying ? '暂停' : '播放'}
          onClick={() => {
            setIsPlaying((prev) => !prev);
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          className="music-button"
          type="button"
          aria-label="下一首"
          onClick={() => {
            setCurrentIndex((prev) => (prev + 1) % tracks.length);
          }}
        >
          ⏭
        </button>
        <input
          className="music-range"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(event) => {
            const value = Number(event.target.value);
            setCurrentTime(value);
            if (audioRef.current) {
              audioRef.current.currentTime = value;
            }
            const currentTrack = tracks[currentIndex];
            if (!currentTrack) return;
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ name: currentTrack.name, time: value })
              );
            } catch {
              // ignore storage failures
            }
          }}
        />
      </div>
    </div>
  );
}
