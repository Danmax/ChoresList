"""Create original toy-phone effects and standard DTMF pairs (no dependencies)."""
import math
import pathlib
import struct
import wave

RATE = 24000
ROOT = pathlib.Path(__file__).resolve().parents[1] / "public/games/melody/audio"
ROOT.mkdir(parents=True, exist_ok=True)

def save(name, duration, sample):
    samples = [max(-0.85, min(0.85, sample(i / RATE))) for i in range(int(duration * RATE))]
    with wave.open(str(ROOT / (name + ".wav")), "wb") as output:
        output.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        output.writeframes(struct.pack("<" + "h" * len(samples), *(int(value * 32767) for value in samples)))

def sine(frequency, time):
    return math.sin(2 * math.pi * frequency * time)

def envelope(time, duration, attack=0.008):
    return max(0, min(1, time / attack, (duration - time) / 0.025))

def notes(time, frequencies, interval=0.16):
    index = int(time / interval)
    if index >= len(frequencies):
        return 0
    local = time % interval
    return 0.3 * sine(frequencies[index], local) * math.exp(-local * 10) * envelope(local, interval)

pairs = [(941, 1336), (697, 1209), (697, 1336), (697, 1477), (770, 1209),
         (770, 1336), (770, 1477), (852, 1209), (852, 1336), (852, 1477)]
for digit, (low, high) in enumerate(pairs):
    save("key-" + str(digit), 0.16, lambda t, low=low, high=high: 0.19 * (sine(low, t) + sine(high, t)) * envelope(t, 0.16))

def classic(time):
    local = time if time < 0.5 else time - 0.73
    if not 0 <= local < 0.5:
        return 0
    tremolo = 0.55 + 0.45 * sine(20, time)
    return 0.24 * (sine(440, time) + sine(480, time)) * tremolo * envelope(local, 0.5)

save("ring-classic", 1.65, classic)
save("ring-bouncy", 1.65, lambda t: notes(t, [659.25, 523.25, 783.99, 659.25, 523.25, 783.99], 0.22))
save("ring-sparkle", 1.65, lambda t: notes(t, [783.99, 987.77, 1174.66, 1567.98, 1174.66, 987.77], 0.22))
save("outgoing", 1.1, lambda t: 0.17 * (sine(440, t) + sine(480, t)) * envelope(t, 0.8) if t < 0.8 else 0)
save("connect", 0.3, lambda t: notes(t, [660, 880], 0.15))
save("hangup", 0.32, lambda t: notes(t, [440, 330], 0.16))
save("success", 0.8, lambda t: notes(t, [523.25, 659.25, 783.99, 1046.5], 0.2))
save("pop", 0.22, lambda t: 0.4 * sine(900 - 2200 * t, t) * math.exp(-t * 22) * envelope(t, 0.22))
save("boing", 0.75, lambda t: 0.28 * sine(240 + 90 * math.sin(t * 30) * math.exp(-t * 3), t) * math.exp(-t * 5) * envelope(t, 0.75))
save("sparkle", 0.8, lambda t: notes(t, [1046.5, 1318.51, 1567.98, 2093], 0.17))
save("unlock", 0.08, lambda t: 0)
print("Created 20 original telephone and toy sound effects in", ROOT)
