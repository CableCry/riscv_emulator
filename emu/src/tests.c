#include <assert.h>
#include <stdio.h>

#define MEM_TEST
#include "mem.h"

void test_memory() {
  Memory m;
  mem_init(&m);

  mem_write32(&m, 0x00, 0xDEADBEEF);
  assert(mem_read32(&m, 0x00) == 0xDEADBEEF);
  assert(mem_read8(&m, 0x00) == 0xEF);
  assert(mem_read8(&m, 0x01) == 0xBE);
  assert(mem_read16(&m, 0x00) == 0xBEEF);

  mem_free(&m);
  printf("Memory tests passed\n");
}

int main() {
  test_memory();
  return 0;
}
