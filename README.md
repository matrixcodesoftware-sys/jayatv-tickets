# ANIVERSARIO JAYATV — página de entradas

## Cómo correrlo en tu compu (Visual Studio Code)

1. Instalá [Node.js](https://nodejs.org/) si no lo tenés (versión 18 o más nueva).
2. Abrí esta carpeta (`jayatv-tickets`) en VS Code.
3. Abrí una terminal dentro de VS Code (`Terminal` → `New Terminal`) y corré:
   ```
   npm install
   npm run dev
   ```
4. Te va a tirar un link tipo `http://localhost:5173` — abrilo en el navegador (o en el celu si están en la misma wifi, usando la IP que te muestra la terminal).

## Qué tiene hecho

- Elegir entrada General o VIP
- Crear cuenta con Gmail + contraseña
- Formulario de compra (nombre, apellido, cantidad)
- Resumen con cargo por servicio
- Pago simulado
- Confirmación con un QR por entrada
- Link de RRPP: agregale `?rrpp=nombre` a la URL (ej: `http://localhost:5173/?rrpp=juan`)
- Panel de organizador (contraseña: `jayatv2026`) para cambiar precios, fecha, lugar, % de cargo, comisión RRPP, y ver ventas

Los datos (cuentas, ventas, configuración) se guardan en el `localStorage` del navegador — o sea, quedan guardados en esa compu/navegador, pero no se comparten automáticamente entre distintos dispositivos. Para que todos vean las mismas ventas en tiempo real (vos, tu hermano, la puerta del evento) hace falta un backend real (ver abajo).

## Lo que falta para que sea 100% real

1. **Pago real con Mercado Pago:** hay que crear una cuenta de Mercado Pago, sacar las credenciales (access token), y conectar su Checkout Pro o Checkout API donde ahora está el botón de "pago de prueba".
2. **Envío de mail automático con los QR:** hace falta un servicio de email (por ejemplo Resend, SendGrid, o un backend propio) que se dispare cuando se confirma la compra.
3. **Base de datos compartida:** para que las ventas se vean desde cualquier dispositivo (no solo en el navegador que compró), conviene un backend simple (por ejemplo Supabase, Firebase, o un servidor propio) en vez de `localStorage`.
4. **Publicarla en internet:** una vez lista, se sube a un hosting (Vercel, Netlify, etc.) para tener una URL pública real.

Puedo ayudarte con cualquiera de estos pasos cuando quieras avanzar.
