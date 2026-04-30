#ifndef EXECUTE_H
#define EXECUTE_H

#include "cpu.h"
#include "decode.h"

void execute(CPU *cpu, DecodedInstr *d);

#ifdef EXECUTE_TEST
void test_execute();
#endif

#endif