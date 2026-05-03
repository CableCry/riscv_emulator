import { useState, useEffect, useRef, useCallback } from 'react';
import './emulator.css';

import { useEmulator } from './hooks/useEmulator.js';
import { disassemble } from './lib/disassemble.js';

import { UploadScreen }  from './components/UploadScreen.jsx';
import { Header }        from './components/Header.jsx';
import { InstrCell }     from './components/InstrCell.jsx';
import { RegisterCell }  from './components/RegisterCell.jsx';
import { StatsCell }     from './components/StatsCell.jsx';
import { PipelineCell }  from './components/PipelineCell.jsx';
import { MemoryCell }    from './components/MemoryCell.jsx';
import { ControlsCell }  from './components/ControlsCell.jsx';

// Matches TrapCause enum in cpu.h
const TRAP_NAMES = {
  1: 'Illegal instruction',
  2: 'Load fault',
  3: 'Store fault',
  4: 'Misaligned fetch',
  5: 'ECALL',
  6: 'EBREAK',
};

const EMPTY_REGS = new Array(32).fill(0);
// Steps executed per animation frame during continuous run
const STEPS_PER_FRAME = 2000;

export default function App() {
  const emu = useEmulator();

  const [loaded, setLoaded]         = useState(false);
  const [filename, setFilename]     = useState('');
  const [cpuState, setCpuState]     = useState('halted');
  const [cycle, setCycle]           = useState(0);
  const [snapshot, setSnapshot]     = useState(null);
  const [highlightReg, setHighlightReg] = useState(null);
  const [pipelineStage, setPipelineStage] = useState(2);
  const [animating, setAnimating]   = useState(false);
  const [isRunning, setIsRunning]   = useState(false);

  const highlightTimerRef = useRef(null);
  const runIntervalRef    = useRef(null);
  const rafRef            = useRef(null);
  const cycleRef          = useRef(0); // kept in sync with cycle state for RAF loop
  const lastLoadRef       = useRef(null); // { bytes, isElf } — used to restore stub on reset

  // Pull fresh state from WASM and update React
  const refresh = useCallback(() => {
    if (!emu.ready) return null;
    const s = emu.getState();
    if (!s) return null;
    setSnapshot(s);
    if (s.isHalted) {
      const name = TRAP_NAMES[s.trapCode];
      setCpuState(name ? 'trap' : 'halted');
    }
    return s;
  }, [emu]);

  function flashChanged(prevRegs, nextRegs) {
    for (let i = 1; i < 32; i++) {
      if (prevRegs[i] !== nextRegs[i]) {
        setHighlightReg(i);
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setHighlightReg(null), 800);
        break;
      }
    }
  }

  function animatePipeline(cb) {
    setAnimating(true);
    setPipelineStage(0);
    const t1 = setTimeout(() => setPipelineStage(1), 200);
    const t2 = setTimeout(() => setPipelineStage(2), 400);
    const t3 = setTimeout(() => { setAnimating(false); cb(); }, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }

  function doStep() {
    if (!emu.ready || animating || isRunning) return;
    const prev = snapshot?.registers ?? EMPTY_REGS;
    animatePipeline(() => {
      emu.step();
      cycleRef.current += 1;
      setCycle(cycleRef.current);
      const s = refresh();
      if (s) flashChanged(prev, s.registers);
    });
  }

  function doRunN(n) {
    if (!emu.ready || isRunning || snapshot?.isHalted) return;
    setCpuState('running');
    let left = n;
    clearInterval(runIntervalRef.current);
    runIntervalRef.current = setInterval(() => {
      if (left <= 0) {
        clearInterval(runIntervalRef.current);
        setCpuState('halted');
        refresh();
        return;
      }
      left--;
      emu.step();
      cycleRef.current += 1;
      setCycle(cycleRef.current);
      const s = emu.getState();
      if (s) {
        setSnapshot(s);
        if (s.isHalted) {
          clearInterval(runIntervalRef.current);
          const name = TRAP_NAMES[s.trapCode];
          setCpuState(name ? 'trap' : 'halted');
        }
      }
    }, 80);
  }

  // Continuous run: batch STEPS_PER_FRAME steps per animation frame.
  // Only call the cheap isHaltedNow() in the hot loop; full getState() once per frame.
  function doRun() {
    if (!emu.ready || isRunning || snapshot?.isHalted) return;
    setIsRunning(true);
    setCpuState('running');

    function frame() {
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        emu.step();
        cycleRef.current += 1;
        if (emu.isHaltedNow()) {
          const s = emu.getState();
          setCycle(cycleRef.current);
          if (s) setSnapshot(s);
          const name = s ? TRAP_NAMES[s.trapCode] : null;
          setCpuState(name ? 'trap' : 'halted');
          setIsRunning(false);
          return;
        }
      }
      // Still running — refresh display once per frame then continue
      const s = emu.getState();
      if (s) setSnapshot(s);
      setCycle(cycleRef.current);
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
  }

  function doStop() {
    cancelAnimationFrame(rafRef.current);
    clearInterval(runIntervalRef.current);
    setIsRunning(false);
    setCpuState('halted');
    refresh();
  }

  function doPause() {
    clearInterval(runIntervalRef.current);
    setCpuState('halted');
    refresh();
  }

  function doReset() {
    cancelAnimationFrame(rafRef.current);
    clearInterval(runIntervalRef.current);
    setIsRunning(false);
    // Re-load the program so the _start stub at 0x0 is restored
    if (lastLoadRef.current) {
      const { bytes, isElf } = lastLoadRef.current;
      if (isElf) emu.loadElf(bytes); else emu.loadBinary(bytes);
    } else {
      emu.reset();
    }
    cycleRef.current = 0;
    setCycle(0);
    setCpuState('halted');
    setHighlightReg(null);
    setPipelineStage(2);
    setAnimating(false);
    setTimeout(refresh, 0);
  }

  function handleFile(name, bytes) {
    if (!emu.ready) return;
    const isElf = bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46;
    lastLoadRef.current = { bytes, isElf };
    if (isElf) {
      emu.loadElf(bytes);
    } else {
      emu.loadBinary(bytes);
    }
    setFilename(name);
    cycleRef.current = 0;
    setCycle(0);
    setCpuState('halted');
    setHighlightReg(null);
    setPipelineStage(2);
    setAnimating(false);
    setIsRunning(false);
    setLoaded(true);
    setTimeout(refresh, 0);
  }

  useEffect(() => {
    if (emu.ready && loaded) refresh();
  }, [emu.ready, loaded]);

  useEffect(() => {
    function onKey(e) {
      if (!loaded || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); doStep(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, animating, snapshot, emu.ready, isRunning]);

  // Clean up RAF on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(runIntervalRef.current);
  }, []);

  const isHalted  = !snapshot || snapshot.isHalted;
  const instr     = snapshot ? disassemble(snapshot.rawWord, snapshot.pc) : null;
  const trapCause = snapshot && cpuState === 'trap'
    ? (TRAP_NAMES[snapshot.trapCode] ?? `Trap ${snapshot.trapCode}`)
    : '—';

  if (!loaded) {
    return <UploadScreen onFile={handleFile} />;
  }

  return (
    <>
      <Header
        filename={filename}
        cpuState={cpuState}
        trapCause={trapCause}
        onUnload={() => { doReset(); setLoaded(false); setFilename(''); }}
      />

      <div className="bento">
        <InstrCell
          rawWord={snapshot?.rawWord}
          pc={snapshot?.pc ?? 0}
          cpuState={cpuState}
          trapCause={trapCause}
          a0={snapshot?.registers[10] ?? 0}
        />

        <RegisterCell
          registers={snapshot?.registers ?? EMPTY_REGS}
          highlightReg={highlightReg}
        />

        <StatsCell
          pc={snapshot?.pc ?? 0}
          cycle={cycle}
          cpuState={cpuState}
          trapCause={trapCause}
        />

        <PipelineCell
          rawWord={snapshot?.rawWord}
          pc={snapshot?.pc ?? 0}
          opcode={instr?.opcode}
          operands={instr?.operands}
          pipelineStage={animating ? pipelineStage : 2}
        />

        <MemoryCell
          memBytes={snapshot?.memBytes ?? []}
          memStart={snapshot?.memStart ?? 0}
          pc={snapshot?.pc ?? 0}
        />

        <ControlsCell
          isHalted={isHalted}
          animating={animating}
          isRunning={isRunning}
          cpuState={cpuState}
          onStep={doStep}
          onRunN={doRunN}
          onRun={doRun}
          onStop={doStop}
          onPause={doPause}
          onReset={doReset}
        />
      </div>
    </>
  );
}
