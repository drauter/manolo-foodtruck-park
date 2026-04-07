import shutil
import os

# Ensure tmp exists
if not os.path.exists('tmp'):
    os.makedirs('tmp')

shutil.copy('src/pages/AdminPanel.jsx', 'tmp/AdminPanel_backup.jsx')

with open('src/pages/AdminPanel.jsx', 'r', encoding='latin-1') as f:
    content = f.read()

with open('src/pages/AdminPanel.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Listo - encoding corregido')
