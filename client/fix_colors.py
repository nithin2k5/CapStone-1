import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacements
    # For bg-white/5, bg-white/10 etc on dark mode, we want bg-foreground/5 (which is black in light mode, white in dark mode - wait, foreground in dark mode is #e0e0e0)
    # Actually, bg-foreground/5 works perfectly for both modes! It's slightly white on black, and slightly black on white.
    new_content = content.replace('text-white', 'text-foreground')
    new_content = new_content.replace('bg-white/5', 'bg-foreground/5')
    new_content = new_content.replace('bg-white/10', 'bg-foreground/10')
    new_content = new_content.replace('bg-white/20', 'bg-foreground/20')
    
    new_content = new_content.replace('border-white/5', 'border-border')
    new_content = new_content.replace('border-white/10', 'border-border')
    new_content = new_content.replace('border-white/20', 'border-border')
    new_content = new_content.replace('border-white/30', 'border-border')
    
    new_content = new_content.replace('text-gray-400', 'text-muted-foreground')
    new_content = new_content.replace('text-gray-500', 'text-muted-foreground')
    
    # fix any double replacements if they occurred (like text-muted-foreground hover:text-foreground where it used to be text-gray-400 hover:text-white)
    # Actually we just did text-white -> text-foreground, so it's fine.

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('app'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

for root, dirs, files in os.walk('components'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
