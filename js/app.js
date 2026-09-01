const app = {
    alimentosData: [],
    porcionesData: [],
    dbMode: 'inta',
    selectedFoods: [],
    patients: [],
    currentPatientId: null,
    expandedMeals: { desayuno: false, almuerzo: false, once: false, cena: false },
    plan: {
        desayuno: [],
        almuerzo: [],
        once: [],
        cena: []
    },
    macroChart: null,

    // Diccionarios de vistas
    vistasClinicas: {
        basica: ['Energía (kcal)', 'Proteínas (g)', 'Lípidos totales (g)', 'H de C disp. (g)'],
        renal: ['Energía (kcal)', 'Proteínas (g)', 'Lípidos totales (g)', 'H de C disp. (g)', 'Sodio (mg)', 'Potasio (mg)', 'Fósforo (mg)']
    },

    init: async function() {
        this.loadPatients();
        await this.loadDatabase();
        this.renderPatientsList();
        this.initChart();
        this.updateContextBar();
        this.showView('patients'); // Start on Patients view as recommended
    },

    // --- NAVEGACIÓN ---
    showView: function(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-' + viewId).classList.remove('hidden');
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('nav-' + viewId).classList.add('active');

        if (viewId === 'plan') {
            this.updatePlanSummary();
        }
    },

    // --- CONTEXTO DEL PACIENTE ---
    updateContextBar: function() {
        const nameEl = document.getElementById('ctx-patient-name');
        const bmiEl = document.getElementById('ctx-patient-bmi');
        
        if (this.currentPatientId) {
            const p = this.patients.find(p => p.id === this.currentPatientId);
            nameEl.textContent = p.name;
            nameEl.style.color = "var(--secondary-color)";
            bmiEl.textContent = p.bmi;
        } else {
            nameEl.textContent = "Ninguno seleccionado";
            nameEl.style.color = "var(--text-muted)";
            bmiEl.textContent = "--";
        }
    },

    // --- FASE 1: BASE DE DATOS ---
    loadDatabase: async function() {
        try {
            const responseInta = await fetch('data/datos_nutricionales_inta.json');
            this.alimentosData = await responseInta.json();
            
            const responsePorc = await fetch('data/porciones.json');
            this.porcionesData = await responsePorc.json();
            
            this.populateCategoryFilter();
        } catch (error) {
            console.error("Error loading JSON:", error);
        }
    },

    populateCategoryFilter: function() {
        const data = this.dbMode === 'inta' ? this.alimentosData : this.porcionesData;
        const categories = [...new Set(data.map(item => item.categoria))].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        const select = document.getElementById('category-filter');
        if (select) {
            select.innerHTML = '<option value="">-- Todas las categorías --</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        }
    },

    toggleDbMode: function(mode) {
        if(this.dbMode === mode) return;
        
        const planHasItems = Object.values(this.plan).some(meal => meal.length > 0);
        if(planHasItems) {
            if(!confirm("Al cambiar de base de datos se limpiará la pauta actual para evitar mezclar alimentos incompatibles. ¿Continuar?")) {
                document.getElementById('mode-' + this.dbMode).checked = true;
                return;
            }
            this.clearPlanStateWithoutSaving();
            if(this.currentPatientId) {
                this.savePlanToPatient();
            }
        }
        
        this.dbMode = mode;
        this.clearFoodSelection();
        this.populateCategoryFilter();
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        this.searchFood();
        
        const viewSelector = document.getElementById('view-selector');
        if (viewSelector) {
            viewSelector.style.display = this.dbMode === 'inta' ? 'block' : 'none';
        }
        
        this.renderFullNutrientTable();
    },

    searchFood: function() {
        const query = document.getElementById('search-input').value.toLowerCase();
        const category = document.getElementById('category-filter') ? document.getElementById('category-filter').value : '';
        const resultsList = document.getElementById('search-results');
        resultsList.innerHTML = '';
        
        if (query.length < 2 && category === "") {
            resultsList.innerHTML = '<li class="empty-state" style="padding: 1rem;">Filtra por categoría o ingresa letras para buscar.</li>';
            return;
        }

        const dataSource = this.dbMode === 'inta' ? this.alimentosData : this.porcionesData;
        let filtered = dataSource;
        
        if (category !== "") {
            filtered = filtered.filter(item => item.categoria === category);
        }
        
        if (query.length >= 2) {
            filtered = filtered.filter(item => item.alimento.toLowerCase().includes(query));
        }
        
        // Increase limit since they are filtering
        filtered = filtered.slice(0, 150);

        if (filtered.length === 0) {
            resultsList.innerHTML = '<li class="empty-state" style="padding: 1rem;">No se encontraron resultados.</li>';
            return;
        }

        filtered.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.alimento;
            li.dataset.id = item.alimento;
            
            if (this.selectedFoods.some(f => f.food.alimento === item.alimento)) {
                li.classList.add('active');
            }

            li.onclick = () => {
                li.classList.toggle('active');
                this.toggleFoodSelection(item);
            };
            resultsList.appendChild(li);
        });
    },

    clearFoodSelection: function() {
        this.selectedFoods = [];
        this.renderSelectedFoods();
        
        // Clear active classes from search list
        const resultsList = document.getElementById('search-results');
        if(resultsList) {
            Array.from(resultsList.children).forEach(c => c.classList.remove('active'));
        }
    },

    toggleFoodSelection: function(item) {
        const index = this.selectedFoods.findIndex(f => f.food.alimento === item.alimento);
        if (index > -1) {
            this.selectedFoods.splice(index, 1);
        } else {
            const defaultGrams = this.dbMode === 'porciones' ? parseFloat(item.gramos) || 100 : 100;
            this.selectedFoods.push({
                food: item,
                grams: defaultGrams,
                targetKcal: '',
                portions: 1 // for porciones mode
            });
        }
        this.renderSelectedFoods();
    },

    multiplyMeasureText: function(text, multiplier) {
        if(!text || text === 's/i') return text;
        if(multiplier === 1) return text;
        
        function parseFrac(str) {
            if(str === '½') return 0.5;
            if(str === '¼') return 0.25;
            if(str === '¾') return 0.75;
            if(str === '1/3') return 0.333;
            if(str === '2/3') return 0.666;
            if(str === '1/2') return 0.5;
            if(str === '1/4') return 0.25;
            if(str === '3/4') return 0.75;
            return null;
        }
        
        function formatFrac(val) {
            const whole = Math.floor(val);
            const rem = val - whole;
            let fracStr = "";
            if(Math.abs(rem - 0.25) < 0.05) fracStr = "¼";
            else if(Math.abs(rem - 0.5) < 0.05) fracStr = "½";
            else if(Math.abs(rem - 0.75) < 0.05) fracStr = "¾";
            else if(Math.abs(rem - 0.333) < 0.05) fracStr = "1/3";
            else if(Math.abs(rem - 0.666) < 0.05) fracStr = "2/3";
            else if(rem > 0.01) fracStr = rem.toFixed(2).replace('.00', '');
            
            if(whole > 0 && fracStr) return `${whole} ${fracStr}`;
            if(whole > 0) return `${whole}`;
            if(fracStr) return fracStr;
            return "0";
        }

        return text.replace(/^([\d\s½¼¾\/\.]+)\s*(.*)$/, (match, numStr, unit) => {
            let total = 0;
            const parts = numStr.trim().split(/\s+/);
            parts.forEach(p => {
                const f = parseFrac(p);
                if(f !== null) total += f;
                else total += parseFloat(p) || 0;
            });
            if(total === 0) return text;
            const newTotal = total * multiplier;
            return `${formatFrac(newTotal)} ${unit}`;
        });
    },

    generateNutrientsHtml: function(index) {
        const sel = this.selectedFoods[index];
        const viewType = this.dbMode === 'inta' ? document.getElementById('view-selector').value : 'basica';
        let keysToRender = [];
        if (viewType === 'completa' && this.dbMode === 'inta') {
            keysToRender = Object.keys(sel.food.nutrientes);
        } else {
            keysToRender = this.vistasClinicas[viewType] || this.vistasClinicas.basica;
        }

        let nutrientsHtml = '';
        keysToRender.forEach(key => {
            if (sel.food.nutrientes[key] !== undefined) {
                const originalValue = sel.food.nutrientes[key];
                const calcValue = this.calculateNutrientValue(originalValue, sel.grams);
                nutrientsHtml += `
                    <div class="nutrient-card" style="padding: 0.5rem; margin-bottom: 0.5rem;">
                        <small>${key}</small>
                        <span style="display:block;">${calcValue}</span>
                    </div>
                `;
            }
        });
        return nutrientsHtml;
    },

    renderSelectedFoods: function() {
        const container = document.getElementById('foods-comparison-container');
        const emptyState = document.getElementById('food-detail-empty');
        const controls = document.getElementById('foods-controls');
        
        document.getElementById('selected-count').textContent = this.selectedFoods.length;

        if (this.selectedFoods.length === 0) {
            container.classList.add('hidden');
            controls.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        controls.classList.remove('hidden');
        container.classList.remove('hidden');
        
        container.innerHTML = '';

        this.selectedFoods.forEach((sel, index) => {
            const nutrientsHtml = this.generateNutrientsHtml(index);

            const col = document.createElement('div');
            col.style.minWidth = "280px";
            col.style.maxWidth = "300px";
            col.style.border = "1px solid var(--border-color)";
            col.style.borderRadius = "var(--radius-md)";
            col.style.background = "var(--surface)";
            col.style.display = "flex";
            col.style.flexDirection = "column";

            let calcSection = '';
            let referenceButton = '';
            
            if (this.dbMode === 'inta') {
                calcSection = `
                    <div class="form-group">
                        <label>Porción (g)</label>
                        <input type="number" id="calc-grams-${index}" value="${sel.grams}" oninput="app.calculateByGrams(${index})">
                    </div>
                    <div class="form-group">
                        <label>Meta (kcal)</label>
                        <input type="number" id="calc-kcal-${index}" value="${sel.targetKcal}" placeholder="Opcional" oninput="app.calculateByKcal(${index})">
                    </div>
                `;
                referenceButton = `<button class="btn-secondary" onclick="app.showSourceModal(${index})" style="width: 100%;">Ver Fuente INTA</button>`;
            } else {
                const medidaOriginal = sel.food.medida_casera || '';
                const medidaActual = this.multiplyMeasureText(medidaOriginal, sel.portions);
                calcSection = `
                    <div class="form-group">
                        <label>Nº Porciones</label>
                        <input type="number" step="0.25" id="calc-portions-${index}" value="${sel.portions}" oninput="app.calculateByPortions(${index})">
                    </div>
                    <div class="form-group">
                        <label>Gramos (g)</label>
                        <input type="number" id="calc-grams-${index}" value="${sel.grams}" oninput="app.calculateByGramsPortion(${index})">
                    </div>
                    <div style="width: 100%; margin-top: 0.8rem; text-align: center; color: var(--secondary-color); font-size: 0.85rem; padding: 0.5rem; background: rgba(59, 130, 246, 0.05); border-radius: var(--radius-md);">
                        Equivalente a:<br>
                        <strong style="font-size: 1.1rem; display: block; margin: 0.2rem 0;" id="calc-measure-${index}">${medidaActual}</strong>
                        <small style="color: var(--text-muted); font-weight: normal;">(1 porción = ${medidaOriginal})</small>
                    </div>
                `;
                referenceButton = `<button class="btn-secondary" onclick="app.showSourceModal(${index})" style="width: 100%;">Ver Referencia Porciones</button>`;
            }

            col.innerHTML = `
                <div class="food-header" style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start;">
                    <h3 style="margin: 0; font-size: 1rem; word-break: break-word;">${sel.food.alimento}</h3>
                    <button class="btn-text text-danger" onclick="app.removeSelectedFood(${index})" style="padding: 0; min-width: auto;">&times;</button>
                </div>
                
                <div class="calculator-section" style="padding: 1rem; background-color: var(--background); border-bottom: 1px solid var(--border-color);">
                    ${calcSection}
                    <div class="form-group" style="margin-top: 1rem;">
                        <label>Asignar a:</label>
                        <select id="meal-selector-${index}">
                            <option value="desayuno">Desayuno</option>
                            <option value="almuerzo">Almuerzo</option>
                            <option value="once">Once</option>
                            <option value="cena">Cena</option>
                        </select>
                    </div>
                    <button class="btn-primary" style="width: 100%; margin-top: 0.5rem;" onclick="app.addToPlan(${index})">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 5px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        Añadir a Pauta
                    </button>
                </div>

                <div class="nutrients-section" id="nutrients-section-${index}" style="padding: 1rem; flex-grow: 1;">
                    ${nutrientsHtml}
                </div>
                
                <div style="padding: 1rem; border-top: 1px solid var(--border-color); text-align: center; background: var(--background);">
                    ${referenceButton}
                </div>
            `;
            container.appendChild(col);
        });
    },

    removeSelectedFood: function(index) {
        const item = this.selectedFoods[index].food;
        this.selectedFoods.splice(index, 1);
        
        const resultsList = document.getElementById('search-results');
        Array.from(resultsList.children).forEach(li => {
            if (li.dataset.id === item.alimento) {
                li.classList.remove('active');
            }
        });

        this.renderSelectedFoods();
    },

    calculateNutrientValue: function(value, grams) {
        if (value === "s/i" || value === undefined || value === null || isNaN(value)) {
            return "s/i";
        }
        return ((parseFloat(value) / 100) * grams).toFixed(2);
    },

    calculateByGrams: function(index) {
        const gramsInput = document.getElementById(`calc-grams-${index}`).value;
        this.selectedFoods[index].grams = parseFloat(gramsInput) || 0;
        this.selectedFoods[index].targetKcal = '';
        
        const kcalInput = document.getElementById(`calc-kcal-${index}`);
        if(kcalInput) kcalInput.value = '';
        
        const nutrientsDiv = document.getElementById(`nutrients-section-${index}`);
        if(nutrientsDiv) nutrientsDiv.innerHTML = this.generateNutrientsHtml(index);
    },

    calculateByKcal: function(index) {
        const targetKcal = parseFloat(document.getElementById(`calc-kcal-${index}`).value) || 0;
        const kcalPer100 = parseFloat(this.selectedFoods[index].food.nutrientes['Energía (kcal)']);
        
        if (kcalPer100 && !isNaN(kcalPer100) && kcalPer100 > 0) {
            const gramsNeeded = (targetKcal * 100) / kcalPer100;
            this.selectedFoods[index].grams = gramsNeeded;
            this.selectedFoods[index].targetKcal = targetKcal;
            
            const gramsInput = document.getElementById(`calc-grams-${index}`);
            if(gramsInput) gramsInput.value = gramsNeeded.toFixed(2);
            
            const nutrientsDiv = document.getElementById(`nutrients-section-${index}`);
            if(nutrientsDiv) nutrientsDiv.innerHTML = this.generateNutrientsHtml(index);
        }
    },

    calculateByPortions: function(index) {
        const portionsInput = parseFloat(document.getElementById(`calc-portions-${index}`).value) || 0;
        const baseGrams = parseFloat(this.selectedFoods[index].food.gramos) || 100;
        
        this.selectedFoods[index].portions = portionsInput;
        this.selectedFoods[index].grams = portionsInput * baseGrams;
        
        const gramsInput = document.getElementById(`calc-grams-${index}`);
        if(gramsInput) gramsInput.value = this.selectedFoods[index].grams.toFixed(2);
        
        const nutrientsDiv = document.getElementById(`nutrients-section-${index}`);
        if(nutrientsDiv) nutrientsDiv.innerHTML = this.generateNutrientsHtml(index);
        
        const measureSpan = document.getElementById(`calc-measure-${index}`);
        if(measureSpan) measureSpan.textContent = this.multiplyMeasureText(this.selectedFoods[index].food.medida_casera, portionsInput);
    },

    calculateByGramsPortion: function(index) {
        const gramsInput = parseFloat(document.getElementById(`calc-grams-${index}`).value) || 0;
        const baseGrams = parseFloat(this.selectedFoods[index].food.gramos) || 100;
        
        this.selectedFoods[index].grams = gramsInput;
        this.selectedFoods[index].portions = gramsInput / baseGrams;
        
        const portionsInput = document.getElementById(`calc-portions-${index}`);
        if(portionsInput) portionsInput.value = this.selectedFoods[index].portions.toFixed(2);
        
        const nutrientsDiv = document.getElementById(`nutrients-section-${index}`);
        if(nutrientsDiv) nutrientsDiv.innerHTML = this.generateNutrientsHtml(index);
        
        const measureSpan = document.getElementById(`calc-measure-${index}`);
        if(measureSpan) measureSpan.textContent = this.multiplyMeasureText(this.selectedFoods[index].food.medida_casera, this.selectedFoods[index].portions);
    },

    addToPlan: function(index) {
        const sel = this.selectedFoods[index];
        if (!sel || !sel.food) return;

        if (!this.currentPatientId) {
            if(!confirm("No tienes un paciente seleccionado. ¿Deseas añadirlo a una pauta temporal de todas formas?")) {
                return;
            }
        }

        const meal = document.getElementById(`meal-selector-${index}`).value;
        const grams = sel.grams;
        
        const item = {
            id: Date.now().toString() + Math.floor(Math.random()*1000),
            alimento: sel.food.alimento,
            gramos: parseFloat(grams.toFixed(2)),
            nutrientesOrig: sel.food.nutrientes
        };

        this.plan[meal].push(item);
        this.renderPlan();
        
        if (this.currentPatientId) {
            this.savePlanToPatient();
        }

        alert(`Añadido: ${sel.food.alimento} (${item.gramos}g) al ${meal}`);
    },

    removeFromPlan: function(meal, itemId) {
        this.plan[meal] = this.plan[meal].filter(i => i.id !== itemId);
        this.renderPlan();
        if (this.currentPatientId) {
            this.savePlanToPatient();
        }
    },

    renderPlan: function() {
        ['desayuno', 'almuerzo', 'once', 'cena'].forEach(meal => {
            const list = document.querySelector(`#meal-${meal} .meal-items`);
            list.innerHTML = '';
            
            let mealTotals = { 'Energía (kcal)': 0, 'Proteínas (g)': 0, 'H de C disp. (g)': 0, 'Lípidos totales (g)': 0 };

            if (this.plan[meal].length === 0) {
                list.innerHTML = '<li class="empty-state" style="border:none; justify-content:center; padding: 2rem 1rem;">Sin alimentos añadidos</li>';
            }

            this.plan[meal].forEach(item => {
                const li = document.createElement('li');
                const kcal = this.calculateNutrientValue(item.nutrientesOrig['Energía (kcal)'], item.gramos);
                
                Object.keys(mealTotals).forEach(key => {
                    const val = item.nutrientesOrig[key];
                    if (val !== 's/i' && val !== undefined) {
                        mealTotals[key] += (parseFloat(val) / 100) * item.gramos;
                    }
                });
                
                li.innerHTML = `
                    <div class="item-info">
                        <span class="item-name">${item.alimento}</span>
                        <span class="item-meta">${item.gramos}g • ${kcal === 's/i' ? 's/i' : kcal + ' kcal'}</span>
                    </div>
                    <button class="btn-delete" onclick="app.removeFromPlan('${meal}', '${item.id}')" title="Eliminar">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                `;
                list.appendChild(li);
            });

            const summaryDiv = document.getElementById(`summary-${meal}`);
            if (summaryDiv) {
                if (this.plan[meal].length > 0) {
                    summaryDiv.innerHTML = `
                        <div class="ms-total"><strong>${mealTotals['Energía (kcal)'].toFixed(0)}</strong> kcal</div>
                        <div class="ms-macros">
                            <span class="macro-badge protein">P: ${mealTotals['Proteínas (g)'].toFixed(1)}g</span>
                            <span class="macro-badge carbs">C: ${mealTotals['H de C disp. (g)'].toFixed(1)}g</span>
                            <span class="macro-badge fat">G: ${mealTotals['Lípidos totales (g)'].toFixed(1)}g</span>
                        </div>
                    `;
                    summaryDiv.style.display = 'flex';
                } else {
                    summaryDiv.style.display = 'none';
                }
            }
        });
        
        this.updatePlanSummary();
    },

    updatePlanSummary: function() {
        let totals = {
            'Energía (kcal)': 0,
            'Proteínas (g)': 0,
            'H de C disp. (g)': 0,
            'Lípidos totales (g)': 0
        };

        Object.values(this.plan).flat().forEach(item => {
            Object.keys(totals).forEach(key => {
                const val = item.nutrientesOrig[key];
                if (val !== 's/i' && val !== undefined) {
                    totals[key] += (parseFloat(val) / 100) * item.gramos;
                }
            });
        });

        const grid = document.getElementById('totals-grid');
        grid.innerHTML = '';
        Object.entries(totals).forEach(([key, value]) => {
            grid.innerHTML += `
                <div class="nutrient-list-item">
                    <span style="color: var(--text-muted);">${key}</span>
                    <strong style="color: var(--primary-color);">${value.toFixed(1)}</strong>
                </div>
            `;
        });

        this.updateChart(totals['Proteínas (g)'], totals['H de C disp. (g)'], totals['Lípidos totales (g)']);
        this.renderFullNutrientTable();
    },



    toggleMealExpansion: function(meal) {
        this.expandedMeals[meal] = !this.expandedMeals[meal];
        this.renderFullNutrientTable();
    },
    renderFullNutrientTable: function() {
        const thead = document.querySelector('#plan-nutrient-table thead');
        const tbody = document.querySelector('#plan-nutrient-table tbody');
        if (!tbody || !thead) return;
        
        let allNutrients = [];
        if(this.dbMode === 'inta' && this.alimentosData.length > 0) {
            allNutrients = Object.keys(this.alimentosData[0].nutrientes).filter(k => k.trim() !== '');
        } else if (this.dbMode === 'porciones') {
            allNutrients = ['Energía (kcal)', 'Proteínas (g)', 'Lípidos totales (g)', 'H de C disp. (g)'];
        }
        
        if (allNutrients.length === 0) return;
        
        const meals = ['desayuno', 'almuerzo', 'once', 'cena'];

        // --- Build THEAD ---
        let theadHtml = '<tr><th>Nutriente</th>';
        meals.forEach(meal => {
            const mealName = meal.charAt(0).toUpperCase() + meal.slice(1);
            if (this.expandedMeals[meal]) {
                theadHtml += `<th class="clickable-th active" onclick="app.toggleMealExpansion('${meal}')">${mealName} <span>(-)</span></th>`;
                this.plan[meal].forEach(item => {
                    const foodName = item.alimento.substring(0, 15) + (item.alimento.length > 15 ? '...' : '');
                    theadHtml += `<th class="expanded-col">${foodName}</th>`;
                });
            } else {
                theadHtml += `<th class="clickable-th" title="Haz clic para desglosar alimentos" onclick="app.toggleMealExpansion('${meal}')">${mealName} <span>(+)</span></th>`;
            }
        });
        theadHtml += '<th class="col-total">Total Diario</th></tr>';
        thead.innerHTML = theadHtml;

        // --- Build TBODY ---
        let tbodyHtml = '';
        allNutrients.forEach(nutrient => {
            let rowHtml = `<td>${nutrient}</td>`;
            let totalDay = 0;

            meals.forEach(meal => {
                let mealTotal = 0;
                let itemCells = '';

                this.plan[meal].forEach(item => {
                    let numVal = 0;
                    const val = item.nutrientesOrig[nutrient];
                    if (val !== 's/i' && val !== undefined && val !== null) {
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed)) numVal = parsed;
                    }
                    const itemTotal = (numVal / 100) * item.gramos;
                    mealTotal += itemTotal;

                    if (this.expandedMeals[meal]) {
                        itemCells += `<td class="expanded-cell">${itemTotal > 0 ? itemTotal.toFixed(1) : '-'}</td>`;
                    }
                });

                if (this.expandedMeals[meal]) {
                    rowHtml += `<td class="subtotal-cell">${mealTotal > 0 ? mealTotal.toFixed(1) : '-'}</td>`;
                    rowHtml += itemCells;
                } else {
                    rowHtml += `<td>${mealTotal > 0 ? mealTotal.toFixed(1) : '-'}</td>`;
                }
                
                totalDay += mealTotal;
            });
            
            rowHtml += `<td class="col-total">${totalDay > 0 ? totalDay.toFixed(1) : '-'}</td>`;
            tbodyHtml += `<tr>${rowHtml}</tr>`;
        });

        tbody.innerHTML = tbodyHtml;
    },
    clearPlan: function() {
        if(confirm("¿Seguro que deseas limpiar todos los alimentos de la pauta actual?")) {
            this.plan = { desayuno: [], almuerzo: [], once: [], cena: [] };
            this.renderPlan();
            if (this.currentPatientId) {
                this.savePlanToPatient();
            }
        }
    },

    // --- FASE 5: GRÁFICO (Chart.js) ---
    initChart: function() {
        const ctx = document.getElementById('macro-chart').getContext('2d');
        this.macroChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Proteínas', 'Carbohidratos', 'Grasas'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: "'Inter', sans-serif" } } }
                }
            }
        });
    },

    updateChart: function(protGrams, choGrams, fatGrams) {
        if (!this.macroChart) return;
        const protKcal = protGrams * 4;
        const choKcal = choGrams * 4;
        const fatKcal = fatGrams * 9;
        
        // If all 0, chart shows nothing, handle fallback visual if needed, but 0 array is fine.
        this.macroChart.data.datasets[0].data = [protKcal, choKcal, fatKcal];
        this.macroChart.update();
    },

    // --- FASE 6: TRAZABILIDAD ---
    showSourceModal: function(index) {
        const sel = this.selectedFoods[index];
        if (!sel || !sel.food) return;
        
        document.getElementById('source-category').textContent = sel.food.categoria || 'Sin Categoría';
        
        const imgContainer = document.getElementById('modal-image-container');
        const placeholder = document.getElementById('modal-placeholder');
        const sourceImg = document.getElementById('source-image');
        
        // Reset zoom
        sourceImg.classList.remove('zoomed');

        if (sel.food.imagen_fuente) {
            const basePath = this.dbMode === 'inta' ? 'assets/images/' : 'assets/images/porcionesimages/';
            sourceImg.src = basePath + sel.food.imagen_fuente;
            imgContainer.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            imgContainer.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }

        document.getElementById('source-modal').classList.remove('hidden');
    },
    
    handleImageError: function() {
        document.getElementById('modal-image-container').classList.add('hidden');
        document.getElementById('modal-placeholder').classList.remove('hidden');
    },

    closeSourceModal: function() {
        document.getElementById('source-modal').classList.add('hidden');
    },

    // --- FASE 8 y 9: PACIENTES ---
    calculateBMI: function() {
        const weight = parseFloat(document.getElementById('patient-weight').value) || 0;
        const heightCm = parseFloat(document.getElementById('patient-height').value) || 0;
        const bmiSpan = document.getElementById('patient-bmi');
        
        if (weight > 0 && heightCm > 0) {
            const heightM = heightCm / 100;
            const bmi = weight / (heightM * heightM);
            bmiSpan.textContent = bmi.toFixed(2);
        } else {
            bmiSpan.textContent = "0.00";
        }
    },

    savePatient: function(e) {
        e.preventDefault();
        const idInput = document.getElementById('patient-id').value;
        
        const patient = {
            id: idInput || Date.now().toString(),
            name: document.getElementById('patient-name').value,
            age: document.getElementById('patient-age').value,
            sex: document.getElementById('patient-sex').value,
            weight: document.getElementById('patient-weight').value,
            height: document.getElementById('patient-height').value,
            bmi: document.getElementById('patient-bmi').textContent,
            planMode: idInput ? (this.patients.find(p => p.id === idInput)?.planMode || this.dbMode) : this.dbMode,
            plan: idInput ? (this.patients.find(p => p.id === idInput)?.plan || this.plan) : { desayuno: [], almuerzo: [], once: [], cena: [] }
        };

        if (idInput) {
            const index = this.patients.findIndex(p => p.id === idInput);
            this.patients[index] = patient;
        } else {
            this.patients.push(patient);
        }

        this.savePatientsToStorage();
        this.renderPatientsList();
        
        // Auto select the new/edited patient
        this.selectPatient(patient.id);
        
        alert("Paciente guardado correctamente.");
    },

    clearPatientForm: function() {
        document.getElementById('form-patient').reset();
        document.getElementById('patient-id').value = '';
        document.getElementById('patient-bmi').textContent = '0.00';
    },

    loadPatients: function() {
        const stored = localStorage.getItem('nutriApp_patients');
        if (stored) {
            this.patients = JSON.parse(stored);
        }
    },

    savePatientsToStorage: function() {
        localStorage.setItem('nutriApp_patients', JSON.stringify(this.patients));
    },

    filterPatients: function(query) {
        query = query.toLowerCase();
        const list = document.getElementById('list-patients');
        Array.from(list.children).forEach(li => {
            const name = li.querySelector('.item-name').textContent.toLowerCase();
            if (name.includes(query)) {
                li.style.display = 'flex';
            } else {
                li.style.display = 'none';
            }
        });
    },

    renderPatientsList: function() {
        const list = document.getElementById('list-patients');
        list.innerHTML = '';
        
        if (this.patients.length === 0) {
            list.innerHTML = '<li class="empty-state">No hay pacientes registrados.</li>';
            return;
        }

        this.patients.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${p.name}</span>
                    <span class="item-meta">IMC: ${p.bmi} | ${p.age} años | Modo: ${p.planMode === 'porciones' ? 'Porciones' : 'INTA'}</span>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-secondary" onclick="app.selectPatient('${p.id}')">Seleccionar</button>
                    <button class="btn-text text-danger" onclick="app.deletePatient('${p.id}')" style="padding:0.4rem;">Eliminar</button>
                </div>
            `;
            list.appendChild(li);
        });
    },

    selectPatient: function(id) {
        const p = this.patients.find(p => p.id === id);
        if (!p) return;
        
        this.currentPatientId = p.id;
        
        // Fill form for editing
        document.getElementById('patient-id').value = p.id;
        document.getElementById('patient-name').value = p.name;
        document.getElementById('patient-age').value = p.age;
        document.getElementById('patient-sex').value = p.sex;
        document.getElementById('patient-weight').value = p.weight;
        document.getElementById('patient-height').value = p.height;
        this.calculateBMI();

        // Restore DbMode if it exists
        if (p.planMode && p.planMode !== this.dbMode) {
            document.getElementById('mode-' + p.planMode).checked = true;
            this.dbMode = p.planMode;
            this.clearFoodSelection();
            this.populateCategoryFilter();
            
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = '';
            this.searchFood();
            
            const viewSelector = document.getElementById('view-selector');
            if (viewSelector) {
                viewSelector.style.display = this.dbMode === 'inta' ? 'block' : 'none';
            }
        }

        // Load Plan
        this.plan = p.plan || { desayuno: [], almuerzo: [], once: [], cena: [] };
        this.renderPlan();
        
        // Update Context Bar
        this.updateContextBar();
        
        alert(`Trabajando ahora con: ${p.name}`);
        this.showView('plan'); // Automatically go to Plan view after selecting
    },

    deletePatient: function(id) {
        if(confirm("¿Seguro que desea eliminar este paciente? Esta acción no se puede deshacer.")) {
            this.patients = this.patients.filter(p => p.id !== id);
            if (this.currentPatientId === id) {
                this.currentPatientId = null;
                this.clearPatientForm();
                this.clearPlanStateWithoutSaving();
                this.updateContextBar();
            }
            this.savePatientsToStorage();
            this.renderPatientsList();
        }
    },
    
    clearPlanStateWithoutSaving: function() {
        this.plan = { desayuno: [], almuerzo: [], once: [], cena: [] };
        this.renderPlan();
    },

    savePlanToPatient: function() {
        const p = this.patients.find(p => p.id === this.currentPatientId);
        if (p) {
            p.plan = this.plan;
            this.savePatientsToStorage();
        }
    },

    // --- FASE 10: EXPORTAR A PDF ---
    exportToPDF: function() {
        const element = document.getElementById('exportable-area');
        
        // Setup PDF header info
        const pdfHeader = document.getElementById('pdf-patient-header');
        if (this.currentPatientId) {
            const p = this.patients.find(p => p.id === this.currentPatientId);
            document.getElementById('pdf-patient-name').textContent = p.name;
            document.getElementById('pdf-patient-bmi').textContent = p.bmi;
            pdfHeader.classList.remove('hidden');
        } else {
            document.getElementById('pdf-patient-name').textContent = "No registrado";
            document.getElementById('pdf-patient-bmi').textContent = "--";
            pdfHeader.classList.remove('hidden');
        }

        // Hide delete buttons temporarily for printing
        const buttons = element.querySelectorAll('.btn-delete');
        buttons.forEach(b => b.style.display = 'none');
        
        // Add specific class for PDF layout
        element.classList.add('pdf-export-mode');
        
        // Force chart to resize to the new CSS constraints
        if (this.macroChart) {
            this.macroChart.resize();
        }
        
        const opt = {
            margin:       0.5,
            filename:     'Pauta_Nutricional.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Give the DOM and Chart.js 300ms to settle the new layout before capturing
        setTimeout(() => {
            html2pdf().set(opt).from(element).save().then(() => {
                // Restore buttons & styles
                buttons.forEach(b => b.style.display = 'flex');
                pdfHeader.classList.add('hidden');
                element.classList.remove('pdf-export-mode');
                
                // Force chart to resize back to normal web layout
                if (this.macroChart) {
                    this.macroChart.resize();
                }
            });
        }, 300);
    }
};

window.onload = () => app.init();
