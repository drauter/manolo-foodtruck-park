import os
import re

path = 'src/pages/AdminPanel.jsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Expanded dictionary mapping identified mojibake patterns to correct UTF-8 Spanish/Emoji
# This includes single, double, and triple encoded variants observed in previous steps.
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

# Sorting by length (descending) is critical for nested patterns to ensure longest matches are fixed first
order = sorted(fixes.keys(), key=len, reverse=True)
for k in order:
    content = content.replace(k, fixes[k])

# FIX FOR LINE 17: Redundant useOrder() destructuring cleanup
# We find the corrupted/redundant line 17 and replace it with a single, clean version.
pattern = r'const \{ products, addProduct, updateProduct, deleteProduct, uploadProductImage, orders, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment, resetSystem, currentUser, logout, shifts, deleteShift, users, addUser, deleteUser, updateUser, addToCart, cart, removeFromCart, clearCart, placeOrder, printerConfig, updatePrinterConfig, voices, selectedVoice, setSelectedVoice, announceOrder, verifyAdminPin \} = useOrder\(\);\s+const \{ products, addProduct, updateProduct, deleteProduct, uploadProductImage, orders, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment, resetSystem, currentUser, logout, shifts, deleteShift, users, addUser, deleteUser, updateUser, addToCart, cart, removeFromCart, clearCart, placeOrder, printerConfig, updatePrinterConfig, voices, selectedVoice, setSelectedVoice, verifyAdminPin \} = useOrder\(\);'
replacement = 'const { products, addProduct, updateProduct, deleteProduct, uploadProductImage, orders, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment, resetSystem, currentUser, logout, shifts, deleteShift, users, addUser, deleteUser, updateUser, addToCart, cart, removeFromCart, clearCart, placeOrder, printerConfig, updatePrinterConfig, voices, selectedVoice, setSelectedVoice, verifyAdminPin } = useOrder();'

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
else:
    # If it's already semi-fixed or slightly different, we do a simpler search/replace for common corruption points on line 17
    line17_clean = 'const { products, addProduct, updateProduct, deleteProduct, uploadProductImage, orders, updateStationStatus, updateOrder, cancelOrder, deleteOrder, deletePayment, resetSystem, currentUser, logout, shifts, deleteShift, users, addUser, deleteUser, updateUser, addToCart, cart, removeFromCart, clearCart, placeOrder, printerConfig, updatePrinterConfig, voices, selectedVoice, setSelectedVoice, verifyAdminPin } = useOrder();'
    content = re.sub(r'const \{ products, addProduct.*?\} = useOrder\(\);(.*?const \{ products, addProduct.*?\} = useOrder\(\);)?', line17_clean, content, count=1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Definitive surgical restoration of AdminPanel.jsx complete.")
