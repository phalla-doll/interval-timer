'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, Minus, Plus, Volume2, VolumeX } from 'lucide-react';

type Phase = 'idle' | 'work' | 'rest' | 'finished';

export default function IntervalTimer() {
  const [workTime, setWorkTime] = useState(60); // 1 min default
  const [restTime, setRestTime] = useState(30); // 30 sec default
  const [sets, setSets] = useState(5);

  const [currentPhase, setCurrentPhase] = useState<Phase>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio context ref for beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
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
  };

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
  }, [isRunning, currentPhase, currentSet, sets, workTime, restTime, soundEnabled]);

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
            className={`p-3 border-4 border-current hover:bg-black hover:text-white transition-colors ${textColor}`}
            aria-label="Stop Workout"
          >
            <X size={32} strokeWidth={3} />
          </button>
        </div>
        
        <h2 className={`text-6xl md:text-9xl font-black uppercase tracking-tighter mb-2 ${textColor}`}>
          {isWork ? 'WORK' : isRest ? 'REST' : 'DONE'}
        </h2>
        
        {!isFinished && (
          <div className={`text-[8rem] sm:text-[12rem] md:text-[18rem] lg:text-[24rem] font-black leading-none tracking-tighter tabular-nums ${textColor}`}>
            {formatTime(timeLeft)}
          </div>
        )}
        
        {!isFinished && (
          <div className="absolute bottom-12 flex gap-8">
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              className={`p-6 md:p-8 border-8 border-current rounded-full hover:bg-black hover:text-white transition-colors ${textColor}`}
              aria-label={isRunning ? "Pause" : "Play"}
            >
              {isRunning ? <Pause size={48} strokeWidth={3} /> : <Play size={48} strokeWidth={3} className="ml-2" />}
            </button>
          </div>
        )}
        
        {isFinished && (
          <button 
            onClick={stopWorkout} 
            className="mt-12 px-12 py-6 border-8 border-black text-black text-4xl font-black uppercase hover:bg-black hover:text-[#FFFF00] transition-colors"
          >
            Finish
          </button>
        )}
      </div>
    );
  }

  // Setup View
  return (
    <div className="min-h-screen bg-black text-white font-sans p-6 md:p-12 selection:bg-white selection:text-black">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
            Interval<br/><span className="text-[#00FF00]">Timer</span>
          </h1>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 border-2 border-white hover:bg-white hover:text-black transition-colors"
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
              <button onClick={() => setWorkTime(Math.max(0, workTime - 60))} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">-1m</button>
              <button onClick={() => setWorkTime(workTime + 60)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">+1m</button>
              <button onClick={() => setWorkTime(Math.max(0, workTime - 5))} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">-5s</button>
              <button onClick={() => setWorkTime(workTime + 5)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">+5s</button>
            </div>
          </div>

          {/* Rest Setting */}
          <div className="border-4 border-white p-6 flex flex-col items-center justify-center bg-black">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400 mb-6">Rest</h2>
            <div className="text-6xl md:text-7xl font-black tracking-tighter mb-6 text-[#00FFFF] tabular-nums">
              {formatTime(restTime)}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button onClick={() => setRestTime(Math.max(0, restTime - 60))} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">-1m</button>
              <button onClick={() => setRestTime(restTime + 60)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">+1m</button>
              <button onClick={() => setRestTime(Math.max(0, restTime - 5))} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">-5s</button>
              <button onClick={() => setRestTime(restTime + 5)} className="py-3 border-2 border-white hover:bg-white hover:text-black font-bold text-xl">+5s</button>
            </div>
          </div>

          {/* Sets Setting */}
          <div className="border-4 border-white p-6 flex flex-col items-center justify-center bg-black">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400 mb-6">Sets</h2>
            <div className="text-[6rem] md:text-[7rem] font-black tracking-tighter mb-6 text-[#FFFF00] tabular-nums leading-none">
              {sets}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-auto">
              <button onClick={() => setSets(Math.max(1, sets - 1))} className="py-4 border-2 border-white hover:bg-white hover:text-black flex justify-center items-center">
                <Minus size={32} strokeWidth={3} />
              </button>
              <button onClick={() => setSets(sets + 1)} className="py-4 border-2 border-white hover:bg-white hover:text-black flex justify-center items-center">
                <Plus size={32} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={startWorkout}
          disabled={workTime === 0}
          className="w-full py-8 bg-white text-black text-4xl md:text-5xl font-black uppercase tracking-widest hover:bg-[#00FF00] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:scale-100"
        >
          Start Workout
        </button>
      </div>
    </div>
  );
}
