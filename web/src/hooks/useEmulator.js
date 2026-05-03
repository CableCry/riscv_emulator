import { useState, useEffect, useRef, useCallback } from 'react';
import { parseElf32, encodeJal, ECALL_WORD } from '../lib/elfLoader.js';

// Loads the Emscripten module once and returns it
let modulePromise = null;
function loadModule() {
  if (modulePromise) return modulePromise;
  modulePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/emulator.js';
    script.onload = () => {
      window.createEmulator({ locateFile: (f) => `/${f}` })
        .then(resolve)
        .catch(reject);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return modulePromise;
}

export function useEmulator() {
  const modRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModule()
      .then((mod) => {
        modRef.current = mod;
        mod._wasm_init();
        setReady(true);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Read all state from WASM in one shot
  const getState = useCallback(() => {
    const mod = modRef.current;
    if (!mod) return null;

    const pc = mod._wasm_get_pc() >>> 0;

    // Read 32 registers via shared buffer
    const buf = mod._malloc(32 * 4);
    mod._wasm_get_all_regs(buf);
    const registers = Array.from(new Uint32Array(mod.HEAPU8.buffer, buf, 32));
    mod._free(buf);

    const isHalted = mod._wasm_is_halted() !== 0;
    const trapCode = mod._wasm_get_trap();
    const trapVal  = mod._wasm_get_trap_val() >>> 0;

    // Read 64 bytes of memory around PC for the memory viewer
    const BYTES_PER_ROW = 8;
    const pcAligned = Math.floor(pc / BYTES_PER_ROW) * BYTES_PER_ROW;
    const startAddr = Math.max(0, pcAligned - BYTES_PER_ROW * 3);
    const memBytes = [];
    for (let i = 0; i < 64; i++) {
      memBytes.push(mod._wasm_read_mem8(startAddr + i));
    }

    // Read raw instruction word at PC for disassembly
    const rawWord = mod._wasm_read_mem32(pc) >>> 0;

    return { pc, registers, isHalted, trapCode, trapVal, memBytes, memStart: startAddr, rawWord };
  }, []);

  const step = useCallback(() => {
    const mod = modRef.current;
    if (!mod) return;
    mod._wasm_step();
  }, []);

  const isHaltedNow = useCallback(() => {
    const mod = modRef.current;
    return mod ? mod._wasm_is_halted() !== 0 : true;
  }, []);

  const run = useCallback((limit) => {
    const mod = modRef.current;
    if (!mod) return;
    mod._wasm_run(limit);
  }, []);

  // Reset: free + re-init CPU
  const reset = useCallback(() => {
    const mod = modRef.current;
    if (!mod) return;
    mod._wasm_free();
    mod._wasm_init();
  }, []);

  // Load raw binary bytes starting at address 0
  const loadBinary = useCallback((uint8Array) => {
    const mod = modRef.current;
    if (!mod) return;
    mod._wasm_free();
    mod._wasm_init();
    const ptr = mod._malloc(uint8Array.length);
    mod.HEAPU8.set(uint8Array, ptr);
    mod._wasm_load_bytes(0, ptr, uint8Array.length);
    mod._free(ptr);
  }, []);

  // Load an ELF32 file: parse segments in JS, load each via wasm_load_bytes,
  // then write a JAL trampoline at 0x0 if the entry point is not 0.
  const loadElf = useCallback((uint8Array) => {
    const mod = modRef.current;
    if (!mod) return false;
    mod._wasm_free();
    mod._wasm_init();

    const elf = parseElf32(uint8Array);
    if (!elf) {
      // Not a valid ELF — load as raw binary at 0
      const ptr = mod._malloc(uint8Array.length);
      mod.HEAPU8.set(uint8Array, ptr);
      mod._wasm_load_bytes(0, ptr, uint8Array.length);
      mod._free(ptr);
      return false;
    }

    for (const seg of elf.segments) {
      const ptr = mod._malloc(seg.data.length);
      mod.HEAPU8.set(seg.data, ptr);
      mod._wasm_load_bytes(seg.vaddr, ptr, seg.data.length);
      mod._free(ptr);
    }

    // Write a minimal _start stub at 0x0 so main() returns cleanly:
    //   [0x0] JAL ra, entry  — ra = 4, PC = entry
    //   [0x4] ECALL          — traps when main() returns to ra=4
    if (elf.entry !== 0) {
      const stub = new Uint8Array(8);
      const dv = new DataView(stub.buffer);
      dv.setUint32(0, encodeJal(1, elf.entry), true); // JAL ra (x1), offset
      dv.setUint32(4, ECALL_WORD, true);               // ECALL
      const ptr = mod._malloc(8);
      mod.HEAPU8.set(stub, ptr);
      mod._wasm_load_bytes(0, ptr, 8);
      mod._free(ptr);
    }

    return true;
  }, []);

  return { ready, error, getState, step, isHaltedNow, run, reset, loadBinary, loadElf };
}
