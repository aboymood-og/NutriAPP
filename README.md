# NutriAPP Clínica - Base de Datos INTA 🍏

**NutriAPP** es una herramienta web diseñada específicamente para facilitar el trabajo diario de nutricionistas, dietistas y estudiantes del área de la salud. Permite calcular requerimientos, consultar la composición nutricional de los alimentos según las tablas oficiales del **INTA**, comparar alimentos lado a lado, estructurar pautas alimentarias o Recordatorios de 24 Horas (R24) y exportar informes clínicos listos para entregar al paciente en formato PDF.

---

## ✨ Funcionalidades Principales

### 1. 👥 Gestión Ágil de Pacientes
* **Ficha y Evaluación Antropométrica:** Registro rápido de datos clave (Nombre, Edad, Sexo, Peso y Estatura).
* **Cálculo Automático de IMC:** Obtención inmediata del Índice de Masa Corporal al ingresar los datos antropométricos.
* **Paciente Activo:** Selección de paciente con un solo clic para vincular de inmediato la pauta y los cálculos en curso.
* **Memoria Local:** Todos los pacientes y sus datos quedan guardados automáticamente en tu navegador (LocalStorage), sin riesgo de perder la información al recargar.

---

### 2. 🔍 Explorador y Comparador de Alimentos INTA
* **Filtros por Categoría y Búsqueda Inteligente:** Menú desplegable con todas las familias del libro INTA ordenadas de forma correlativa (2.1 Lácteos, 2.2 Carnes, etc.) combinado con un buscador por nombre de alimento en tiempo real.
* **Comparador Multicolumna (Eje X / Eje Y):** Puedes seleccionar varios alimentos simultáneamente. Cada alimento se despliega como una columna lado a lado, permitiendo una comparación nutricional directa con desplazamiento vertical sincronizado.
* **Calculadora Dual por Alimento:**
  * **Cálculo por Porción (g):** Ingresa los gramos consumidos y calcula al instante todos sus macro y micronutrientes.
  * **Meta Calórica Inversa (kcal):** Escribe las calorías que deseas aportar y la app calculará automáticamente cuántos gramos exactos de ese alimento necesitas.
* **Perfiles Clínicos:** Cambia entre *Perfil Completo*, *Vista Básica* y *Perfil Renal* para enfocar los nutrientes relevantes según el cuadro clínico del paciente.
* **Trazabilidad y Respaldo Oficial ("Ver Fuente INTA"):** Botón en cada alimento para abrir el visor del libro original del INTA. Cuenta con función de **Zoom / Lupa** con un clic para leer tablas pequeñas y respaldo automático si la imagen aún se encuentra en proceso de digitalización.

---

### 3. 🥗 Pauta Dietética y Recordatorio de 24h (R24)
* **Distribución por Tiempos de Comida:** Asignación directa de alimentos a los bloques de **Desayuno**, **Almuerzo**, **Once** y **Cena**.
* **Micro-Resúmenes por Comida:** Cada recuadro de comida muestra al pie de su lista una mini-sección con el total de calorías y etiquetas de color individuales para Proteínas, Carbohidratos y Grasas, sin necesidad de clics extra.
* **Panel de Resumen Diario en Tiempo Real:** Gráfico circular de distribución calórica de macronutrientes acompañado por los totales acumulados del día.
* **Tabla de Desglose Nutricional Completo e Interactivo:**
  * Tabla ubicada bajo la pauta que cruza más de 30 micronutrientes y macronutrientes (vitaminas, minerales, tipos de ácidos grasos, fibra, etc.) por cada tiempo de comida y el total diario.
  * **Despliegue Dinámico por Comida:** Al hacer clic sobre cualquier tiempo de comida (ej: *"Desayuno (+)"*), la tabla expande hacia la derecha los alimentos individuales que componen ese bloque, permitiendo auditar con exactitud el aporte de cada ingrediente.
* **Exportación a PDF Clínico Formal:**
  * Generación en 1 clic de un documento sobrio y profesional en blanco y negro, diseñado para ajustarse de forma limpia y compacta.
  * Incluye encabezado con datos del paciente e IMC, distribución en cuadrícula 2x2 para las comidas, gráfico de macronutrientes ajustado con sus leyendas y la tabla detallada de nutrientes.

---

## 📂 Estructura del Directorio

El proyecto cuenta con una arquitectura limpia y modular:

```text
NutriAPP-main/
├── index.html           # Estructura visual de la aplicación web (SPA)
├── README.md            # Documentación del proyecto
├── css/
│   └── style.css        # Estilos visuales, temas y reglas de exportación PDF
├── js/
│   └── app.js           # Lógica clínica, cálculos de nutrientes y manejo de estado
├── data/
│   └── datos_nutricionales_inta.json # Base de datos estructurada del INTA
└── assets/
    └── images/          # Directorio para las fotos escaneadas de las fuentes INTA
```

---

## 🚀 Puesta en Marcha

Dado que la aplicación consume la base de datos de alimentos en formato JSON local, se recomienda ejecutarla mediante un servidor web local:

1. **Opción VS Code:** Abrir la carpeta en Visual Studio Code y hacer clic en **"Go Live"** con la extensión **Live Server**.
2. **Opción Python:** Ejecutar en la terminal dentro de la carpeta del proyecto:
   ```bash
   python3 -m http.server 8000
   ```
   Luego abrir en el navegador `http://localhost:8000`.
3. **Opción Node.js:** Ejecutar `npx serve` o `npx http-server`.

---

## 📌 Guía de Soporte de Imágenes de Fuentes INTA
Para asociar una fotografía o escaneo del libro oficial a un alimento:
1. Coloca la imagen (ej: `pagina_14.jpg`) dentro de la carpeta `assets/images/`.
2. En `data/datos_nutricionales_inta.json`, agrega o edita el campo `"imagen_fuente"` en el alimento correspondiente:
   ```json
   {
     "categoria": "2.1 Leche y Derivados",
     "alimento": "Leche materna1",
     "imagen_fuente": "pagina_14.jpg",
     "nutrientes": { ... }
   }
   ```
*Si un alimento no tiene imagen asociada aún, la app mostrará un mensaje amigable indicando que está en proceso de digitalización.*\n