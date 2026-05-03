# RISC-V Emulator

A RV32I emulator written in C, compiled to WebAssembly and visualised with a React frontend. Load any bare-metal RISC-V ELF or raw binary, then step through instructions, watch registers change, and inspect memory in real time.

## Repository layout

```
riscv_emulator/
├── emu/src/          # C emulator core + Emscripten WASM build
│   ├── cpu.c/h       # CPU state, memory, trap handling
│   ├── decode.c/h    # RV32I instruction decoder
│   ├── execute.c/h   # Instruction execution
│   ├── regs.c/h      # Register file
│   ├── elf_loader.c/h
│   ├── wasm_api.c    # Exported WASM surface (_wasm_init, _wasm_step, …)
│   ├── emulator_api.c
│   ├── build.bat     # Emscripten build script (Windows)
│   ├── emulator.js   # Pre-built WASM JS glue  ┐ committed so you don't
│   ├── emulator.wasm # Pre-built WASM binary   ┘ need emsdk to run the UI
│   ├── tests.c       # Native unit tests
│   └── test_program/
│       ├── program.c   # Example RV32I C program
│       └── program.elf # Pre-compiled ELF you can load straight away
└── web/              # Vite + React 19 frontend
    ├── public/
    │   ├── emulator.js   # Copied from emu/src after each build
    │   └── emulator.wasm
    └── src/
        ├── App.jsx
        ├── hooks/useEmulator.js
        ├── lib/
        │   ├── disassemble.js   # JS RV32I disassembler
        │   └── elfLoader.js     # JS ELF32 parser
        └── components/          # UI panels (registers, memory, pipeline, …)
```

---

## Running the web UI

The compiled WASM is already checked in, so you only need Node.

**Prerequisites:** Node 18+

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), then drag-and-drop any of the following onto the upload screen:

| File | What it does |
|------|-------------|
| `emu/src/test_program/program.elf` | Runs a small loop, returns `25` via ECALL |
| Any bare-metal RV32I ELF | Loaded at its `p_vaddr`, entry via JAL trampoline at `0x0` |
| Any raw binary | Loaded at address `0x0` |

### Controls

| Action | How |
|--------|-----|
| Step one instruction | **Step** button or `Space` |
| Run N instructions | Set the number, click **Run ×N** |
| Run until halt | **Run** button |
| Stop continuous run | **Stop** button |
| Reset to start | **Reset** (reloads the program, restoring the entry trampoline) |

---

## Rebuilding the WASM

You only need to do this if you change files under `emu/src/`.

**Prerequisites:** [emsdk](https://emscripten.org/docs/getting_started/downloads.html) — install and activate once:

```bat
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
emsdk install latest
emsdk activate latest
```

Then build and copy the artifacts:

```powershell
# In a PowerShell session — set env vars manually so emsdk_env.bat
# doesn't terminate the script early (a known Windows cmd quirk)
$env:EMSDK        = "C:/path/to/emsdk"
$env:EMSDK_NODE   = "C:/path/to/emsdk/node/<version>/bin/node.exe"
$env:EMSDK_PYTHON = "C:/path/to/emsdk/python/<version>/python.exe"
$env:PATH         = "C:/path/to/emsdk/upstream/emscripten;$env:PATH"

Set-Location emu/src
# build.bat runs the emcc command
.\build.bat   # or paste the emcc line directly (see build.bat)

# Copy the output to the web server
Copy-Item emulator.js   ../../web/public/emulator.js
Copy-Item emulator.wasm ../../web/public/emulator.wasm
```

**On Linux/macOS** activate emsdk normally and run:

```bash
source /path/to/emsdk/emsdk_env.sh
cd emu/src
bash build.sh   # or replicate the emcc line from build.bat
cp emulator.{js,wasm} ../../web/public/
```

---

## Running the native tests

The emulator core can also be compiled and tested natively without Emscripten.

**Prerequisites:** GCC (or any C99 compiler)

```bash
cd emu/src
gcc -o tests tests.c cpu.c decode.c execute.c regs.c elf_loader.c emulator_api.c -I.
./tests
```

All assertions should pass silently.

---

## Compiling your own RV32I programs

You need a RISC-V cross-compiler. The easiest way on most platforms:

```bash
# Ubuntu / Debian
sudo apt install gcc-riscv64-linux-gnu

# macOS (Homebrew)
brew install riscv-gnu-toolchain
```

Compile a bare-metal C program to a static ELF:

```bash
riscv64-linux-gnu-gcc \
  -march=rv32i -mabi=ilp32 \
  -static -nostdlib \
  -Wl,-Ttext=0x1000 \
  -o program.elf program.c
```

> **Tip:** Keep programs simple — there is no OS, no libc, and no heap allocator.  
> Return a value from `main()` and the emulator will show it as the ECALL return value when execution halts.

---

## How ELF loading works

Because the emulator starts at address `0x0` and ELFs can have arbitrary entry points, the loader writes an 8-byte `_start` stub at `0x0` before execution:

```
0x0: JAL ra, <entry>   # ra = 4, PC jumps to entry point
0x4: ECALL             # traps when main() returns (ra=4 → PC=4)
```

This means `main()` can `return` normally and execution will halt cleanly with the return value visible in `a0`.

---

## Supported instructions

Full **RV32I** base integer ISA:

- Arithmetic / logic: `ADD`, `SUB`, `AND`, `OR`, `XOR`, `SLL`, `SRL`, `SRA`, `SLT`, `SLTU` and their immediate variants
- Memory: `LB`, `LH`, `LW`, `LBU`, `LHU`, `SB`, `SH`, `SW`
- Branches: `BEQ`, `BNE`, `BLT`, `BGE`, `BLTU`, `BGEU`
- Jumps: `JAL`, `JALR`
- Upper immediates: `LUI`, `AUIPC`
- System: `ECALL`, `EBREAK`
