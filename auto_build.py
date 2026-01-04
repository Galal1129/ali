import subprocess
import time
import os

os.environ['EXPO_TOKEN'] = 't67dFVu9db_mswhd3k0t7bpMStVmQkOn7hBDFMBo'

try:
    import pexpect
    
    print("Starting EAS build with automatic responses...")
    
    child = pexpect.spawn('./node_modules/.bin/eas build --platform android --profile production', 
                         encoding='utf-8', timeout=600)
    child.logfile = open('build_log.txt', 'w')
    
    try:
        # Wait for project creation prompt
        index = child.expect(['Would you like to automatically create an EAS project', 
                            'Using remote Android credentials',
                            pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        
        if index == 0:
            print("Responding 'y' to create project...")
            child.sendline('y')
            time.sleep(2)
            
        # Continue waiting for other prompts or completion
        while True:
            index = child.expect(['Using remote Android credentials',
                                'Waiting for build',
                                'Build failed',
                                'Build finished',
                                pexpect.EOF,
                                pexpect.TIMEOUT], timeout=600)
            
            if index in [2, 3, 4]:  # EOF, finished, or timeout
                break
                
            print(f"Status: {child.before}")
            
    except Exception as e:
        print(f"Error during build: {e}")
        print(f"Last output: {child.before}")
        
    child.close()
    print("\nBuild process completed. Check build_log.txt for details.")
    
except ImportError:
    print("pexpect not installed, trying alternative method...")
    subprocess.run(['pip', 'install', 'pexpect'], check=True)
    print("Please run the script again.")
    
