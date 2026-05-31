/* ==========================================
   NUTRIFLOW MAIN CLIENT LOGIC
   ========================================== */

// 1. PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered successfully.', reg.scope))
      .catch(err => console.log('Service Worker registration failed: ', err));
  });
}

// 2. Preset Food Database (values per 100g)
const PRESET_FOODS = [
  { id: 'p1', name: 'Chicken Breast (Cooked)', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
  { id: 'p2', name: 'White Jasmine Rice (Cooked)', calories: 130, protein: 2.7, carbs: 28.0, fat: 0.3 },
  { id: 'p3', name: 'Whole Egg (Boiled/Poached)', calories: 143, protein: 13.0, carbs: 0.7, fat: 9.5 },
  { id: 'p4', name: 'Banana', calories: 89, protein: 1.1, carbs: 23.0, fat: 0.3 },
  { id: 'p5', name: 'Avocado', calories: 160, protein: 2.0, carbs: 9.0, fat: 15.0 },
  { id: 'p6', name: 'Rolled Oats (Raw)', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { id: 'p7', name: 'Peanut Butter (Smooth)', calories: 588, protein: 25.0, carbs: 20.0, fat: 50.0 },
  { id: 'p8', name: 'Whey Protein Powder', calories: 400, protein: 80.0, carbs: 6.0, fat: 6.0 },
  { id: 'p9', name: 'Salmon Fillet (Baked)', calories: 206, protein: 22.0, carbs: 0.0, fat: 13.0 },
  { id: 'p10', name: 'Red Gala Apple', calories: 52, protein: 0.3, carbs: 14.0, fat: 0.2 },
  { id: 'p11', name: 'Extra Virgin Olive Oil', calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
  { id: 'p12', name: 'Broccoli Florets (Steamed)', calories: 34, protein: 2.8, carbs: 7.0, fat: 0.4 },
  { id: 'p13', name: 'Sweet Potato (Baked)', calories: 86, protein: 1.6, carbs: 20.0, fat: 0.1 },
  { id: 'p14', name: 'Mixed Almonds (Raw)', calories: 579, protein: 21.0, carbs: 22.0, fat: 49.0 },
  { id: 'p15', name: 'Greek Yogurt 0% (Plain)', calories: 59, protein: 10.0, carbs: 3.6, fat: 0.4 }
];

// 3. Application State Configuration
let state = {
  calorieGoal: 2000,
  proteinGoal: 150,
  carbsGoal: 200,
  fatGoal: 67,
  waterGoal: 2500,
  waterIntake: 0,
  loggedMeals: [],
  recipes: [],
  weightLogs: [
    { date: '05-24', weight: 76.5 },
    { date: '05-25', weight: 76.2 },
    { date: '05-26', weight: 75.9 },
    { date: '05-27', weight: 75.8 },
    { date: '05-28', weight: 75.4 },
    { date: '05-29', weight: 75.1 },
    { date: '05-30', weight: 75.0 }
  ],
  customFoods: [],
  appleHealthConnected: false,
  appleHealthLastSync: null
};

// State key in LocalStorage
const STORAGE_KEY = 'nutriflow_state';

// Load initial state
function loadState() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      state = JSON.parse(data);
      // Ensure key arrays exist
      if (!state.loggedMeals) state.loggedMeals = [];
      if (!state.recipes) state.recipes = [];
      if (!state.weightLogs) state.weightLogs = [];
      if (!state.customFoods) state.customFoods = [];
    } catch (e) {
      console.error('Failed to parse local storage. Setting default.', e);
      saveState();
    }
  } else {
    // Seed initial setup
    saveState();
  }
}

// Sync state to LocalStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ==========================================
   DOM ELEMENTS CACHE
   ========================================== */
const DOM = {
  // Navigation Tabs
  tabItems: document.querySelectorAll('.tabbar-item'),
  views: document.querySelectorAll('.app-view'),
  headerTitle: document.getElementById('header-title'),
  headerDateStr: document.getElementById('header-date-str'),

  // Dashboard Rings & Labels
  caloriesLeftNum: document.getElementById('calories-left-num'),
  calGoalVal: document.getElementById('cal-goal-val'),
  calFoodVal: document.getElementById('cal-food-val'),
  calRemainVal: document.getElementById('cal-remain-val'),
  ringProtein: document.getElementById('ring-protein'),
  ringCarbs: document.getElementById('ring-carbs'),
  ringFat: document.getElementById('ring-fat'),

  // Dashboard Linear Progress Indicators
  barProtein: document.getElementById('bar-protein'),
  barCarbs: document.getElementById('bar-carbs'),
  barFat: document.getElementById('bar-fat'),
  macroProteinRatio: document.getElementById('macro-protein-ratio'),
  macroCarbsRatio: document.getElementById('macro-carbs-ratio'),
  macroFatRatio: document.getElementById('macro-fat-ratio'),

  // Dashboard Water Widget
  waterRatioLabel: document.getElementById('water-ratio-label'),
  waterLiquid: document.getElementById('water-liquid'),
  btnAddWater: document.getElementById('btn-add-water'),

  // Dashboard Weight Quick Log
  weightCurrentLabel: document.getElementById('weight-current-label'),
  inputQuickWeight: document.getElementById('input-quick-weight'),
  btnSubmitWeight: document.getElementById('btn-submit-weight'),

  // Meals Section
  btnMealAddQuick: document.querySelectorAll('.btn-add-meal-quick'),
  breakfastSum: document.getElementById('breakfast-calories-sum'),
  lunchSum: document.getElementById('lunch-calories-sum'),
  dinnerSum: document.getElementById('dinner-calories-sum'),
  snacksSum: document.getElementById('snacks-calories-sum'),
  mealItemsContainer: {
    Breakfast: document.getElementById('meal-items-Breakfast'),
    Lunch: document.getElementById('meal-items-Lunch'),
    Dinner: document.getElementById('meal-items-Dinner'),
    Snacks: document.getElementById('meal-items-Snacks')
  },

  // Food Search slideout drawer
  searchDrawer: document.getElementById('food-search-drawer'),
  searchDrawerTitle: document.getElementById('search-drawer-title'),
  searchInput: document.getElementById('food-search-input'),
  searchResults: document.getElementById('food-search-results'),
  resultsCountLabel: document.getElementById('results-count-label'),
  selectedFoodDetails: document.getElementById('selected-food-details'),
  selectedFoodName: document.getElementById('selected-food-name'),
  selectedFoodBaseInfo: document.getElementById('selected-food-base-info'),
  foodWeightSlider: document.getElementById('food-weight-slider'),
  foodWeightVal: document.getElementById('food-weight-val'),
  sfCalories: document.getElementById('sf-calories'),
  sfProtein: document.getElementById('sf-protein'),
  sfCarbs: document.getElementById('sf-carbs'),
  sfFat: document.getElementById('sf-fat'),
  btnConfirmAdd: document.getElementById('btn-confirm-add'),
  btnCloseSearch: document.getElementById('btn-close-search'),
  drawerOverlay: document.getElementById('drawer-overlay-btn'),

  // Custom food creator inside search drawer
  cfName: document.getElementById('cf-name'),
  cfCal: document.getElementById('cf-cal'),
  cfP: document.getElementById('cf-p'),
  cfC: document.getElementById('cf-c'),
  cfF: document.getElementById('cf-f'),
  btnCreateCustomFood: document.getElementById('btn-create-custom-food'),

  // Recipe Nutrient Calculator
  recipeNameInput: document.getElementById('recipe-name-input'),
  recipeServingsInput: document.getElementById('recipe-servings-input'),
  btnOpenRecipeFoodSearch: document.getElementById('btn-open-recipe-food-search'),
  recipeIngredientsContainer: document.getElementById('recipe-ingredients-container'),
  recipeCalTotal: document.getElementById('recipe-cal-total'),
  recipeCalPerServing: document.getElementById('recipe-cal-per-serving'),
  recipePTotal: document.getElementById('recipe-p-total'),
  recipePPerServing: document.getElementById('recipe-p-per-serving'),
  recipeCTotal: document.getElementById('recipe-c-total'),
  recipeCPerServing: document.getElementById('recipe-c-per-serving'),
  recipeFTotal: document.getElementById('recipe-f-total'),
  recipeFPerServing: document.getElementById('recipe-f-per-serving'),
  btnSaveRecipe: document.getElementById('btn-save-recipe'),
  savedRecipesList: document.getElementById('saved-recipes-list'),

  // Weight Trend Tab
  weightTrendStat: document.getElementById('weight-trend-stat'),
  weightChart: document.getElementById('weight-chart'),
  chartPath: document.getElementById('chart-path'),
  chartAreaPath: document.getElementById('chart-area-path'),
  chartPoints: document.getElementById('chart-points'),
  chartLabels: document.getElementById('chart-labels'),
  weightHistoryList: document.getElementById('weight-history-list'),

  // Settings Panel Inputs
  settingsCalInput: document.getElementById('settings-cal-input'),
  settingsPInput: document.getElementById('settings-p-input'),
  settingsCInput: document.getElementById('settings-c-input'),
  settingsFInput: document.getElementById('settings-f-input'),
  macroSettingsHelper: document.getElementById('macro-settings-helper'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  settingsWaterInput: document.getElementById('settings-water-input'),
  btnSaveWaterSettings: document.getElementById('btn-save-water-settings'),
  btnClearDb: document.getElementById('btn-clear-db')
};

// UI Modal States
let activeMealContext = 'Breakfast'; // Meal logging type
let drawerMode = 'log-meal'; // 'log-meal' or 'recipe-ingredient'
let selectedFoodItem = null; // Currently active food chosen in search list
let recipeActiveIngredients = []; // In-memory tracking of recipe ingredients before saving

/* ==========================================
   DATE & CALENDAR STAMP
   ========================================== */
function updateHeaderDate() {
  const options = { month: 'short', day: 'numeric' };
  const today = new Date();
  DOM.headerDateStr.innerText = today.toLocaleDateString('en-US', options);
}

/* ==========================================
   TAB VIEW SWAPPER
   ========================================== */
DOM.tabItems.forEach(tab => {
  tab.addEventListener('click', () => {
    const viewName = tab.getAttribute('data-view');
    
    // Update active tab buttons
    DOM.tabItems.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update active viewport
    DOM.views.forEach(view => {
      view.classList.remove('active');
      if (view.id === `view-${viewName}`) {
        view.classList.add('active');
      }
    });

    // Update header titles
    let title = 'Today';
    if (viewName === 'meals') title = 'Food Log';
    if (viewName === 'recipes') title = 'Recipe Lab';
    if (viewName === 'weight') title = 'Weight Tracker';
    if (viewName === 'settings') title = 'Settings';
    DOM.headerTitle.innerText = title;

    // Call view-specific renders
    if (viewName === 'dashboard') {
      renderDashboard();
    } else if (viewName === 'meals') {
      renderMealLogs();
    } else if (viewName === 'recipes') {
      renderRecipeList();
    } else if (viewName === 'weight') {
      renderWeightTab();
    } else if (viewName === 'settings') {
      renderSettingsTab();
    }
  });
});

/* ==========================================
   DASHBOARD COMPUTATIONS & RENDERING
   ========================================== */
function renderDashboard() {
  // Sum today's macros
  let foodCalories = 0;
  let foodProtein = 0;
  let foodCarbs = 0;
  let foodFat = 0;

  state.loggedMeals.forEach(meal => {
    foodCalories += Math.round(meal.calories);
    foodProtein += Math.round(meal.protein);
    foodCarbs += Math.round(meal.carbs);
    foodFat += Math.round(meal.fat);
  });

  const caloriesLeft = Math.max(0, state.calorieGoal - foodCalories);

  // Bind values
  DOM.caloriesLeftNum.innerText = caloriesLeft.toLocaleString();
  DOM.calGoalVal.innerText = state.calorieGoal.toLocaleString();
  DOM.calFoodVal.innerText = foodCalories.toLocaleString();
  DOM.calRemainVal.innerText = caloriesLeft.toLocaleString();

  // Progress Ratios
  DOM.macroProteinRatio.innerText = `${foodProtein}g / ${state.proteinGoal}g`;
  DOM.macroCarbsRatio.innerText = `${foodCarbs}g / ${state.carbsGoal}g`;
  DOM.macroFatRatio.innerText = `${foodFat}g / ${state.fatGoal}g`;

  // Dynamic Horizontal Bars
  const pPercent = Math.min(100, (foodProtein / state.proteinGoal) * 100);
  const cPercent = Math.min(100, (foodCarbs / state.carbsGoal) * 100);
  const fPercent = Math.min(100, (foodFat / state.fatGoal) * 100);

  DOM.barProtein.style.width = `${pPercent}%`;
  DOM.barCarbs.style.width = `${cPercent}%`;
  DOM.barFat.style.width = `${fPercent}%`;

  // Render Overlapping Activity Rings
  // dasharray: Protein=408.4 (r=65), Carbs=314.1 (r=50), Fat=219.9 (r=35)
  setRingProgress(DOM.ringProtein, foodProtein / state.proteinGoal, 408.4);
  setRingProgress(DOM.ringCarbs, foodCarbs / state.carbsGoal, 314.1);
  setRingProgress(DOM.ringFat, foodFat / state.fatGoal, 219.9);

  // Hydration state
  DOM.waterRatioLabel.innerText = `${state.waterIntake} / ${state.waterGoal} ml`;
  const waterPercent = Math.min(100, (state.waterIntake / state.waterGoal) * 100);
  DOM.waterLiquid.style.height = `${waterPercent}%`;

  // Current weight log display
  if (state.weightLogs.length > 0) {
    const recent = state.weightLogs[state.weightLogs.length - 1];
    DOM.weightCurrentLabel.innerText = recent.weight.toFixed(1);
  } else {
    DOM.weightCurrentLabel.innerText = '--';
  }
}

// Circumference math helper for SVG dash offsets
function setRingProgress(circleElement, ratio, circumference) {
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const offset = circumference - (clampedRatio * circumference);
  circleElement.style.strokeDashoffset = offset;
}

/* ==========================================
   WATER LOG TRACKER
   ========================================== */
DOM.btnAddWater.addEventListener('click', () => {
  state.waterIntake += 250;
  saveState();
  renderDashboard();

  // Create temporary scale animation
  DOM.waterLiquid.style.transform = 'scaleY(1.05)';
  setTimeout(() => {
    DOM.waterLiquid.style.transform = 'scaleY(1)';
  }, 200);
});

/* ==========================================
   WEIGHT LOG TRACKER
   ========================================== */
DOM.btnSubmitWeight.addEventListener('click', () => {
  const value = parseFloat(DOM.inputQuickWeight.value);
  if (isNaN(value) || value <= 0) return;

  const today = new Date();
  const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // If already logged today, replace it. Otherwise, add.
  const idx = state.weightLogs.findIndex(w => w.date === dateStr);
  if (idx > -1) {
    state.weightLogs[idx].weight = value;
  } else {
    state.weightLogs.push({ date: dateStr, weight: value });
  }

  // Cap history at 15 entries for visualization scale
  if (state.weightLogs.length > 15) {
    state.weightLogs.shift();
  }

  saveState();
  renderDashboard();
  DOM.inputQuickWeight.value = '';

  // Tiny validation flash
  DOM.weightCurrentLabel.style.color = '#30d158';
  setTimeout(() => {
    DOM.weightCurrentLabel.style.color = 'var(--color-fat)';
  }, 1000);
});

/* ==========================================
   MEAL LIST RENDERING & REMOVALS
   ========================================== */
function renderMealLogs() {
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  
  // Clean list content
  mealTypes.forEach(type => {
    const listDiv = DOM.mealItemsContainer[type];
    listDiv.innerHTML = '';
  });

  // Keep track of section sums
  const sums = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0 };

  if (state.loggedMeals.length === 0) {
    mealTypes.forEach(type => {
      DOM.mealItemsContainer[type].innerHTML = '<div class="no-items-placeholder">No logged foods yet. Tap + to add.</div>';
    });
  } else {
    state.loggedMeals.forEach(meal => {
      sums[meal.mealType] += Math.round(meal.calories);
      
      const itemRow = document.createElement('div');
      itemRow.className = 'meal-item';
      itemRow.innerHTML = `
        <div class="mi-left">
          <span class="mi-name">${meal.name}</span>
          <span class="mi-portion">${meal.grams}g</span>
          <div class="mi-macros">
            <span>P: ${Math.round(meal.protein)}g</span>
            <span>C: ${Math.round(meal.carbs)}g</span>
            <span>F: ${Math.round(meal.fat)}g</span>
          </div>
        </div>
        <div class="mi-right">
          <span class="mi-cal">${Math.round(meal.calories)} kcal</span>
          <button class="btn-delete-food" data-id="${meal.id}">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;
      DOM.mealItemsContainer[meal.mealType].appendChild(itemRow);
    });

    // Populate accordion placeholder if type has no items
    mealTypes.forEach(type => {
      if (DOM.mealItemsContainer[type].children.length === 0) {
        DOM.mealItemsContainer[type].innerHTML = '<div class="no-items-placeholder">No logged foods yet. Tap + to add.</div>';
      }
    });
  }

  // Render header values
  DOM.breakfastSum.innerText = `${sums.Breakfast} kcal`;
  DOM.lunchSum.innerText = `${sums.Lunch} kcal`;
  DOM.dinnerSum.innerText = `${sums.Dinner} kcal`;
  DOM.snacksSum.innerText = `${sums.Snacks} kcal`;

  // Attach delete click handlers
  document.querySelectorAll('.btn-delete-food').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      state.loggedMeals = state.loggedMeals.filter(m => m.id !== id);
      saveState();
      renderMealLogs();
    });
  });
}

// Wire up daily meal action buttons
DOM.btnMealAddQuick.forEach(btn => {
  btn.addEventListener('click', () => {
    activeMealContext = btn.getAttribute('data-meal-type');
    openSearchDrawer('log-meal', `Add to ${activeMealContext}`);
  });
});

/* ==========================================
   FOOD SEARCH SLIDEOUT DRAWER
   ========================================== */
function openSearchDrawer(mode, titleText) {
  drawerMode = mode;
  DOM.searchDrawerTitle.innerText = titleText;
  DOM.searchInput.value = '';
  DOM.selectedFoodDetails.style.display = 'none';
  selectedFoodItem = null;
  DOM.btnConfirmAdd.disabled = true;

  // Render standard popular database first
  renderSearchResults('');

  DOM.searchDrawer.classList.add('active');
  DOM.searchInput.focus();
}

function closeSearchDrawer() {
  DOM.searchDrawer.classList.remove('active');
}

DOM.btnCloseSearch.addEventListener('click', closeSearchDrawer);
DOM.drawerOverlay.addEventListener('click', closeSearchDrawer);

// Realtime search text updates
DOM.searchInput.addEventListener('input', (e) => {
  renderSearchResults(e.target.value);
});

function renderSearchResults(query) {
  DOM.searchResults.innerHTML = '';
  const searchStr = query.toLowerCase().trim();

  // Combine standard presets + custom entries
  const allFoods = [...PRESET_FOODS, ...state.customFoods];
  const filtered = allFoods.filter(f => f.name.toLowerCase().includes(searchStr));

  DOM.resultsCountLabel.innerText = searchStr ? `Search Results (${filtered.length})` : 'Popular Foods';

  if (filtered.length === 0) {
    DOM.searchResults.innerHTML = '<div class="no-items-placeholder">No matching foods found. Create one below!</div>';
    return;
  }

  filtered.forEach(food => {
    const item = document.createElement('div');
    item.className = 'food-list-item';
    if (selectedFoodItem && selectedFoodItem.id === food.id) {
      item.classList.add('selected');
    }
    item.innerHTML = `
      <div>
        <div class="fli-name">${food.name}</div>
        <div class="fli-macros">P: ${food.protein}g • C: ${food.carbs}g • F: ${food.fat}g</div>
      </div>
      <div class="fli-cal">${food.calories} kcal</div>
    `;
    item.addEventListener('click', () => {
      selectFoodItem(food);
      // Highlight selection visual
      document.querySelectorAll('.food-list-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
    });
    DOM.searchResults.appendChild(item);
  });
}

function selectFoodItem(food) {
  selectedFoodItem = food;
  DOM.selectedFoodName.innerText = food.name;
  DOM.selectedFoodBaseInfo.innerText = `100g base = ${food.calories} kcal`;

  // Default slider to 100g
  DOM.foodWeightSlider.value = 100;
  DOM.foodWeightVal.innerText = 100;

  updateSelectedFoodMacros();
  DOM.selectedFoodDetails.style.display = 'block';
  DOM.btnConfirmAdd.disabled = false;
  
  // Smooth scroll detail card into view inside drawer body
  DOM.selectedFoodDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Update macro card metrics in real time as slider scales
DOM.foodWeightSlider.addEventListener('input', (e) => {
  DOM.foodWeightVal.innerText = e.target.value;
  updateSelectedFoodMacros();
});

function updateSelectedFoodMacros() {
  if (!selectedFoodItem) return;
  const grams = parseFloat(DOM.foodWeightSlider.value);
  const factor = grams / 100;

  DOM.sfCalories.innerText = Math.round(selectedFoodItem.calories * factor);
  DOM.sfProtein.innerText = `${(selectedFoodItem.protein * factor).toFixed(1)}g`;
  DOM.sfCarbs.innerText = `${(selectedFoodItem.carbs * factor).toFixed(1)}g`;
  DOM.sfFat.innerText = `${(selectedFoodItem.fat * factor).toFixed(1)}g`;
}

// Add click confirm inside search drawer
DOM.btnConfirmAdd.addEventListener('click', () => {
  if (!selectedFoodItem) return;

  const grams = parseFloat(DOM.foodWeightSlider.value);
  const factor = grams / 100;

  const calculatedNutrients = {
    id: Date.now().toString(),
    name: selectedFoodItem.name,
    calories: selectedFoodItem.calories * factor,
    protein: selectedFoodItem.protein * factor,
    carbs: selectedFoodItem.carbs * factor,
    fat: selectedFoodItem.fat * factor,
    grams: grams
  };

  if (drawerMode === 'log-meal') {
    // Add to daily meal log
    calculatedNutrients.mealType = activeMealContext;
    calculatedNutrients.timestamp = Date.now();
    state.loggedMeals.push(calculatedNutrients);
    saveState();
    renderDashboard();
    renderMealLogs();
  } else if (drawerMode === 'recipe-ingredient') {
    // Add to current in-memory recipe ingredients
    recipeActiveIngredients.push({
      foodId: selectedFoodItem.id,
      name: selectedFoodItem.name,
      grams: grams,
      calories: calculatedNutrients.calories,
      protein: calculatedNutrients.protein,
      carbs: calculatedNutrients.carbs,
      fat: calculatedNutrients.fat
    });
    renderRecipeIngredients();
    calculateRecipeSum();
  }

  closeSearchDrawer();
});

/* ==========================================
   CUSTOM FOOD SUBMISSION
   ========================================== */
DOM.btnCreateCustomFood.addEventListener('click', () => {
  const name = DOM.cfName.value.trim();
  const cal = parseFloat(DOM.cfCal.value);
  const p = parseFloat(DOM.cfP.value);
  const c = parseFloat(DOM.cfC.value);
  const f = parseFloat(DOM.cfF.value);

  if (!name || isNaN(cal) || isNaN(p) || isNaN(c) || isNaN(f)) {
    alert('Please fill out all food parameters.');
    return;
  }

  const newCF = {
    id: 'c_' + Date.now().toString(),
    name: name,
    calories: cal,
    protein: p,
    carbs: c,
    fat: f
  };

  state.customFoods.push(newCF);
  saveState();

  // Clear inputs
  DOM.cfName.value = '';
  DOM.cfCal.value = '';
  DOM.cfP.value = '';
  DOM.cfC.value = '';
  DOM.cfF.value = '';

  // Force re-query with newly created item and select it
  renderSearchResults('');
  selectFoodItem(newCF);
});

/* ==========================================
   RECIPE CALCULATOR TAB
   ========================================== */
DOM.btnOpenRecipeFoodSearch.addEventListener('click', (e) => {
  e.preventDefault();
  openSearchDrawer('recipe-ingredient', 'Select Ingredient');
});

function renderRecipeIngredients() {
  DOM.recipeIngredientsContainer.innerHTML = '';
  if (recipeActiveIngredients.length === 0) {
    DOM.recipeIngredientsContainer.innerHTML = '<div class="no-ingredients-placeholder">No ingredients added yet. Tap "Add Ingredient" above.</div>';
    return;
  }

  recipeActiveIngredients.forEach((ing, index) => {
    const row = document.createElement('div');
    row.className = 'recipe-ing-row';
    row.innerHTML = `
      <div class="recipe-ing-info">
        <span class="recipe-ing-name">${ing.name}</span>
        <span class="recipe-ing-macros">P: ${Math.round(ing.protein)}g • C: ${Math.round(ing.carbs)}g • F: ${Math.round(ing.fat)}g</span>
      </div>
      <div class="recipe-ing-right">
        <span class="recipe-ing-weight">${ing.grams}g</span>
        <button class="btn-remove-ing" data-index="${index}">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ff453a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;
    row.querySelector('.btn-remove-ing').addEventListener('click', (e) => {
      e.preventDefault();
      recipeActiveIngredients.splice(index, 1);
      renderRecipeIngredients();
      calculateRecipeSum();
    });
    DOM.recipeIngredientsContainer.appendChild(row);
  });
}

// Compute aggregate recipe metrics & division ratios
function calculateRecipeSum() {
  let servings = parseInt(DOM.recipeServingsInput.value) || 1;
  if (servings < 1) servings = 1;

  let totalCal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  recipeActiveIngredients.forEach(ing => {
    totalCal += ing.calories;
    totalP += ing.protein;
    totalC += ing.carbs;
    totalF += ing.fat;
  });

  // Global aggregate variables
  DOM.recipeCalTotal.innerText = `${Math.round(totalCal)} kcal`;
  DOM.recipePTotal.innerText = `${Math.round(totalP)}g`;
  DOM.recipeCTotal.innerText = `${Math.round(totalC)}g`;
  DOM.recipeFTotal.innerText = `${Math.round(totalF)}g`;

  // Serving scale variables
  DOM.recipeCalPerServing.innerText = `${Math.round(totalCal / servings)} kcal / serving`;
  DOM.recipePPerServing.innerText = `${(totalP / servings).toFixed(1)}g / serving`;
  DOM.recipeCPerServing.innerText = `${(totalC / servings).toFixed(1)}g / serving`;
  DOM.recipeFPerServing.innerText = `${(totalF / servings).toFixed(1)}g / serving`;

  // Button activation gate
  const recipeName = DOM.recipeNameInput.value.trim();
  DOM.btnSaveRecipe.disabled = !(recipeName && recipeActiveIngredients.length > 0);
}

DOM.recipeNameInput.addEventListener('input', calculateRecipeSum);
DOM.recipeServingsInput.addEventListener('input', calculateRecipeSum);

// Save structured recipe calculations to custom foods array
DOM.btnSaveRecipe.addEventListener('click', (e) => {
  e.preventDefault();
  const recipeName = DOM.recipeNameInput.value.trim();
  let servings = parseInt(DOM.recipeServingsInput.value) || 1;
  if (servings < 1) servings = 1;

  if (!recipeName || recipeActiveIngredients.length === 0) return;

  let totalCal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  recipeActiveIngredients.forEach(ing => {
    totalCal += ing.calories;
    totalP += ing.protein;
    totalC += ing.carbs;
    totalF += ing.fat;
  });

  const calPerServing = totalCal / servings;
  const pPerServing = totalP / servings;
  const cPerServing = totalC / servings;
  const fPerServing = totalF / servings;

  const recipeId = 'recipe_' + Date.now().toString();

  const newRecipe = {
    id: recipeId,
    name: recipeName,
    servings: servings,
    calories: totalCal,
    protein: totalP,
    carbs: totalC,
    fat: totalF,
    ingredients: [...recipeActiveIngredients]
  };

  // Add recipe to state collection
  state.recipes.push(newRecipe);

  // Add custom food reflecting 1 serving (set values per 100g baseline such that logging 100g = 1 serving)
  state.customFoods.push({
    id: 'rcf_' + Date.now().toString(),
    name: `${recipeName} (1 serving)`,
    calories: Math.round(calPerServing),
    protein: parseFloat(pPerServing.toFixed(1)),
    carbs: parseFloat(cPerServing.toFixed(1)),
    fat: parseFloat(fPerServing.toFixed(1))
  });

  saveState();

  // Reset inputs
  DOM.recipeNameInput.value = '';
  DOM.recipeServingsInput.value = '1';
  recipeActiveIngredients = [];

  renderRecipeIngredients();
  calculateRecipeSum();
  renderRecipeList();

  alert(`Recipe "${recipeName}" saved! You can now log it from the food lists as a single serving (100g).`);
});

function renderRecipeList() {
  DOM.savedRecipesList.innerHTML = '';
  if (state.recipes.length === 0) {
    DOM.savedRecipesList.innerHTML = '<div class="no-items-placeholder">You haven\'t created any recipes yet. Use the calculator above to start.</div>';
    return;
  }

  state.recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-saved-card';
    card.setAttribute('data-id', recipe.id);
    
    // Construct ingredient details items HTML
    let ingredientsHTML = '';
    const ingredients = recipe.ingredients || [];
    ingredients.forEach(ing => {
      ingredientsHTML += `
        <li>
          <span>${ing.name}</span>
          <span class="ing-sub">${ing.grams}g • ${Math.round(ing.calories)} kcal (P: ${Math.round(ing.protein)}g • C: ${Math.round(ing.carbs)}g • F: ${Math.round(ing.fat)}g)</span>
        </li>
      `;
    });

    card.innerHTML = `
      <div class="rsc-main-row">
        <div class="rsc-left">
          <span class="rsc-name">${recipe.name}</span>
          <span class="rsc-servings">${recipe.servings} Servings • ${ingredients.length} ingredients</span>
          <div class="rsc-macros">
            <span>P: ${Math.round(recipe.protein / recipe.servings)}g</span>
            <span>C: ${Math.round(recipe.carbs / recipe.servings)}g</span>
            <span>F: ${Math.round(recipe.fat / recipe.servings)}g</span>
          </div>
        </div>
        <div class="rsc-right">
          <span class="rsc-cal">${Math.round(recipe.calories / recipe.servings)} kcal</span>
          <button class="btn-delete-recipe" data-id="${recipe.id}">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ff453a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="rsc-details">
        <div class="rsc-details-inner">
          <h5>Recipe Ingredients (Total)</h5>
          <ul class="recipe-details-ingredients">
            ${ingredientsHTML}
          </ul>
          <div class="recipe-details-totals">
            <strong>Total Recipe Nutrients:</strong>
            <span>${Math.round(recipe.calories)} kcal • P: ${Math.round(recipe.protein)}g • C: ${Math.round(recipe.carbs)}g • F: ${Math.round(recipe.fat)}g</span>
          </div>
        </div>
      </div>
    `;

    // Click handler to expand recipe card detail view
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-recipe')) return;
      
      const wasExpanded = card.classList.contains('expanded');
      
      // Collapse any other open cards for an accordion style transition
      document.querySelectorAll('.recipe-saved-card').forEach(c => c.classList.remove('expanded'));
      
      if (!wasExpanded) {
        card.classList.add('expanded');
      }
    });

    card.querySelector('.btn-delete-recipe').addEventListener('click', (e) => {
      e.stopPropagation();
      const matchName = `${recipe.name} (1 serving)`;
      state.customFoods = state.customFoods.filter(cf => cf.name !== matchName);
      state.recipes = state.recipes.filter(r => r.id !== recipe.id);
      saveState();
      renderRecipeList();
    });

    DOM.savedRecipesList.appendChild(card);
  });
}

/* ==========================================
   WEIGHT TAB CHART RENDER
   ========================================== */
function renderWeightTab() {
  renderWeightHistory();

  const logs = [...state.weightLogs].sort((a, b) => {
    const d1 = new Date(`2026-${a.date}`);
    const d2 = new Date(`2026-${b.date}`);
    return d1 - d2;
  });

  if (logs.length === 0) {
    DOM.chartPath.setAttribute('d', '');
    DOM.chartAreaPath.setAttribute('d', '');
    DOM.chartPoints.innerHTML = '';
    DOM.chartLabels.innerHTML = '';
    DOM.weightTrendStat.innerText = '--';
    return;
  }

  // Calculate average weight
  const sum = logs.reduce((acc, val) => acc + val.weight, 0);
  DOM.weightTrendStat.innerText = (sum / logs.length).toFixed(1);

  // SVG Chart boundaries: width=320, height=180
  const width = 320;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const weights = logs.map(l => l.weight);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const wRange = maxW - minW === 0 ? 1 : maxW - minW;

  const stepX = logs.length > 1 ? chartW / (logs.length - 1) : chartW;

  let points = [];
  logs.forEach((log, i) => {
    const x = paddingLeft + (i * stepX);
    // Y coordinates invert in SVGs (0 is top, height is bottom)
    const ratio = (log.weight - minW) / wRange;
    const y = paddingTop + chartH - (ratio * chartH);
    points.push({ x, y, weight: log.weight, date: log.date });
  });

  // Construct chart stroke path
  let pathD = '';
  points.forEach((pt, i) => {
    if (i === 0) {
      pathD += `M ${pt.x} ${pt.y}`;
    } else {
      pathD += ` L ${pt.x} ${pt.y}`;
    }
  });
  DOM.chartPath.setAttribute('d', pathD);

  // Construct fill gradient path
  if (points.length > 0) {
    let areaD = pathD;
    areaD += ` L ${points[points.length - 1].x} ${height - paddingBottom}`;
    areaD += ` L ${points[0].x} ${height - paddingBottom} Z`;
    DOM.chartAreaPath.setAttribute('d', areaD);
  }

  // Render point dots and X labels
  DOM.chartPoints.innerHTML = '';
  DOM.chartLabels.innerHTML = '';

  points.forEach(pt => {
    // Circle dots
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pt.x);
    circle.setAttribute('cy', pt.y);
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', '#007aff');
    circle.setAttribute('stroke-width', '2');
    
    // Add weights text on hover/above point
    const textVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textVal.setAttribute('x', pt.x);
    textVal.setAttribute('y', pt.y - 8);
    textVal.setAttribute('fill', '#8e8e93');
    textVal.setAttribute('font-size', '9px');
    textVal.setAttribute('font-weight', '600');
    textVal.setAttribute('text-anchor', 'middle');
    textVal.textContent = pt.weight.toFixed(1);

    DOM.chartPoints.appendChild(circle);
    DOM.chartPoints.appendChild(textVal);

    // X axis labels
    const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textLabel.setAttribute('x', pt.x);
    textLabel.setAttribute('y', height - 10);
    textLabel.setAttribute('fill', '#8e8e93');
    textLabel.setAttribute('font-size', '9px');
    textLabel.setAttribute('text-anchor', 'middle');
    textLabel.textContent = pt.date;
    DOM.chartLabels.appendChild(textLabel);
  });

  // Render weight boundaries on Y axis
  const textMinY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textMinY.setAttribute('x', '15');
  textMinY.setAttribute('y', height - paddingBottom);
  textMinY.setAttribute('fill', '#8e8e93');
  textMinY.setAttribute('font-size', '9px');
  textMinY.textContent = minW.toFixed(0);
  DOM.chartLabels.appendChild(textMinY);

  const textMaxY = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textMaxY.setAttribute('x', '15');
  textMaxY.setAttribute('y', paddingTop + 10);
  textMaxY.setAttribute('fill', '#8e8e93');
  textMaxY.setAttribute('font-size', '9px');
  textMaxY.textContent = maxW.toFixed(0);
  DOM.chartLabels.appendChild(textMaxY);
}

function renderWeightHistory() {
  DOM.weightHistoryList.innerHTML = '';
  const sortedHistory = [...state.weightLogs].reverse();

  if (sortedHistory.length === 0) {
    DOM.weightHistoryList.innerHTML = '<div class="no-items-placeholder">No weight history logged yet.</div>';
    return;
  }

  sortedHistory.forEach(log => {
    const row = document.createElement('div');
    row.className = 'weight-history-item';
    row.innerHTML = `
      <span class="whi-date">${log.date}</span>
      <div class="whi-right">
        <span class="whi-val">${log.weight.toFixed(1)} kg</span>
        <button class="btn-delete-weight" data-date="${log.date}">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ff453a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;
    row.querySelector('.btn-delete-weight').addEventListener('click', () => {
      state.weightLogs = state.weightLogs.filter(w => w.date !== log.date);
      saveState();
      renderWeightTab();
      renderDashboard();
    });
    DOM.weightHistoryList.appendChild(row);
  });
}

/* ==========================================
   SETTINGS TAB ACTIONS
   ========================================== */
function renderSettingsTab() {
  DOM.settingsCalInput.value = state.calorieGoal;
  DOM.settingsPInput.value = state.proteinGoal;
  DOM.settingsCInput.value = state.carbsGoal;
  DOM.settingsFInput.value = state.fatGoal;
  DOM.settingsWaterInput.value = state.waterGoal;

  updateMacroSettingsHelper();
  renderAppleHealthCard();
}

function updateMacroSettingsHelper() {
  const p = parseInt(DOM.settingsPInput.value) || 0;
  const c = parseInt(DOM.settingsCInput.value) || 0;
  const f = parseInt(DOM.settingsFInput.value) || 0;

  const pKcal = p * 4;
  const cKcal = c * 4;
  const fKcal = f * 9;
  const sumKcal = pKcal + cKcal + fKcal;

  DOM.macroSettingsHelper.innerText = `Calculated Total Calories: ${sumKcal} kcal (${p}g Protein = ${pKcal} kcal • ${c}g Carbs = ${cKcal} kcal • ${f}g Fat = ${fKcal} kcal)`;
}

[DOM.settingsPInput, DOM.settingsCInput, DOM.settingsFInput].forEach(inp => {
  inp.addEventListener('input', updateMacroSettingsHelper);
});

DOM.btnSaveSettings.addEventListener('click', () => {
  const cal = parseInt(DOM.settingsCalInput.value);
  const p = parseInt(DOM.settingsPInput.value);
  const c = parseInt(DOM.settingsCInput.value);
  const f = parseInt(DOM.settingsFInput.value);

  if (isNaN(cal) || isNaN(p) || isNaN(c) || isNaN(f)) {
    alert('Please enter valid numeric goals.');
    return;
  }

  state.calorieGoal = cal;
  state.proteinGoal = p;
  state.carbsGoal = c;
  state.fatGoal = f;
  saveState();

  alert('Daily nutrient goals saved successfully!');
  renderDashboard();
});

DOM.btnSaveWaterSettings.addEventListener('click', () => {
  const water = parseInt(DOM.settingsWaterInput.value);
  if (isNaN(water) || water <= 0) return;

  state.waterGoal = water;
  saveState();
  alert('Water goal saved successfully!');
  renderDashboard();
});

// Clear Storage Actions
DOM.btnClearDb.addEventListener('click', () => {
  if (confirm('Are you sure you want to delete all logs and settings? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
    state = {
      calorieGoal: 2000,
      proteinGoal: 150,
      carbsGoal: 200,
      fatGoal: 67,
      waterGoal: 2500,
      waterIntake: 0,
      loggedMeals: [],
      recipes: [],
      weightLogs: [],
      customFoods: []
    };
    saveState();
    alert('Local Storage cleared.');
    window.location.reload();
  }
});



/* ==========================================
   APPLE HEALTH SYNC SIMULATOR
   ========================================== */
function renderAppleHealthCard() {
  const container = document.getElementById('apple-health-status-container');
  if (!container) return;

  if (state.appleHealthConnected) {
    const lastSyncStr = state.appleHealthLastSync
      ? new Date(state.appleHealthLastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Never';
    container.innerHTML = `
      <div class="health-connected-box" style="background-color: rgba(48, 209, 88, 0.05); border: 1px solid rgba(48, 209, 88, 0.25); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🟢</span>
            <span style="font-weight: 600; font-size: 14px; color: #30d158;">Connected to HealthKit</span>
          </div>
          <button id="btn-health-disconnect" style="background: none; border: none; color: #ff453a; font-size: 11px; font-weight: 600; cursor: pointer;">Disconnect</button>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
          <span>Last Synced: ${lastSyncStr}</span>
          <span>Automatic Write: ON</span>
        </div>
        <button class="btn-secondary w-100" id="btn-sync-health-now" style="padding: 8px; border-radius: 8px; font-size: 12px;">
          <span id="sync-spinner" style="display: none; margin-right: 6px;">🔄</span>
          Sync Data Now
        </button>
      </div>
    `;

    document.getElementById('btn-health-disconnect').addEventListener('click', () => {
      state.appleHealthConnected = false;
      state.appleHealthLastSync = null;
      saveState();
      renderAppleHealthCard();
    });

    document.getElementById('btn-sync-health-now').addEventListener('click', () => {
      const spinner = document.getElementById('sync-spinner');
      if (spinner) spinner.style.display = 'inline-block';
      setTimeout(() => {
        state.appleHealthLastSync = Date.now();
        saveState();
        renderAppleHealthCard();
        alert('Sync complete! Logged nutrients exported to Apple Health database.');
      }, 1200);
    });

  } else {
    container.innerHTML = `
      <button class="btn-primary w-100" id="btn-connect-apple-health" style="background: linear-gradient(135deg, #ff2d55 0%, #ff3b30 100%);">
        Connect to Apple Health
      </button>
    `;

    document.getElementById('btn-connect-apple-health').addEventListener('click', () => {
      document.getElementById('apple-health-drawer').classList.add('active');
    });
  }
}

// Health permissions drawer event bindings
const healthDrawer = document.getElementById('apple-health-drawer');
const btnHealthCancel = document.getElementById('btn-health-cancel');
const btnHealthAllow = document.getElementById('btn-health-allow');
const healthOverlay = document.getElementById('health-overlay-btn');

if (btnHealthCancel) {
  btnHealthCancel.addEventListener('click', () => healthDrawer.classList.remove('active'));
}
if (healthOverlay) {
  healthOverlay.addEventListener('click', () => healthDrawer.classList.remove('active'));
}
if (btnHealthAllow) {
  btnHealthAllow.addEventListener('click', () => {
    state.appleHealthConnected = true;
    state.appleHealthLastSync = Date.now();
    saveState();
    healthDrawer.classList.remove('active');
    renderAppleHealthCard();
  });
}

/* ==========================================
   INITIALIZATION TRIGGER
   ========================================== */
function init() {
  loadState();
  updateHeaderDate();
  renderDashboard();
  renderMealLogs();
  renderRecipeList();
  renderWeightTab();
  renderAppleHealthCard();
}

init();
