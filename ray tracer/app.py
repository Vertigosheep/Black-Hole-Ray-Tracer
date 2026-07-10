from models.black_hole import BlackHole

bh = BlackHole(mass = 10)


print("\n======================================")
print("      SCHWARZSCHILD BLACK HOLE")
print("======================================")

for key, value in bh.summary().items():
    print(f"{key:<25}: {value:.3f}")

print("======================================")