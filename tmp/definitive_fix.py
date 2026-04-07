import os

path = 'src/pages/AdminPanel.jsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Definitve mapping of mojibake patterns to clean UTF-8 Spanish/Emoji
fixes = {
    'ÃƒÂ³': 'ó',
    'Ã³': 'ó',
    'Ãƒ¡': 'á',
    'Ã¡': 'á',
    'ÃƒÂ­': 'í',
    'Ã­': 'í',
    'ÃƒÂ©': 'é',
    'Ã©': 'é',
    'ÃƒÂº': 'ú',
    'Ãº': 'ú',
    'ÃƒÂ±': 'ñ',
    'Ã±': 'ñ',
    'Ãƒâ€˜': 'Ñ',
    'Ã‘': 'Ñ',
    'Ã‚Â¿': '¿',
    'Â¿': '¿',
    'Ã‚Â¡': '¡',
    'Â¡': '¡',
    'Ã°ÂŸÂŒÂ­Ã‚Â­': '🌭',
    'Ã°ÂŸÂŒÂ­': '🌭',
    'Ã°Å¸Å’Â': '🌭',
    'Ã°Å¸Å¡Â¨': '🚨',
    'Ã¢â‚¬Â¢': '•',
    'ÃƒÂ’': 'Ó',
    'ÃƒÂš': 'Ú',
    'ÃƒÂ‘': 'Ñ'
}

# Apply replacements; sorting by length handles nested patterns correctly
order = sorted(fixes.keys(), key=len, reverse=True)
for k in order:
    content = content.replace(k, fixes[k])

# Final logic check for line 17 and line 268 (common corruption points)
# We ensure the useOrder() destructuring is clean
if 'const { products, addProduct' in content:
    # We find the start of line 17 and replace it with a guaranteed clean version
    import re
    content = re.sub(r'const \{ products, addProduct.*?\} = useOrder\(\);', 
                     'const { products, addProduct, updateProduct, deleteProduct, uploadProductImage, orders, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment, resetSystem, currentUser, logout, shifts, deleteShift, users, addUser, deleteUser, updateUser, addToCart, cart, removeFromCart, clearCart, placeOrder, printerConfig, updatePrinterConfig, voices, selectedVoice, setSelectedVoice, verifyAdminPin } = useOrder();', 
                     content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Definitive restoration of AdminPanel.jsx complete.")
