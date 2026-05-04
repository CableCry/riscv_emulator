# RISC-V Emulator

A RV32I/M emulator written in C, compiled to WebAssembly and visualised with a React 19 frontend. Step through instructions one at a time, set breakpoints, back-step through history, inspect registers and memory, disassemble live, and write programs directly in the browser with the built-in assembler.

**Live demo → [cablecry.github.io/riscv_emulator](https://cablecry.github.io/riscv_emulator/)**

---

## Features

| Feature | Details |
|---------|---------|
| **RV32I + RV32M** | Full base integer ISA plus multiply/divide extension |
| **Step / Back-step** | Step forward or rewind up to 64 instructions |
| **Breakpoints** | Click any memory row to toggle; run halts automatically |
| **Inline assembler** | Write and run RV32I/M assembly directly in the browser |
| **Call stack panel** | Tracks JAL/RET frames during single-stepping |
| **Step log** | Every instruction annotated with cycle, PC, and register change |
| **ELF symbol names** | Parsed from `.symtab` — shown next to PC and memory addresses |
| **Demo programs** | Seven pre-compiled demos covering arithmetic, recursion, and RV32M |
| **Instruction reference** | Click any opcode to see a built-in description of every operand |

---

## Repository layout

```
riscv_emulator/
├── .github/workflows/deploy.yml   # GitHub Actions → GitHub Pages
├── emu/src/
│   ├── cpu.c/h          # CPU state, memory, trap handling
│   ├── decode.c/h       # RV32I/M instruction decoder
│   ├── execute.c/h      # Instruction execution (RV32I + RV32M)
│   ├── regs.c/h         # Register file
│   ├── elf_loader.c/h   # Native ELF loader (unused at runtime)
│   ├── wasm_api.c       # WASM surface (_wasm_step, _wasm_set_pc, …)
│   ├── emulator_api.c
│   ├── build.bat        # Emscripten build script (Windows)
│   ├── emulator.js      # Pre-built WASM JS glue  ┐ committed so the
│   ├── emulator.wasm    # Pre-built WASM binary   ┘ UI runs without emsdk
│   └── test_program/    # C source for the demo programs
└── web/
    ├── public/
    │   ├── emulator.js / emulator.wasm   # Served at runtime
    │   └── demos/*.elf                   # Pre-compiled demo binaries
    └── src/
        ├── App.jsx
        ├── hooks/useEmulator.js          # WASM bindings + history ring buffer
        ├── lib/
        │   ├── disassemble.js            # JS RV32I/M disassembler
        │   ├── elfLoader.js              # JS ELF32 parser + symtab
        │   ├── assembler.js              # Two-pass RV32I/M assembler
        │   └── demos.js                  # Demo program registry
        └── components/
            ├── InstrCell.jsx             # Current instruction + help popup
            ├── RegisterCell.jsx          # Register file + call stack tab
            ├── MemoryCell.jsx            # Hex dump + breakpoint toggle
            ├── StatsCell.jsx             # CPU stats + step log tab
            ├── ControlsCell.jsx          # Step / Back / Run / Breakpoints / ASM
            ├── AssemblerPanel.jsx        # Inline assembler modal
            ├── PipelineCell.jsx          # Fetch → Decode → Execute animation
            └── UploadScreen.jsx          # Drag-and-drop + demo picker
```

---

## Running locally

The pre-built WASM is checked in, so you only need Node.

**Prerequisites:** Node 18+

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Controls

| Action | How |
|--------|-----|
| Step one instruction | **▶ Step** or `Space` |
| Step back | **◀ Back** (up to 64 steps) |
| Run until halt / breakpoint | **▶▶ Run** |
| Stop continuous run | **⏹ Stop** |
| Reset to start | **↺ Reset** |
| Toggle breakpoint | Click any row in the Memory panel |
| Open assembler | **✎ ASM** button |

---

## Loading programs

**Drag and drop** any of the following onto the upload screen, or click **Try a demo program**:

| Input | Behaviour |
|-------|-----------|
| Bare-metal ELF (RV32I/M) | Segments loaded at their `p_vaddr`; a 12-byte `_start` stub is written at `0x0` to set the stack pointer and jump to the entry point |
| Raw binary | Loaded at address `0x0` |
| Inline assembler | Code assembled and loaded at `0x0`; execution starts from the first instruction |

> `main()` returns via ECALL — the emulator shows the `a0` return value when execution halts.

---

## Inline assembler

Click **✎ ASM** to open the assembler panel. Supports:

- All **RV32I** instructions and standard pseudo-instructions (`NOP`, `MV`, `RET`, `LI`, `J`, `CALL`, `NOT`, `NEG`, `SEQZ`, `SNEZ`)
- All **RV32M** multiply/divide instructions (`MUL`, `MULH`, `DIV`, `DIVU`, `REM`, `REMU`, …)
- Labels and PC-relative branches/jumps
- `#` and `;` line comments

Example program that computes `21 * 2 = 42`:

```asm
    addi  a0, zero, 21
    addi  a1, zero, 2
    mul   a0, a0, a1     # RV32M multiply
    ecall                # halt — result in a0
```

---

## Rebuilding the WASM

Only needed if you modify files under `emu/src/`.

**Prerequisites:** [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) and Python 3.

```powershell
# Windows — set env vars directly (emsdk_env.bat terminates batch files)
$env:EMSDK_PYTHON = "path\to\python.exe"

Set-Location emu/src
.\build.bat

Copy-Item emulator.js   ..\..\web\public\emulator.js
Copy-Item emulator.wasm ..\..\web\public\emulator.wasm
```

```bash
# Linux / macOS
source /path/to/emsdk/emsdk_env.sh
cd emu/src
bash build.sh
cp emulator.{js,wasm} ../../web/public/
```

---

## Compiling your own programs

You need a RISC-V cross-compiler:

```bash
# Ubuntu / Debian
sudo apt install gcc-riscv64-linux-gnu

# macOS (Homebrew)
brew install riscv-gnu-toolchain

# Windows (via Scoop + MSYS2)
scoop install msys2
# then inside MSYS2: pacman -S mingw-w64-ucrt-x86_64-riscv32-unknown-elf-gcc
```

Compile a bare-metal C program:

```bash
riscv32-unknown-elf-gcc \
  -march=rv32im -mabi=ilp32 \
  -nostdlib -static \
  -Wl,-e,main \
  -O1 -o program.elf program.c
```

> `-march=rv32im` enables the M extension (multiply/divide). Use `-march=rv32i` for base ISA only.  
> `-Wl,-e,main` sets `main` as the ELF entry point so the `_start` trampoline jumps to the right place.

---

## Supported instructions

### RV32I base ISA

| Group | Instructions |
|-------|-------------|
| Arithmetic | `ADD` `SUB` `ADDI` |
| Logic | `AND` `OR` `XOR` `ANDI` `ORI` `XORI` |
| Shifts | `SLL` `SRL` `SRA` `SLLI` `SRLI` `SRAI` |
| Comparisons | `SLT` `SLTU` `SLTI` `SLTIU` |
| Memory | `LB` `LH` `LW` `LBU` `LHU` `SB` `SH` `SW` |
| Branches | `BEQ` `BNE` `BLT` `BGE` `BLTU` `BGEU` |
| Jumps | `JAL` `JALR` |
| Upper imm | `LUI` `AUIPC` |
| System | `ECALL` `EBREAK` |

### RV32M multiply/divide extension

| Instruction | Operation |
|-------------|-----------|
| `MUL` | Lower 32 bits of rs1 × rs2 (signed) |
| `MULH` | Upper 32 bits of rs1 × rs2 (signed × signed) |
| `MULHSU` | Upper 32 bits of rs1 × rs2 (signed × unsigned) |
| `MULHU` | Upper 32 bits of rs1 × rs2 (unsigned × unsigned) |
| `DIV` | Signed integer division |
| `DIVU` | Unsigned integer division |
| `REM` | Signed remainder |
| `REMU` | Unsigned remainder |

---

## How ELF loading works

The emulator always starts execution at address `0x0`. When an ELF with a non-zero entry point is loaded, a 12-byte `_start` stub is written at `0x0`:

```
0x0: LUI  sp, 0x100        # sp = 0x100000 (top of 1 MB memory)
0x4: JAL  ra, <entry>      # ra = 0x8, jump to main()
0x8: ECALL                 # traps when main() returns
```

The ELF's own segments are loaded at their `p_vaddr` addresses (typically `0x10000`+), so the stub sits safely below them.
