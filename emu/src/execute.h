#ifndef EXECUTE_H
#define EXECUTE_H

#include "cpu.h"
#include "decode.h"

void execute(CPU *cpu, DecodedInstr *d);

#endif