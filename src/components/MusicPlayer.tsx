import { useEffect, useMemo, useRef, useState } from 'react';

type Track = {
  name: string;
  src: string;
};

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = 0.7;
    }
    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setCurrentIndex((prev) => (prev + 1) % tracks.length);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;
    audio.src = tracks[currentIndex].src;
    audio.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);
    const handleCanPlay = () => {
      if (isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      }
    };
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentIndex, tracks, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

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
          }}
        />
      </div>
    </div>
  );
}
