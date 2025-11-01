import React, { useState, useRef, useEffect } from 'react';
import { TimedLyric } from '../types';
import KaraokeLyric from './KaraokeLyric';
import TurntableLyrics from './TurntableLyrics';
import { ColorPalette, lyricColorPalettes } from '../styles/colors';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import PrevIcon from './icons/PrevIcon';
import AlignLeftIcon from './icons/AlignLeftIcon';
import AlignRightIcon from './icons/AlignRightIcon';
import PanIcon from './icons/PanIcon';
import VerticalLinesIcon from './icons/VerticalLinesIcon';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';
import ExportIcon from './icons/ExportIcon';
import VerticalLayoutIcon from './icons/VerticalLayoutIcon';
import DiscIcon from './icons/DiscIcon';

interface VideoPlayerProps {
  timedLyrics: TimedLyric[];
  audioUrl: string;
  imageUrls: string[];
  videoUrl: string | null;
  onBack: () => void;
  songTitle: string;
  artistName:string;
}

type LyricAlignment = 'items-start text-left' | 'items-center text-center' | 'items-end text-right';
type VisualEffect = 'none' | 'subtle-pan' | 'rain';
type LyricStyle = 'karaoke' | 'vertical' | 'turntable';

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  timedLyrics,
  audioUrl,
  imageUrls,
  videoUrl,
  onBack,
  songTitle,
  artistName,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [colorPalette, setColorPalette] = useState<ColorPalette>(lyricColorPalettes[0]);
  const [fontSize, setFontSize] = useState(2.5);
  const [alignment, setAlignment] = useState<LyricAlignment>('items-center text-center');
  const [effect, setEffect] = useState<VisualEffect>('subtle-pan');
  const [showControls, setShowControls] = useState(true);
  const [lyricStyle, setLyricStyle] = useState<LyricStyle>('vertical');
  const [isExporting, setIsExporting] = useState(false);
  const [inExportMode, setInExportMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const activeLyricIndex = timedLyrics.findIndex(
    lyric => currentTime >= lyric.startTime && currentTime < lyric.endTime
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
        setIsPlaying(false);
        if (inExportMode && document.fullscreenElement) {
            document.exitFullscreen();
        }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [inExportMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
        if (document.fullscreenElement === playerContainerRef.current) {
            // Entered fullscreen for export
            setInExportMode(true);
            setIsExporting(false); // Close modal
            
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
                setIsPlaying(false);
            }
            
            let count = 5;
            setCountdown(count);
            
            const countdownInterval = setInterval(() => {
                count -= 1;
                if (count > 0) {
                    setCountdown(count);
                } else {
                    clearInterval(countdownInterval);
                    setCountdown(null);
                    handlePlayPause(); 
                }
            }, 1000);
        } else {
            // Exited fullscreen
            setInExportMode(false);
            setCountdown(null);
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  useEffect(() => {
    // Sync video playback with audio
    const video = videoRef.current;
    if (!video || !audioRef.current) return;
    if (isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
    // Sync time
    if (Math.abs(video.currentTime - audioRef.current.currentTime) > 0.5) {
      video.currentTime = audioRef.current.currentTime;
    }
  }, [isPlaying, currentTime]);

  useEffect(() => {
    if (imageUrls.length <= 1 || !isPlaying) return;
    const imageChangeInterval = 10000; // Change image every 10 seconds
    const intervalId = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % imageUrls.length);
    }, imageChangeInterval);
    return () => clearInterval(intervalId);
  }, [isPlaying, imageUrls.length]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  
  const handleEnterExportMode = () => {
    if (playerContainerRef.current) {
        playerContainerRef.current.requestFullscreen().catch(err => {
            alert(`無法進入全螢幕模式: ${err.message}`);
        });
    }
  };


  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return isNaN(minutes) || isNaN(secs) ? '0:00' : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLyrics = () => {
    if (activeLyricIndex === -1 && lyricStyle === 'karaoke') return null;

    switch (lyricStyle) {
        case 'turntable':
            return <TurntableLyrics timedLyrics={timedLyrics} activeIndex={activeLyricIndex} colorPalette={colorPalette} isPlaying={isPlaying} />;

        case 'vertical': {
            const line_height_rem = fontSize * 1.6;
            const targetIndex = activeLyricIndex === -1 ? 0 : activeLyricIndex;
            const transformY = ((timedLyrics.length - 1) / 2 - targetIndex) * line_height_rem;
            
            return (
                <div className="h-[60vh] w-full flex flex-col justify-center overflow-hidden">
                    <div 
                        style={{ 
                            transform: `translateY(${transformY}rem)`,
                            transition: 'transform 0.8s cubic-bezier(0.65, 0, 0.35, 1)',
                        }}
                    >
                        {timedLyrics.map((lyric, index) => {
                             const isActive = index === activeLyricIndex;
                             const distance = Math.abs(index - targetIndex);
                             
                             const opacity = isActive ? 1 : Math.max(0.15, 0.7 - distance * 0.15);
                             const scale = isActive ? 1 : 0.9;
                             const blur = isActive ? 0 : Math.min(4, distance * 0.75);

                             const textStyle: React.CSSProperties = {
                                color: isActive ? colorPalette.highlight : colorPalette.base,
                                fontWeight: isActive ? 'bold' : 'normal',
                                opacity: opacity,
                                transform: `scale(${scale})`,
                                filter: `blur(${blur}px)`,
                                fontSize: `${fontSize * (isActive ? 1.15 : 1)}rem`,
                                lineHeight: `${line_height_rem}rem`,
                                transition: 'all 0.8s cubic-bezier(0.65, 0, 0.35, 1)',
                                textShadow: isActive ? `0 0 10px ${colorPalette.highlight}` : 'none',
                             };
                             return (
                                <div key={index} className="relative py-1">
                                    <p style={textStyle}>{lyric.text}</p>
                                    <div 
                                        className="absolute bottom-0 h-[3px] bg-cyan-300 rounded-full left-1/2 -translate-x-1/2"
                                        style={{
                                            boxShadow: '0 0 6px #0891b2, 0 0 12px #0891b2',
                                            width: isActive ? '100%' : '0%',
                                            opacity: isActive ? 1 : 0,
                                            transition: 'width 0.7s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease-in-out'
                                        }}
                                    />
                                </div>
                             );
                        })}
                    </div>
                </div>
            )
        }

        case 'karaoke':
        default: {
            if (activeLyricIndex === -1) return null;
            const lyricWindow = 2; // Show 2 lines of context before and after
            const start = Math.max(0, activeLyricIndex - lyricWindow);
            const end = Math.min(timedLyrics.length, activeLyricIndex + lyricWindow + 1);

            return timedLyrics.slice(start, end).map((lyric, index) => {
            const globalIndex = start + index;
            const isActive = globalIndex === activeLyricIndex;
            const isPast = globalIndex < activeLyricIndex;

            let opacity = 0.3;
            if (isActive) opacity = 1;
            
            const textStyle: React.CSSProperties = {
                opacity: opacity,
                color: isPast ? colorPalette.highlight : colorPalette.base,
                transition: 'opacity 0.3s ease, color 0.3s ease, font-size 0.3s ease, font-weight 0.3s ease',
                fontWeight: isActive ? 'bold' : 'normal',
                fontSize: `${fontSize * (isActive ? 1 : 0.8)}rem`,
                lineHeight: 1.2,
            };

            if (isActive) {
                return (
                <KaraokeLyric
                    key={`${lyric.startTime}-${lyric.text}`}
                    text={lyric.text}
                    startTime={lyric.startTime}
                    endTime={lyric.endTime}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    colorPalette={colorPalette}
                    style={{...textStyle, fontSize: `${fontSize}rem`}}
                />
                );
            } else {
                return <p key={`${lyric.startTime}-${lyric.text}`} style={textStyle}>{lyric.text}</p>;
            }
            });
        }
    }
  };

  const backgroundImageUrl = imageUrls[currentImageIndex] || '';

  return (
    <div ref={playerContainerRef} className={`w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden relative font-sans ${inExportMode && countdown === null ? 'cursor-none' : ''}`}>
      {/* Background */}
      <div className="absolute inset-0 w-full h-full">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-cover bg-center transition-all duration-1000 ${effect === 'subtle-pan' ? 'animate-subtle-pan' : ''}`}
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        {effect === 'rain' && <div className="absolute inset-0 bg-rain-effect opacity-30"></div>}
      </div>
      
      {/* Export Modal */}
      {isExporting && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-lg flex flex-col items-center justify-center z-50 text-white p-4">
              <div className="w-full max-w-lg text-center bg-gray-800/50 p-8 rounded-xl border border-gray-700">
                  <h2 className="text-2xl font-bold mb-2">手工打包 MV (螢幕錄製)</h2>
                  <p className="text-gray-400 mb-6">我們將引導您完成螢幕錄製，請跟隨以下步驟。</p>
                  <div className="text-left space-y-3 text-gray-300 bg-gray-900/50 p-4 rounded-md">
                      <p>1. 點擊下方按鈕，我們將進入全螢幕模式。</p>
                      <p>2. 螢幕變黑後，您有 <strong className="text-cyan-300">5 秒</strong> 時間開啟您電腦的錄製功能 (e.g. <kbd>Win+G</kbd> 或 <kbd>Cmd+Shift+5</kbd>)。</p>
                      <p>3. 倒數結束後，MV 將 <strong className="text-cyan-300">自動從頭播放</strong>。</p>
                      <p>4. 播放完畢會 <strong className="text-cyan-300">自動退出全螢幕</strong>。此時即可停止錄製並儲存影片！</p>
                  </div>
                  <div className="mt-8 flex justify-center gap-4">
                      <button onClick={() => setIsExporting(false)} className="px-6 py-2 text-sm font-semibold text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg transition-colors">
                          取消
                      </button>
                      <button onClick={handleEnterExportMode} className="px-6 py-2 text-sm font-bold text-gray-900 bg-[#a6a6a6] hover:bg-[#999999] rounded-lg transition-colors">
                          準備錄製
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Countdown Overlay */}
      {inExportMode && countdown !== null && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 text-white">
            <p className="text-2xl mb-4">準備開始錄影...</p>
            <p className="text-9xl font-bold" style={{ animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}>{countdown}</p>
        </div>
      )}

      {/* Main UI Overlay */}
      <div className={`relative z-10 w-full h-full flex flex-col p-4 sm:p-8 transition-opacity duration-300 ${inExportMode ? 'opacity-0 pointer-events-none' : (showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-within:opacity-100')}`}>
        <header className="flex-shrink-0 flex items-center justify-between w-full">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-black/30 hover:bg-black/50 border border-white/20 rounded-lg transition-colors">
            <PrevIcon className="w-5 h-5" />
            返回
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsExporting(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-500/30 hover:bg-blue-500/50 border border-blue-400/30 rounded-lg transition-colors">
                <ExportIcon className="w-5 h-5" />
                匯出 MV
            </button>
             {lyricStyle !== 'vertical' && (
              <div className="text-right">
                  <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{songTitle}</h1>
                  <p className="text-sm sm:text-md text-gray-300 drop-shadow-md">{artistName}</p>
              </div>
             )}
          </div>
        </header>
        
        {/* Lyrics Container */}
        <div className="flex-grow flex items-center justify-center overflow-hidden">
            {lyricStyle === 'vertical' ? (
              <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center px-4 h-full">
                  <div className={`flex flex-col h-full justify-center ${alignment}`}>
                      {renderLyrics()}
                  </div>
                  <div className="hidden md:flex flex-col items-center text-center">
                      {imageUrls[0] && (
                          <img 
                              src={imageUrls[0]} 
                              alt="Album Art" 
                              className="w-64 h-64 lg:w-80 lg:h-80 object-cover rounded-2xl shadow-2xl mb-8 border-4 border-white/10"
                          />
                      )}
                      <div className="relative w-full max-w-sm px-4">
                          <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-wide">{songTitle}</h2>
                          <p className="text-xl lg:text-2xl text-gray-300 mt-2">{artistName}</p>
                          <div 
                              className="absolute left-1/2 -translate-x-1/2 bottom-[-1.5rem] h-1 w-3/4 max-w-[200px] bg-cyan-400 rounded-full"
                              style={{ boxShadow: '0 0 10px #06b6d4, 0 0 20px #06b6d4' }}
                          ></div>
                      </div>
                  </div>
              </div>
            ) : (
                <div className={`w-full max-w-4xl p-4 flex flex-col gap-4 ${alignment} ${lyricStyle === 'turntable' ? 'h-full' : ''}`}>
                    {renderLyrics()}
                </div>
            )}
        </div>

        {/* Controls */}
        <footer className="flex-shrink-0 space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-300 font-mono w-12 text-center">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step="0.01"
                    value={currentTime}
                    onChange={handleTimelineChange}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                />
                <span className="text-sm text-gray-300 font-mono w-12 text-center">{formatTime(duration)}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1.5 bg-black/30 rounded-full border border-white/10">
                    <button onClick={() => setLyricStyle('karaoke')} title="卡拉OK" className={`p-2 rounded-full transition-colors ${lyricStyle === 'karaoke' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <AlignLeftIcon className="w-5 h-5" /></button>
                    <button onClick={() => setLyricStyle('vertical')} title="垂直滾動" className={`p-2 rounded-full transition-colors ${lyricStyle === 'vertical' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <VerticalLayoutIcon className="w-5 h-5" /></button>
                    <button onClick={() => setLyricStyle('turntable')} title="圓盤" className={`p-2 rounded-full transition-colors ${lyricStyle === 'turntable' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <DiscIcon className="w-5 h-5" /></button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                     <span className="text-gray-300 pl-1 text-sm">顏色:</span>
                    {lyricColorPalettes.map(p => (
                        <button key={p.name} title={p.name} onClick={() => setColorPalette(p)} className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${colorPalette.name === p.name ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50' : ''}`} style={{background: p.bg}} />
                    ))}
                </div>
                <button onClick={handlePlayPause} className="bg-white text-black rounded-full p-4 transform hover:scale-110 transition-transform shadow-lg">
                    {isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
                </button>
                <div className="flex items-center justify-end gap-2 p-1.5 bg-black/30 rounded-full border border-white/10">
                    <button onClick={() => setAlignment('items-start text-left')} title="靠左" className={`p-2 rounded-full transition-colors ${alignment.includes('left') ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <AlignLeftIcon className="w-5 h-5" /></button>
                    <button onClick={() => setAlignment('items-center text-center')} title="置中" className={`p-2 rounded-full transition-colors ${alignment.includes('center') ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => setAlignment('items-end text-right')} title="靠右" className={`p-2 rounded-full transition-colors ${alignment.includes('right') ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <AlignRightIcon className="w-5 h-5" /></button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <button onClick={() => setEffect(e => e === 'subtle-pan' ? 'none' : 'subtle-pan')} title="背景動畫" className={`p-2 rounded-full transition-colors ${effect === 'subtle-pan' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <PanIcon className="w-5 h-5" /></button>
                    <button onClick={() => setEffect(e => e === 'rain' ? 'none' : 'rain')} title="下雨特效" className={`p-2 rounded-full transition-colors ${effect === 'rain' ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}> <VerticalLinesIcon className="w-5 h-5" /></button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <button onClick={() => setShowControls(s => !s)} title="顯示/隱藏控制項" className="p-2 text-gray-300 hover:bg-white/10 rounded-full transition-colors">{showControls ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}</button>
                </div>
            </div>
        </footer>
      </div>

      <audio ref={audioRef} src={audioUrl} playsInline />

      <style>{`
        @keyframes subtle-pan {
          0% { background-position: 45% 50%; transform: scale(1); }
          50% { background-position: 55% 50%; transform: scale(1.05); }
          100% { background-position: 45% 50%; transform: scale(1); }
        }
        .animate-subtle-pan {
          animation: subtle-pan 20s ease-in-out infinite;
        }
        .accent-white::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
        }
        .accent-white::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            border: none;
        }
        @keyframes rain-fall {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        .bg-rain-effect {
            background-image: linear-gradient(transparent, transparent), linear-gradient(180deg, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.2) 1px, transparent 1px);
            background-size: 100% 100%, 2px 20px, 4px 30px;
            background-repeat: repeat;
            animation: rain-fall 0.5s linear infinite;
        }
        kbd {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            font-family: monospace;
            font-size: 0.875rem;
            font-weight: 600;
            line-height: 1;
            color: #24292e;
            vertical-align: middle;
            background-color: #fafbfc;
            border: solid 1px #d1d5da;
            border-bottom-color: #c6cbd1;
            border-radius: 3px;
            box-shadow: inset 0 -1px 0 #c6cbd1;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayer;