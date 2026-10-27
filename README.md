# El susurro de la madera

Sitio web estático para un taller chileno de decoraciones y regalos de madera. Incluye catálogo con pedidos guardados en el navegador, formulario de contacto y vista de administración.

## Páginas

- `index.html`: portada, estado de administración y aviso de pedido activo.
- `nosotros.html`: historia del taller y equipo renderizado desde JavaScript.
- `servicios.html`: productos, stock, descuento por volumen y guardado de pedidos.
- `contacto.html`: solicitud de pedidos y panel de administración.
- `login.html`: acceso y creación de cuentas en una página independiente.

Abre `index.html` directamente en un navegador. No requiere compilación ni instalación de dependencias. Se necesita conexión a internet para cargar las fuentes y fotografías alojadas externamente.

## Administración de demostración

En `contacto.html`, abre “Acceso de administración” e ingresa `admin` como usuario y `1234` como contraseña. Los pedidos, solicitudes, sesión de demostración, inventario, carritos y notificaciones se guardan en `localStorage` del navegador (`wcOrders`, `wcActiveOrder`, `wcAdminLoggedIn`, `wcProductStock`, `wcUserCarts` y `wcUserNotifications`). El administrador puede eliminar cuentas y enviar notificaciones locales a una cuenta o a todas las cuentas guardadas en ese navegador. No se envían correos electrónicos.

Este acceso es solo una demostración del lado del cliente; las cuentas y sus bandejas solo existen en el navegador donde se crearon y no se sincronizan entre dispositivos. No protege información ni reemplaza autenticación y almacenamiento de servidor para un despliegue real.

Cada cuenta tiene un límite acumulado de 5 unidades por producto. El sitio lo calcula usando los pedidos guardados para esa cuenta en el navegador; al borrar los datos locales también se pierde ese historial.