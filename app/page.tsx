'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, Minus, Plus, Volume2, VolumeX, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Phase = 'idle' | 'work' | 'rest' | 'finished';

type Preset = {
  id: string;
  name: string;
  workTime: number;
  restTime: number;
  sets: number;
};

export default function IntervalTimer() {
  const [workTime, setWorkTime] = useState(60); // 1 min default
  const [restTime, setRestTime] = useState(30); // 30 sec default
  const [sets, setSets] = useState(5);

  const [currentPhase, setCurrentPhase] = useState<Phase>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  useEffect(() => {
    const savedPresets = localStorage.getItem('intervalTimerPresets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      workTime,
      restTime,
      sets,
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('intervalTimerPresets', JSON.stringify(updatedPresets));
    setPresetName('');
    setIsSavingPreset(false);
  };

  const loadPreset = (preset: Preset) => {
    setWorkTime(preset.workTime);
    setRestTime(preset.restTime);
    setSets(preset.sets);
  };

  const deletePreset = (id: string) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem('intervalTimerPresets', JSON.stringify(updatedPresets));
  };

  // Audio context ref for beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = React.useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }, [soundEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && currentPhase !== 'idle' && currentPhase !== 'finished') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev > 1) {
            if (prev <= 4) {
              // Beep on 3, 2, 1
              playBeep(440, 0.2);
            }
            return prev - 1;
          }
          
          // Time is up (prev === 1, going to 0)
          playBeep(880, 0.5, 'square'); // Higher, longer beep for phase change
          
          if (currentPhase === 'work') {
            if (restTime > 0) {
              setCurrentPhase('rest');
              return restTime;
            } else {
              if (currentSet < sets) {
                setCurrentSet(s => s + 1);
                setCurrentPhase('work');
                return workTime;
              } else {
                setCurrentPhase('finished');
                setIsRunning(false);
                return 0;
              }
            }
          } else if (currentPhase === 'rest') {
            if (currentSet < sets) {
              setCurrentSet(s => s + 1);
              setCurrentPhase('work');
              return workTime;
            } else {
              setCurrentPhase('finished');
              setIsRunning(false);
              return 0;
            }
          }
          return 0;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentPhase, currentSet, sets, workTime, restTime, playBeep]);

  const startWorkout = () => {
    if (workTime === 0) return;
    // Initialize audio context on first user interaction
    if (soundEnabled && !audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Could not initialize audio context", e);
      }
    }
    setCurrentSet(1);
    setCurrentPhase('work');
    setTimeLeft(workTime);
    setIsRunning(true);
    playBeep(880, 0.5, 'square');
  };

  const stopWorkout = () => {
    setCurrentPhase('idle');
    setIsRunning(false);
    setTimeLeft(0);
    setCurrentSet(1);
  };

  const adjustWorkTime = (amount: number) => {
    setWorkTime(prev => Math.max(0, prev + amount));
    playBeep(600, 0.05, 'sine');
  };

  const adjustRestTime = (amount: number) => {
    setRestTime(prev => Math.max(0, prev + amount));
    playBeep(600, 0.05, 'sine');
  };

  const adjustSets = (amount: number) => {
    setSets(prev => Math.max(1, prev + amount));
    playBeep(600, 0.05, 'sine');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (currentPhase !== 'idle') {
    const isWork = currentPhase === 'work';
    const isRest = currentPhase === 'rest';
    const isFinished = currentPhase === 'finished';
    
    let bgColor = 'bg-black';
    let textColor = 'text-white';
    
    if (isWork) {
      bgColor = 'bg-[#00FF00]'; // Neon Green
      textColor = 'text-black';
    } else if (isRest) {
      bgColor = 'bg-[#00FFFF]'; // Neon Cyan
      textColor = 'text-black';
    } else if (isFinished) {
      bgColor = 'bg-[#FFFF00]'; // Neon Yellow
      textColor = 'text-black';
    }

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${bgColor} transition-colors duration-300 font-sans selection:bg-black selection:text-white`}>
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
          <div className={`text-2xl md:text-4xl font-black uppercase tracking-widest ${textColor}`}>
            Set {currentSet} / {sets}
          </div>
          <button 
            onClick={stopWorkout} 
            className={`p-3 border-4 border-current hover:bg-black hover:text-white transition-all active:scale-90 ${textColor}`}
            aria-label="Stop Workout"
          >
            <X size={32} strokeWidth={3} />
          </button>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.h2 
            key={currentPhase}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`text-[clamp(4rem,12vw,10rem)] font-black uppercase tracking-tighter mb-2 ${textColor}`}
          >
            {isWork ? 'WORK' : isRest ? 'REST' : 'DONE'}
          </motion.h2>
        </AnimatePresence>
        
        {!isFinished && (
          <motion.div 
            key={timeLeft}
            initial={{ opacity: 0.8, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className={`text-[clamp(6rem,25vw,24rem)] font-black leading-none tracking-tighter tabular-nums ${textColor}`}
          >
            {formatTime(timeLeft)}
          </motion.div>
        )}
        
        {!isFinished && (
          <div className="absolute bottom-12 flex gap-8">
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              className={`p-6 md:p-8 border-8 border-current rounded-full hover:bg-black hover:text-white transition-all active:scale-90 ${textColor}`}
              aria-label={isRunning ? "Pause" : "Play"}
            >
              {isRunning ? <Pause size={48} strokeWidth={3} /> : <Play size={48} strokeWidth={3} className="ml-2" />}
            </button>
          </div>
        )}
        
        {isFinished && (
          <button 
            onClick={stopWorkout} 
            className="mt-12 px-12 py-6 border-8 border-black text-black text-4xl font-black uppercase hover:bg-black hover:text-[#FFFF00] transition-all active:scale-95"
          >
            Finish
          </button>
        )}
      </div>
    );
  }

  // Setup View
  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12 selection:bg-white selection:text-black flex flex-col justify-center">
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex justify-between items-end mb-12">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
            Interval<br/><span className="text-[#00FF00]">Timer</span>
          </h1>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 border-2 border-white hover:bg-white hover:text-black transition-all active:scale-95"
            aria-label={soundEnabled ? "Disable Sound" : "Enable Sound"}
          >
            {soundEnabled ? <Volume2 size={28} strokeWidth={2.5} /> : <VolumeX size={28} strokeWidth={2.5} />}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Work Setting */}
          <div className="border-4 border-white p-6 flex flex-col items-center justify-center bg-black">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400 mb-6">Work</h2>
            <div className="text-6xl md:text-7xl font-black tracking-tighter mb-6 text-[#00FF00] tabular-nums">
              {formatTime(workTime)}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button onClick={() => adjustWorkTime(-60)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">-1m</button>
              <button onClick={() => adjustWorkTime(60)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">+1m</button>
              <button onClick={() => adjustWorkTime(-5)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">-5s</button>
              <button onClick={() => adjustWorkTime(5)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">+5s</button>
            </div>
          </div>

          {/* Rest Setting */}
          <div className="border-4 border-white p-6 flex flex-col items-center justify-center bg-black">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400 mb-6">Rest</h2>
            <div className="text-6xl md:text-7xl font-black tracking-tighter mb-6 text-[#00FFFF] tabular-nums">
              {formatTime(restTime)}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button onClick={() => adjustRestTime(-60)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">-1m</button>
              <button onClick={() => adjustRestTime(60)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">+1m</button>
              <button onClick={() => adjustRestTime(-5)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">-5s</button>
              <button onClick={() => adjustRestTime(5)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl transition-all active:scale-95">+5s</button>
            </div>
          </div>

          {/* Sets Setting */}
          <div className="border-4 border-white p-6 flex flex-col items-center justify-center bg-black">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400 mb-6">Sets</h2>
            <div className="text-[6rem] md:text-[7rem] font-black tracking-tighter mb-6 text-[#FFFF00] tabular-nums leading-none">
              {sets}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-auto">
              <button onClick={() => adjustSets(-1)} className="py-4 border-2 border-white hover:bg-white hover:text-black flex justify-center items-center transition-all active:scale-95">
                <Minus size={32} strokeWidth={3} />
              </button>
              <button onClick={() => adjustSets(1)} className="py-4 border-2 border-white hover:bg-white hover:text-black flex justify-center items-center transition-all active:scale-95">
                <Plus size={32} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={startWorkout}
          disabled={workTime === 0}
          className="w-full py-8 bg-white text-black text-4xl md:text-5xl font-black uppercase tracking-widest hover:bg-[#00FF00] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:scale-100 disabled:active:scale-100 mb-12"
        >
          Start Workout
        </button>

        {/* Presets Section */}
        <div className="border-4 border-white p-6 bg-black">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Presets</h2>
            
            {!isSavingPreset ? (
              <button 
                onClick={() => setIsSavingPreset(true)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-white hover:bg-white hover:text-black font-bold uppercase text-sm transition-all active:scale-95"
              >
                <Save size={18} /> Save Current
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input 
                  type="text" 
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset Name"
                  className="bg-transparent border-2 border-white px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF00] w-full md:w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') savePreset();
                    if (e.key === 'Escape') setIsSavingPreset(false);
                  }}
                />
                <button 
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="px-4 py-2 bg-white text-black font-bold uppercase text-sm hover:bg-[#00FF00] disabled:opacity-50 transition-all active:scale-95"
                >
                  Save
                </button>
                <button 
                  onClick={() => setIsSavingPreset(false)}
                  className="p-2 border-2 border-white hover:bg-white hover:text-black transition-all active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {presets.length === 0 ? (
            <p className="text-gray-500 italic">No saved presets yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {presets.map(preset => (
                <div key={preset.id} className="border-2 border-gray-700 p-4 flex flex-col hover:border-white transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg truncate pr-2">{preset.name}</h3>
                    <button 
                      onClick={() => deletePreset(preset.id)}
                      className="text-gray-500 hover:text-red-500 transition-all active:scale-90"
                      aria-label="Delete preset"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-400 mb-4 font-mono">
                    W: {formatTime(preset.workTime)} | R: {formatTime(preset.restTime)} | S: {preset.sets}
                  </div>
                  <button 
                    onClick={() => loadPreset(preset)}
                    className="mt-auto w-full py-2 border border-white hover:bg-white hover:text-black font-bold uppercase text-sm transition-all active:scale-95"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
