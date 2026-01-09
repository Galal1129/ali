#!/usr/bin/env python3
import pexpect
import sys
import os

# Set environment variables
os.environ['EXPO_TOKEN'] = 'DidnkNik64Xc4qVEmPRJHK-ceFS3Pn3GrQPcfPrK'

print("Starting EAS build with automatic keystore generation...")

# Start the EAS build command
child = pexpect.spawn(
    'npx eas-cli build --platform android --profile preview',
    encoding='utf-8',
    timeout=600
)

# Set stdout to see real-time output
child.logfile = sys.stdout

try:
    # Wait for keystore generation prompt
    index = child.expect([
        'Generate a new Android Keystore?',
        'Which build profile do you want to configure?',
        pexpect.EOF,
        pexpect.TIMEOUT
    ], timeout=120)

    if index == 0:
        print("\n[AUTO] Answering 'yes' to generate new keystore...")
        child.sendline('yes')

        # Wait for build to start or complete
        child.expect(pexpect.EOF, timeout=600)

    elif index == 1:
        print("\n[AUTO] Selecting preview profile...")
        child.sendline('preview')

        # Wait for keystore prompt again
        child.expect('Generate a new Android Keystore?', timeout=60)
        print("\n[AUTO] Answering 'yes' to generate new keystore...")
        child.sendline('yes')

        # Wait for build completion
        child.expect(pexpect.EOF, timeout=600)

    print("\nBuild command completed!")
    sys.exit(0)

except pexpect.TIMEOUT:
    print("\nTimeout waiting for response")
    sys.exit(1)
except pexpect.EOF:
    print("\nCommand completed")
    sys.exit(child.exitstatus if child.exitstatus is not None else 0)
except Exception as e:
    print(f"\nError: {e}")
    sys.exit(1)
