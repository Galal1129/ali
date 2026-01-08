#!/usr/bin/env python3
import os
import subprocess
import time
import sys

EXPO_TOKEN = "ZO6ucB1r6vpVhPc5JrxRqu86_Sbx21pAC1LmujwI"

os.environ["EXPO_TOKEN"] = EXPO_TOKEN

print("Starting EAS build process...")
print("=" * 60)

try:
    process = subprocess.Popen(
        ["npx", "eas-cli", "build", "--platform", "android", "--profile", "preview"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    for line in iter(process.stdout.readline, ''):
        if not line:
            break
        print(line, end='', flush=True)

        if "Generate a new one" in line or "Generate new Keystore" in line:
            print("\n[Auto-response: Generating new keystore]")
            process.stdin.write("\n")
            process.stdin.flush()
            time.sleep(1)

        elif "?" in line or "Select" in line:
            print("\n[Auto-response: Confirming with Enter]")
            process.stdin.write("\n")
            process.stdin.flush()
            time.sleep(1)

    process.wait()

    if process.returncode == 0:
        print("\n" + "=" * 60)
        print("✓ Build started successfully!")
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("✗ Build process exited with code:", process.returncode)
        sys.exit(1)

except KeyboardInterrupt:
    print("\n\nBuild process interrupted by user")
    process.terminate()
    sys.exit(1)
except Exception as e:
    print(f"\n✗ Error: {e}")
    sys.exit(1)
