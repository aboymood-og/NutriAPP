# NutriAPP Clínica - INTA 🍏

Aplicación web interactiva (SPA) enfocada en estudiantes y profesionales dedicados a la nutrición clínica. Su propósito es facilitar la gestión de pacientes y acelerar drásticamente los cálculos y la creación de pautas nutricionales, basándose en la base de datos de composición de alimentos del INTA.

## 🚀 Características Principales

*   **Gestión Integral de Pacientes:** Creación de perfiles, evaluación antropométrica, cálculo automático del Índice de Masa Corporal (IMC) y persistencia de datos (guardado en el navegador local).
*   **Buscador Inteligente de Alimentos:** Búsqueda rápida sobre el set de datos del INTA.
*   **Calculadoras Avanzadas:** 
    *   *Por Porción:* Calcula los nutrientes según los gramos especificados.
    *   *Meta Calórica Inversa:* Calcula cuántos gramos de un alimento equivalen a una cierta cantidad de calorías (kcal) deseadas.
*   **Pautas Nutricionales y R24:** Distribuye alimentos en Desayuno, Almuerzo, Once y Cena. Cuenta con un resumen diario, gráficos de macronutrientes interactivos y permite exportar la pauta final a **PDF**.

## 📂 Estructura del Proyecto

Para mantener el proyecto organizado y escalable a medida que crece (por ejemplo, incorporando imágenes reales de fuentes nutricionales), el código fuente sigue esta estructura:

```text
NutriAPP-main/
├── index.html           # Estructura principal y punto de entrada de la aplicación.
├── css/
│   └── style.css        # Hoja de estilos de la aplicación.
├── js/
│   └── app.js           # Lógica principal, manejo de estado, UI y calculadoras.
├── data/
│   └── datos_nutricionales_inta.json # Base de datos JSON de alimentos.
├── assets/
│   └── images/          # Directorio preparado para fuentes, fotos originales, logos, etc.
└── README.md            # Documentación del proyecto.
```

## 🛠️ Tecnologías Utilizadas

*   **HTML5, CSS3 y JavaScript (Vanilla)**: Sin dependencias complejas para asegurar un alto rendimiento y fácil despliegue.
*   **[Chart.js](https://www.chartjs.org/)**: Para la renderización del gráfico dinámico de macronutrientes (Doughnut chart).
*   **[html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)**: Utilizado para generar un PDF profesional con la pauta del paciente directamente en el navegador.

## 💻 Instalación y Uso

La aplicación es completamente funcional en el lado del cliente (Frontend). 

1. Clona o descarga el código fuente.
2. Es altamente recomendable servir el directorio mediante un servidor web local (por ejemplo, usando la extensión **Live Server** en VS Code o ejecutando `npx serve` o `python -m http.server`) para que la llamada `fetch()` al archivo JSON funcione correctamente y no sea bloqueada por las políticas CORS de los navegadores al abrir archivos locales.
3. Ingresa a la URL local (ej. `http://localhost:3000`) para empezar a usar la aplicación.

## 🚧 Próximos Pasos (Roadmap)

*   Agregar soporte de imágenes y validación visual para las fuentes originales de cada alimento.
*   Incorporación de nuevas herramientas y perfiles clínicos.
*   (Futuro) Posible conexión a una base de datos en la nube para sincronización multi-dispositivo.
