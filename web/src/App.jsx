import { useState, useEffect, useRef, useCallback } from 'react';
import './emulator.css';

import { useEmulator } from './hooks/useEmulator.js';
import { disassemble } from './lib/disassemble.js';
import { parseElf32 } from './lib/elfLoader.js';

import { UploadScreen }    from './components/UploadScreen.jsx';
import { Header }          from './components/Header.jsx';
import { InstrCell }       from './components/InstrCell.jsx';
import { RegisterCell }    from './components/RegisterCell.jsx';
import { StatsCell }       from './components/StatsCell.jsx';
import { PipelineCell }    from './components/PipelineCell.jsx';
import { MemoryCell }      from './components/MemoryCell.jsx';
import { ControlsCell }    from './components/ControlsCell.jsx';
import { AssemblerPanel }  from './components/AssemblerPanel.jsx';

// Matches TrapCause enum in cpu.h
const TRAP_NAMES = {
  1: 'Illegal instruction',
  2: 'Load fault',
  3: 'Store fault',
  4: 'Misaligned fetch',
  5: 'ECALL',
  6: 'EBREAK',
};

const REG_ALIASES = [
  'zero','ra','sp','gp','tp','t0','t1','t2',
  's0','s1','a0','a1','a2','a3','a4','a5',
  'a6','a7','s2','s3','s4','s5','s6','s7',
  's8','s9','s10','s11','t3','t4','t5','t6',
];

function toHex(n) {
  return '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

const EMPTY_REGS = new Array(32).fill(0);
const STEPS_PER_FRAME = 2000;
const HISTORY_MAX = 64;
const LOG_MAX = 500;

export default function App() {
  const emu = useEmulator();

  const [loaded, setLoaded]             = useState(false);
  const [filename, setFilename]         = useState('');
  const [cpuState, setCpuState]         = useState('halted');
  const [cycle, setCycle]               = useState(0);
  const [snapshot, setSnapshot]         = useState(null);
  const [highlightReg, setHighlightReg] = useState(null);
  const [highlightMemRow, setHighlightMemRow] = useState(null);
  const [pipelineStage, setPipelineStage] = useState(2);
  const [animating, setAnimating]       = useState(false);
  const [isRunning, setIsRunning]       = useState(false);

  // New features
  const [symbolMap, setSymbolMap]       = useState(new Map());
  const [breakpoints, setBreakpoints]   = useState(new Set());
  const [callStack, setCallStack]       = useState([]);
  const [log, setLog]                   = useState([]);
  const [assemblerOpen, setAssemblerOpen] = useState(false);

  const runIntervalRef    = useRef(null);
  const rafRef            = useRef(null);
  const cycleRef          = useRef(0);
  const lastLoadRef       = useRef(null); // { bytes, isElf }
  const historyRef        = useRef([]);   // ring buffer: [{pc, registers, cycle}]
  const logRef            = useRef([]);   // step annotation log

  // ── Pull fresh state from WASM ────────────────────────────────────────────
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

  function pushHistory(s) {
    const entry = { pc: s.pc, registers: [...s.registers], cycle: cycleRef.current };
    const h = historyRef.current;
    if (h.length >= HISTORY_MAX) h.shift();
    h.push(entry);
  }

  function pushLog(pc, instrStr, prevRegs, nextRegs) {
    let regChanged = null;
    for (let i = 1; i < 32; i++) {
      if ((prevRegs[i] >>> 0) !== (nextRegs[i] >>> 0)) {
        regChanged = `${REG_ALIASES[i]}=${toHex(nextRegs[i])}`;
        break;
      }
    }
    const entry = { cycle: cycleRef.current, pc, instrStr, regChanged };
    logRef.current = logRef.current.length >= LOG_MAX
      ? [...logRef.current.slice(-LOG_MAX + 1), entry]
      : [...logRef.current, entry];
    setLog([...logRef.current]);
  }

  function trackCallStack(instr, pc) {
    if (!instr) return;
    if (instr.opcode === 'JAL' && instr.rd === 1) {
      // Call: JAL ra, offset
      const targetAddr = (pc + instr.imm) >>> 0;
      const retAddr    = (pc + 4) >>> 0;
      const name = symbolMap.get(targetAddr) ?? toHex(targetAddr);
      setCallStack(cs => [...cs, { returnAddr: retAddr, targetAddr, name }]);
    } else if (
      instr.opcode === 'JALR' && instr.rd === 0 &&
      instr.rs1 === 1 && instr.imm === 0
    ) {
      // Return: JALR x0, ra, 0 (RET pseudo)
      setCallStack(cs => cs.slice(0, -1));
    }
  }

  function flashChanged(prevRegs, nextRegs) {
    for (let i = 1; i < 32; i++) {
      if ((prevRegs[i] >>> 0) !== (nextRegs[i] >>> 0)) {
        setHighlightReg(i);
        return;
      }
    }
  }

  function detectMemChange(prevBytes, prevStart, nextBytes, nextStart) {
    if (prevStart !== nextStart) { setHighlightMemRow(null); return; }
    for (let i = 0; i < prevBytes.length; i++) {
      if ((prevBytes[i] ?? 0) !== nextBytes[i]) {
        setHighlightMemRow(prevStart + Math.floor(i / 8) * 8);
        return;
      }
    }
    setHighlightMemRow(null);
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
    const prev      = snapshot?.registers ?? EMPTY_REGS;
    const prevMem   = snapshot?.memBytes  ?? [];
    const prevStart = snapshot?.memStart  ?? 0;
    const instrNow  = snapshot ? disassemble(snapshot.rawWord, snapshot.pc) : null;
    const pcNow     = snapshot?.pc ?? 0;

    // Push state BEFORE step so we can restore it
    if (snapshot) pushHistory(snapshot);

    animatePipeline(() => {
      emu.step();
      cycleRef.current += 1;
      setCycle(cycleRef.current);
      const s = refresh();
      if (s) {
        flashChanged(prev, s.registers);
        detectMemChange(prevMem, prevStart, s.memBytes, s.memStart);
        const instrStr = instrNow ? `${instrNow.opcode} ${instrNow.operands}` : '???';
        pushLog(pcNow, instrStr.trim(), prev, s.registers);
        trackCallStack(instrNow, pcNow);
      }
    });
  }

  function doBackStep() {
    if (historyRef.current.length === 0) return;
    cancelAnimationFrame(rafRef.current);
    clearInterval(runIntervalRef.current);
    setIsRunning(false);
    const entry = historyRef.current.pop();
    emu.setPC(entry.pc);
    emu.setRegisters(entry.registers);
    emu.clearTrap();
    cycleRef.current = entry.cycle;
    setCycle(entry.cycle);
    setCpuState('halted');
    setHighlightReg(null);
    setHighlightMemRow(null);
    setAnimating(false);
    setTimeout(refresh, 0);
  }

  // Continuous run with breakpoint support
  function doRun() {
    if (!emu.ready || isRunning || snapshot?.isHalted) return;
    // Save state before the run so user can back-step to it
    if (snapshot) pushHistory(snapshot);
    setIsRunning(true);
    setCpuState('running');
    const bpSet = breakpoints; // capture current Set

    function frame() {
      const hasBps = bpSet.size > 0;
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
        // Check breakpoints — only call wasm_get_pc when BPs are actually set
        if (hasBps) {
          const pc = emu.getPCNow();
          if (bpSet.has(pc)) {
            const s = emu.getState();
            setCycle(cycleRef.current);
            if (s) setSnapshot(s);
            setCpuState('halted');
            setIsRunning(false);
            return;
          }
        }
      }
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

  function doReset() {
    cancelAnimationFrame(rafRef.current);
    clearInterval(runIntervalRef.current);
    setIsRunning(false);
    if (lastLoadRef.current) {
      const { bytes, isElf } = lastLoadRef.current;
      if (isElf) {
        const result = emu.loadElf(bytes);
        setSymbolMap(result.symbols ?? new Map());
      } else {
        emu.loadBinary(bytes);
        setSymbolMap(new Map());
      }
    } else {
      emu.reset();
    }
    cycleRef.current = 0;
    setCycle(0);
    setCpuState('halted');
    setHighlightReg(null);
    setHighlightMemRow(null);
    setPipelineStage(2);
    setAnimating(false);
    historyRef.current = [];
    logRef.current = [];
    setLog([]);
    setCallStack([]);
    setTimeout(refresh, 0);
  }

  function toggleBreakpoint(addr) {
    setBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(addr >>> 0)) next.delete(addr >>> 0);
      else next.add(addr >>> 0);
      return next;
    });
  }

  function handleFile(name, bytes) {
    if (!emu.ready) return;
    const isElf = bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46;
    lastLoadRef.current = { bytes, isElf };
    if (isElf) {
      const result = emu.loadElf(bytes);
      setSymbolMap(result.symbols ?? new Map());
    } else {
      emu.loadBinary(bytes);
      setSymbolMap(new Map());
    }
    setFilename(name);
    cycleRef.current = 0;
    setCycle(0);
    setCpuState('halted');
    setHighlightReg(null);
    setHighlightMemRow(null);
    setPipelineStage(2);
    setAnimating(false);
    setIsRunning(false);
    historyRef.current = [];
    logRef.current = [];
    setLog([]);
    setCallStack([]);
    setBreakpoints(new Set());
    setLoaded(true);
    setTimeout(refresh, 0);
  }

  // Load assembled code: raw binary at address 0, no stub
  function handleAssemblerLoad(uint8Array, asmName) {
    if (!emu.ready) return;
    lastLoadRef.current = { bytes: uint8Array, isElf: false };
    emu.loadBinary(uint8Array);
    setFilename(asmName || 'assembled.bin');
    cycleRef.current = 0;
    setCycle(0);
    setCpuState('halted');
    setHighlightReg(null);
    setHighlightMemRow(null);
    setPipelineStage(2);
    setAnimating(false);
    setIsRunning(false);
    historyRef.current = [];
    logRef.current = [];
    setLog([]);
    setCallStack([]);
    setBreakpoints(new Set());
    setSymbolMap(new Map());
    setLoaded(true);
    setAssemblerOpen(false);
    setTimeout(refresh, 0);
  }

  useEffect(() => {
    if (emu.ready && loaded) refresh();
  }, [emu.ready, loaded]);

  useEffect(() => {
    function onKey(e) {
      if (!loaded || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); doStep(); }
      if (e.code === 'Escape') { setAssemblerOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, animating, snapshot, emu.ready, isRunning]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(runIntervalRef.current);
  }, []);

  const isHalted   = !snapshot || snapshot.isHalted;
  const instr      = snapshot ? disassemble(snapshot.rawWord, snapshot.pc) : null;
  const trapCause  = snapshot && cpuState === 'trap'
    ? (TRAP_NAMES[snapshot.trapCode] ?? `Trap ${snapshot.trapCode}`)
    : '—';
  const symbolName = snapshot ? (symbolMap.get(snapshot.pc >>> 0) ?? null) : null;
  const canBackStep = historyRef.current.length > 0;

  // Breakpoint check: slightly expensive in doRun, but fine for single-stepping
  // We skip the per-step call inside doRun and instead use the cheaper loop approach.

  if (!loaded) {
    return (
      <>
        <UploadScreen onFile={handleFile} />
        {assemblerOpen && (
          <AssemblerPanel
            onLoad={handleAssemblerLoad}
            onClose={() => setAssemblerOpen(false)}
          />
        )}
      </>
    );
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
          symbolName={symbolName}
        />

        <RegisterCell
          registers={snapshot?.registers ?? EMPTY_REGS}
          highlightReg={highlightReg}
          callStack={callStack}
        />

        <StatsCell
          pc={snapshot?.pc ?? 0}
          cycle={cycle}
          cpuState={cpuState}
          trapCause={trapCause}
          log={log}
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
          highlightMemRow={highlightMemRow}
          breakpoints={breakpoints}
          onToggleBreakpoint={toggleBreakpoint}
          symbolMap={symbolMap}
        />

        <ControlsCell
          isHalted={isHalted}
          animating={animating}
          isRunning={isRunning}
          cpuState={cpuState}
          canBackStep={canBackStep && !animating && !isRunning}
          onStep={doStep}
          onBackStep={doBackStep}
          onRun={doRun}
          onStop={doStop}
          onReset={doReset}
          onOpenAssembler={() => setAssemblerOpen(true)}
        />
      </div>

      {assemblerOpen && (
        <AssemblerPanel
          onLoad={handleAssemblerLoad}
          onClose={() => setAssemblerOpen(false)}
        />
      )}
    </>
  );
}
