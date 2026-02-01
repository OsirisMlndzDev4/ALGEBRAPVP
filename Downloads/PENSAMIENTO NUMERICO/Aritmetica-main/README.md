# 🧮 Aritmética PvP

> **Batalla de Ingenio Matemático**  
> Desafía a tus amigos en este vibrante juego de cartas y estrategia matemática.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)

## 📖 Descripción

**Aritmética PvP** es un juego de estrategia por turnos donde dos jugadores compiten para reducir la vida del oponente a cero utilizando el poder de las matemáticas. 

Cada turno, los jugadores reciben una "Mano" de cartas (números) y un "Target" (número objetivo). El reto consiste en combinar tus cartas usando operaciones básicas (+, -, *, /) y paréntesis para acercarte lo más posible al objetivo. ¡Cuanto más exacta sea tu fórmula, más daño infligirás!

El juego cuenta con un diseño moderno, efectos visuales dinámicos ("Game Juice"), y un sistema de retroalimentación sonora que hace que cada cálculo se sienta impactante.

## ✨ Características Principales

*   **⚔️ PvP Local**: Juega contra un amigo en el mismo dispositivo.
*   **🤖 Modo Demo (CPU vs CPU)**: Observa cómo la IA resuelve problemas matemáticos automáticamente.
*   **🎯 Sistema de Target Dinámico**: Objetivos generados proceduralmente basados en la dificultad.
*   **🔥 Bonus de Racha**: Encadena aciertos perfectos para aumentar tu multiplicador de daño y desbloquear efectos visuales intensos.
*   **🧠 Bonus por Complejidad**: Usa paréntesis para ganar daño extra.
*   **🎨 Game Juice**:
    *   Partículas y efectos de impacto.
    *   Sacudida de pantalla (Screen Shake) en golpes críticos.
    *   Confeti y fanfarria al ganar.
*   **🔊 Diseño Sonoro**: Efectos de sonido para interacciones, aciertos y errores (con opción de Mute).
*   **🏳️ Rendición Táctica**: Opción de rendirse si el cálculo es imposible, recibiendo una penalización menor que un fallo crítico.

## 🛠️ Tecnologías

Este proyecto está construido con un stack moderno y eficiente:

*   **[React 19](https://react.dev/)**: Biblioteca principal para la interfaz de usuario.
*   **[Vite](https://vitejs.dev/)**: Entorno de desarrollo ultrarrápido.
*   **CSS3 Variables & Animations**: Estilizado nativo para máximo rendimiento y flexibilidad.
*   **[Lucide React](https://lucide.dev/)**: Iconografía limpia y morderna.
*   **ESLint**: Para asegurar la calidad del código.

## 🚀 Instalación y Ejecución

Asegúrate de tener [Node.js](https://nodejs.org/) instalado en tu sistema.

1.  **Clonar o Descargar** el repositorio.
2.  **Instalar dependencias**:
    ```bash
    npm install
    ```
3.  **Iniciar el servidor de desarrollo**:
    ```bash
    npm run dev
    ```
4.  Abrir el navegador en la URL indicada (usualmente `http://localhost:5173`).

### Scripts Disponibles

*   `npm run dev`: Inicia el entorno de desarrollo.
*   `npm run build`: Construye la aplicación para producción.
*   `npm run lint`: Ejecuta el linter para buscar errores.
*   `npm run preview`: Previsualiza la build de producción localmente.

## 🎮 Cómo Jugar

1.  **Inicio**: Selecciona la dificultad (Easy, Medium, Hard) y presiona "Start Game".
2.  **Turno**:
    *   Observa el número **Target** en el centro.
    *   Usa las **Cartas numéricas** en tu mano.
    *   Añade **Operadores** (+, -, *, /) y **Paréntesis** desde el panel de control.
    *   Construye una expresión matemática que dé como resultado el Target.
3.  **Ataque**:
    *   Presiona **"ATACAR"** para lanzar tu hechizo.
    *   **Daño Base**: Basado en la complejidad de tu fórmula y cartas usadas.
    *   **Precisión**: Si el resultado no es exacto, el daño se reduce según la diferencia.
4.  **Victoria**: Reduce los HP de tu oponente a 0 para ganar.

## 📂 Estructura del Proyecto

```text
src/
├── components/       # Componentes React
│   ├── Game/         # Componentes del juego (Arena, Cartas, Tablero)
│   ├── Menus/        # Pantallas de Menú, GameOver, Setup
│   └── Demo/         # Pantalla de demostración CPU
├── styles/           # Archivos CSS modulares
├── utils/            # Lógica y ayudantes
│   ├── gameLogic.js  # Reglas matemáticas y generación de niveles
│   ├── cpuPlayer.js  # Lógica de la IA
│   └── SoundManager.js # Controlador de audio
├── App.jsx           # Componente raíz y gestión de estado global
└── main.jsx          # Punto de entrada
```

---
