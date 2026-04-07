import os

path = 'src/pages/AdminPanel.jsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Mapping all identified mojibake patterns to their correct Spanish/Emoji equivalents
fixes = {
    'ÃƒÂ³': 'ó', 'Ã³': 'ó',
    'ÃƒÂ¡': 'á', 'Ã¡': 'á',
    'ÃƒÂ­': 'í', 'Ã­': 'í',
    'ÃƒÂ©': 'é', 'Ã©': 'é',
    'ÃƒÂº': 'ú', 'Ãº': 'ú',
    'ÃƒÂ±': 'ñ', 'Ã±': 'ñ',
    'Ãƒâ€˜': 'Ñ', 'Ã‘': 'Ñ',
    'Ã‚Â¿': '¿', 'Â¿': '¿',
    'Ã‚Â¡': '¡', 'Â¡': '¡',
    'Ã°ÂŸÂŒÂ­Ã‚Â­': '🌭', 'Ã°ÂŸÂŒÂ­': '🌭', 'Ã°Å¸Å’Â': '🌭',
    'Ã°Å¸Å¡Â¨': '🚨', 'Ã¢â‚¬Â¢': '•'
}

# Replace longest patterns first
order = sorted(fixes.keys(), key=len, reverse=True)
for k in order:
    content = content.replace(k, fixes[k])

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restoration Complete.")
