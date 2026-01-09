#!/usr/bin/expect -f

set timeout -1

spawn bash -c "export EXPO_TOKEN=ZO6ucB1r6vpVhPc5JrxRqu86_Sbx21pAC1LmujwI && npx eas-cli build --platform android --profile preview"

expect {
    "Generate a new Android Keystore?" {
        send "\r"
        exp_continue
    }
    "Select platform" {
        send "\r"
        exp_continue
    }
    "?" {
        send "\r"
        exp_continue
    }
    eof
}
