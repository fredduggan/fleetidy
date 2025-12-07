#!/usr/bin/env python3
"""
Terminal reflex game: jump when the light is on, or the man loses.

- When the light flips on, hit space (or j/k/Enter) before it turns off.
- If the light switches off before you jump, it's game over.
- Press q to quit between rounds.
"""

import os
import random
import sys
import time
from typing import Optional

TICK_SECONDS = 0.05
ON_DURATION_RANGE = (0.9, 1.6)
OFF_DURATION_RANGE = (0.8, 1.8)
JUMP_KEYS = {" ", "j", "k", "\r"}  # Multiple keys to make reacting easier.


class InputWatcher:
    """Non-blocking single-character input for POSIX and Windows terminals."""

    def __enter__(self):
        if os.name == "nt":
            return self

        if not sys.stdin.isatty():
            raise RuntimeError("Run this script from an interactive terminal.")

        import termios
        import tty

        self._fd = sys.stdin.fileno()
        self._old = termios.tcgetattr(self._fd)
        tty.setcbreak(self._fd)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if os.name != "nt" and hasattr(self, "_old"):
            import termios

            termios.tcsetattr(self._fd, termios.TCSADRAIN, self._old)

    def read_key(self) -> Optional[str]:
        if os.name == "nt":
            import msvcrt

            if msvcrt.kbhit():
                return msvcrt.getch().decode("utf-8", errors="ignore")
            return None

        import select

        ready, _, _ = select.select([sys.stdin], [], [], 0)
        if ready:
            return sys.stdin.read(1)
        return None


def render_state(state: str, score: int, time_left: float):
    light = "ON " if state == "on" else "off"
    bar_width = 20
    filled = max(0, min(bar_width, int((time_left / max(ON_DURATION_RANGE)) * bar_width)))
    bar = "#" * filled + "-" * (bar_width - filled)
    sys.stdout.write(
        f"\rLight: {light} | Score: {score} | Time left: {time_left:0.2f}s | [{bar}]  "
    )
    sys.stdout.flush()


def run():
    print(
        "\nJump when the light is on! Keys: space / j / k / Enter. Press q to quit.\n"
    )

    state = "off"
    jumped = False
    score = 0
    next_switch = time.time() + random.uniform(*OFF_DURATION_RANGE)

    with InputWatcher() as watcher:
        try:
            while True:
                now = time.time()
                remaining = max(0.0, next_switch - now)
                render_state(state, score, remaining)

                key = watcher.read_key()
                if key:
                    if key.lower() == "q":
                        break
                    if state == "on" and key in JUMP_KEYS:
                        jumped = True
                        print("\nJumped! Keep it up.")

                if now >= next_switch:
                    if state == "on":
                        if not jumped:
                            print("\nThe light went off before you jumped. Game over.")
                            break
                        score += 1
                        print(f"\nNice reflexes! Score: {score}")
                        state = "off"
                        next_switch = now + random.uniform(*OFF_DURATION_RANGE)
                        jumped = False
                    else:
                        state = "on"
                        jumped = False
                        next_switch = now + random.uniform(*ON_DURATION_RANGE)
                        print("\nThe light is ON! Jump!")

                time.sleep(TICK_SECONDS)
        except KeyboardInterrupt:
            pass
    print(f"\nFinal score: {score}")


if __name__ == "__main__":
    if os.name != "nt" and not sys.stdin.isatty():
        sys.exit("Run this game from an interactive terminal.")
    run()
