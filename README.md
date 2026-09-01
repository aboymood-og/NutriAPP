# NutriAPP Clínica - INTA & Porciones 🍏

**NutriAPP Clínica** es una herramienta web de alto rendimiento diseñada específicamente para facilitar el trabajo diario de nutricionistas, dietistas y estudiantes del área de la salud. Permite estructurar pautas alimentarias y Recordatorios de 24 Horas (R24), calcular requerimientos y exportar informes clínicos listos para entregar al paciente en formato PDF.

Destaca por su innovadora **Arquitectura de Dos Bases de Datos**, permitiendo al profesional alternar fluidamente entre el cálculo exacto por 100g usando las tablas del **INTA**, o el uso del sistema práctico de **Porciones de Intercambio**.

---

## ✨ Funcionalidades Principales

### 1. 👥 Gestión Ágil de Pacientes
* **Ficha y Evaluación Antropométrica:** Registro rápido de datos clave (Nombre, Edad, Sexo, Peso y Estatura).
* **Cálculo Automático de IMC:** Obtención inmediata del Índice de Masa Corporal.
* **Paciente Activo y Persistencia Automática:** Todos los pacientes, junto con la base de datos (INTA o Porciones) en la que se está trabajando su pauta, quedan guardados automáticamente en la memoria de tu navegador (LocalStorage).

---

### 2. 🗄️ Arquitectura de Doble Base de Datos (INTA / Porciones)
El sistema cuenta con un interruptor (switch) global que transforma por completo el comportamiento de la aplicación según la metodología de trabajo preferida:

#### 🔹 Modo INTA (Análisis de Precisión)
* Busca entre más de 500 alimentos de la tabla oficial chilena.
* **Calculadora Bidireccional:** Ingresa los gramos consumidos para obtener nutrientes, o ingresa la Meta Calórica (kcal) para saber exactamente cuántos gramos necesitas.
* **Perfiles Clínicos:** Visualiza el "Perfil Completo" (30+ micronutrientes), "Vista Básica" o "Perfil Renal" (Sodio, Potasio, Fósforo).
* **Trazabilidad:** Botón de "Ver Fuente INTA" que abre un escaneo del libro original como respaldo clínico.

#### 🔹 Modo Porciones (Intercambio Práctico)
* Utiliza el listado oficial de Porciones de Intercambio.
* **Calculadora Inteligente de Fracciones:** Solo ingresa el "Nº de Porciones" (ej. 1.5) y la app te entregará los gramos exactos y calculará dinámicamente la **Medida Casera** en tiempo real (ej: *Equivalente a: ½ taza*).
* **Tabla R24 Simplificada:** Al generar la pauta en este modo, la tabla nutricional se reduce elegantemente a los 4 macronutrientes principales (Energía, Proteínas, Lípidos y Carbohidratos), manteniendo el informe limpio.
* **Respaldo PDF:** Botón "Ver Referencia Porciones" que muestra la página exacta del manual de intercambio.

---

### 3. 🥗 Pauta Dietética y Recordatorio de 24h (R24)
* **Distribución Inteligente:** Asignación de alimentos a los bloques de **Desayuno**, **Almuerzo**, **Once** y **Cena**.
* **Micro-Resúmenes por Comida:** Etiquetas de color individuales para Proteínas, Carbohidratos y Grasas por cada tiempo de comida.
* **Gráfico en Tiempo Real:** Gráfico circular interactivo (Chart.js) con la distribución calórica de macronutrientes.
* **Desglose Nutricional (Tabla Expansible):** Tabla dinámica que cruza la información diaria. Puedes hacer clic en un tiempo de comida (ej: *"Desayuno (+)"*) para expandir y desglosar el aporte de cada ingrediente individualmente.
* **Exportación a PDF Clínico Formal:** Generación en 1 clic de un documento profesional, limpio y en blanco y negro, que incluye el membrete del paciente, el gráfico de macros y la tabla de resumen.

---

## 📂 Estructura del Directorio

El proyecto cuenta con una arquitectura limpia en **Vanilla JS** (HTML, CSS y JS puro sin frameworks externos), ideal para ejecutar de manera local o en servidores estáticos ligeros.

```text
NutriAPP-main/
├── index.html           # Estructura visual de la aplicación web (SPA)
├── README.md            # Documentación del proyecto
├── css/
│   └── style.css        # Estilos visuales, temas y reglas de exportación PDF
├── js/
│   └── app.js           # Lógica clínica, cálculos de nutrientes y manejo de estado
├── data/
│   ├── datos_nutricionales_inta.json # Base de datos hiperdetallada INTA
│   └── porciones.json                # Base de datos de Porciones de Intercambio normalizada
└── assets/
    └── images/
        ├── *.png/jpg                 # Fotografías del manual INTA original
        └── porcionesimages/          # Fotografías del manual de Porciones de Intercambio
```

---

## 🚀 Puesta en Marcha

Dado que la aplicación consume las bases de datos en formato JSON local, es obligatorio ejecutarla mediante un servidor web local para evitar errores de CORS:

1. **Opción Visual Studio Code:** Abre la carpeta en VS Code e instala la extensión **Live Server**. Haz clic en el botón **"Go Live"** en la barra inferior.
2. **Opción Python:** Si tienes Python instalado, ejecuta esto en la terminal dentro de la carpeta:
   ```bash
   python -m http.server 8000
   ```
   Luego abre en el navegador `http://localhost:8000`.
3. **Opción Node.js:** Ejecuta `npx serve` o `npx http-server` en el directorio raíz.
