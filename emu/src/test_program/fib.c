#define TARGET 10

int fib_sequence(int curr, int prev, int ittr) {
  if (ittr == TARGET)
    return curr;
  return fib_sequence(curr + prev, curr, ittr + 1);
}

int main() {
  int res = fib_sequence(1, 0, 0);
  return res;
}