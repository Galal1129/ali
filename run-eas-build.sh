#!/bin/bash

export EXPO_TOKEN="DidnkNik64Xc4qVEmPRJHK-ceFS3Pn3GrQPcfPrK"

echo "Starting EAS build with automatic keystore generation..."

# Use script to create a PTY and pipe yes into it
script -q -c "yes 2>/dev/null | npx eas-cli build --platform android --profile preview" /dev/null
