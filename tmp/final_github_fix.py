import os

path = 'src/pages/AdminPanel.jsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Surgeon's list: Clean versions of identified broken lines.
# Line numbers here are 1-indexed, matching view_file output.
clean_lines = {
    135: '        alert("Error al subir la imagen. Por favor, intente de nuevo o verifique su conexión.");\n',
    268: '    const shiftData = shifts.map(s => ({ Estación: s.station, Fecha: new Date(s.timestamp).toLocaleString(), Esperado: s.expected_sales, Real: s.actual_cash, Diferencia: s.difference }));\n',
    276: '      return alert("El campo de dinero está vacío o es inválido.");\n',
    304: '    const text = `🌭 *MANOLO FOODTRUCK PARK* 🌭\\n---------------------------\\n*Ticket:* #${order.ticket_number}\\n*Cliente:* ${order.customer_name?.toUpperCase()}\\n---------------------------\\n${itemsText}\\n---------------------------\\n*TOTAL: RD$ ${order.total_price}.00*\\n\\n¡Gracias por preferirnos!`;\n'
}

for i, clean_text in clean_lines.items():
    if i <= len(lines):
        # We perform a sanity check to make sure we are targeting the right line by looking for 
        # keywords that should be there despite the corruption.
        keywords = {
            135: 'alert("Error',
            268: 'shiftData = shifts',
            276: 'alert("El campo',
            304: 'MANOLO FOODTRUCK PARK'
        }
        if keywords[i] in lines[i-1]:
            lines[i-1] = clean_text
            print(f"Restored line {i} to clean state.")
        else:
            print(f"WARNING: Line {i} did not contain expected keywords. Skipping to avoid logic destruction.")

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Final surgical cleanup of AdminPanel.jsx complete.")
