const app = {
    alimentosData: [],
    currentFood: null,
    patients: [],
    currentPatientId: null,
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
            const response = await fetch('data/datos_nutricionales_inta.json');
            this.alimentosData = await response.json();
        } catch (error) {
            console.error("Error loading JSON:", error);
        }
    },

    searchFood: function() {
        const query = document.getElementById('search-input').value.toLowerCase();
        const resultsList = document.getElementById('search-results');
        resultsList.innerHTML = '';
        
        if (query.length < 2) {
            resultsList.innerHTML = '<li class="empty-state">Ingresa al menos 2 letras para buscar.</li>';
            this.clearFoodSelection();
            return;
        }

        const filtered = this.alimentosData.filter(item => 
            item.alimento.toLowerCase().includes(query)
        ).slice(0, 15);

        if (filtered.length === 0) {
            resultsList.innerHTML = '<li class="empty-state">No se encontraron resultados.</li>';
            return;
        }

        filtered.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.alimento;
            li.dataset.id = item.alimento; // for active state
            li.onclick = () => {
                // Remove active class from all
                Array.from(resultsList.children).forEach(c => c.classList.remove('active'));
                li.classList.add('active');
                this.selectFood(item);
            };
            resultsList.appendChild(li);
        });
    },

    clearFoodSelection: function() {
        this.currentFood = null;
        document.getElementById('food-detail').classList.add('hidden');
        document.getElementById('food-detail-empty').classList.remove('hidden');
    },

    selectFood: function(item) {
        this.currentFood = item;
        document.getElementById('detail-name').textContent = item.alimento;
        document.getElementById('calc-grams').value = 100;
        document.getElementById('calc-kcal').value = '';
        
        document.getElementById('food-detail-empty').classList.add('hidden');
        document.getElementById('food-detail').classList.remove('hidden');
        
        this.renderNutrients();
    },

    // --- FASE 2 y 3: CALCULADORA Y VISTAS ---
    calculateNutrientValue: function(value, grams) {
        if (value === "s/i" || value === undefined || value === null || isNaN(value)) {
            return "s/i";
        }
        return ((parseFloat(value) / 100) * grams).toFixed(2);
    },

    renderNutrients: function() {
        if (!this.currentFood) return;

        const grams = parseFloat(document.getElementById('calc-grams').value) || 0;
        const viewType = document.getElementById('view-selector').value;
        const resultsContainer = document.getElementById('nutrient-results');
        resultsContainer.innerHTML = '';

        let keysToRender = [];
        if (viewType === 'completa') {
            keysToRender = Object.keys(this.currentFood.nutrientes);
        } else {
            keysToRender = this.vistasClinicas[viewType];
        }

        keysToRender.forEach(key => {
            if (this.currentFood.nutrientes[key] !== undefined) {
                const originalValue = this.currentFood.nutrientes[key];
                const calcValue = this.calculateNutrientValue(originalValue, grams);
                
                const card = document.createElement('div');
                card.className = 'nutrient-card';
                card.innerHTML = `
                    <small>${key}</small>
                    <span>${calcValue}</span>
                `;
                resultsContainer.appendChild(card);
            }
        });
    },

    calculateByGrams: function() {
        document.getElementById('calc-kcal').value = '';
        this.renderNutrients();
    },

    // --- FASE 7: GENERADOR INVERSO ---
    calculateByKcal: function() {
        if (!this.currentFood) return;
        const targetKcal = parseFloat(document.getElementById('calc-kcal').value) || 0;
        const kcalPer100 = parseFloat(this.currentFood.nutrientes['Energía (kcal)']);
        
        if (kcalPer100 && !isNaN(kcalPer100) && kcalPer100 > 0) {
            const gramsNeeded = (targetKcal * 100) / kcalPer100;
            document.getElementById('calc-grams').value = gramsNeeded.toFixed(2);
            this.renderNutrients();
        }
    },

    // --- FASE 4: PAUTA / R24 ---
    addToPlan: function() {
        if (!this.currentFood) {
            alert("Selecciona un alimento primero.");
            return;
        }
        if (!this.currentPatientId) {
            if(!confirm("No tienes un paciente seleccionado. ¿Deseas añadirlo a una pauta temporal de todas formas?")) {
                return;
            }
        }

        const meal = document.getElementById('meal-selector').value;
        const grams = parseFloat(document.getElementById('calc-grams').value) || 0;
        
        const item = {
            id: Date.now().toString() + Math.floor(Math.random()*1000), // Ensures uniqueness
            alimento: this.currentFood.alimento,
            gramos: grams,
            nutrientesOrig: this.currentFood.nutrientes
        };

        this.plan[meal].push(item);
        this.renderPlan();
        
        if (this.currentPatientId) {
            this.savePlanToPatient();
        }

        // Optional: show a small non-intrusive toast instead of alert, but alert works for MVP.
        alert(`Añadido: ${this.currentFood.alimento} (${grams}g) al ${meal}`);
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
            
            if (this.plan[meal].length === 0) {
                list.innerHTML = '<li class="empty-state" style="border:none; justify-content:center; padding: 2rem 1rem;">Sin alimentos añadidos</li>';
            }

            this.plan[meal].forEach(item => {
                const li = document.createElement('li');
                const kcal = this.calculateNutrientValue(item.nutrientesOrig['Energía (kcal)'], item.gramos);
                
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
    showSourceModal: function() {
        if (!this.currentFood) return;
        document.getElementById('source-category').textContent = this.currentFood.categoria || 'Sin Categoría';
        document.getElementById('source-modal').classList.remove('hidden');
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
                    <span class="item-meta">IMC: ${p.bmi} | ${p.age} años</span>
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
        
        // Styling tweaks for PDF rendering
        element.style.background = "white";
        element.style.padding = "20px";
        
        const opt = {
            margin:       0.5,
            filename:     'Pauta_Nutricional.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            // Restore buttons & styles
            buttons.forEach(b => b.style.display = 'flex');
            pdfHeader.classList.add('hidden');
            element.style.background = "";
            element.style.padding = "";
        });
    }
};

window.onload = () => app.init();
