// js/main.js
// Contrôleur principal : connecte l'interface utilisateur à la logique de calcul.
// Aucune logique de calcul ici — uniquement la gestion du DOM et des événements.

import { calculateSavings } from './model.js';

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Formate un nombre en devise canadienne-française.
 * Ex: 12345.6 → "12 346 $"
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
    }).format(amount);
}

// ─── Sélection des éléments du DOM ───────────────────────────────────────────

const form              = document.getElementById('estimator-form');
const inputNbEmployes   = document.getElementById('nbEmployes');
const inputTauxHoraire  = document.getElementById('tauxHoraire');
const inputHeures       = document.getElementById('heuresMensuelles');
const selectFrequence   = document.getElementById('frequence');
const productCheckboxes = document.querySelectorAll('#product-grid input[type="checkbox"]');
const calculateBtn      = document.getElementById('calculate-btn');

const resultsSection   = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const elAdminSavings   = document.getElementById('admin-savings');
const elProductSavings = document.getElementById('product-savings');
const elTotalSavings   = document.getElementById('total-savings');

const currentYearEl    = document.getElementById('current-year');

// ─── Initialisation ───────────────────────────────────────────────────────────

// Année courante dans le footer
if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
}

// Bouton désactivé par défaut — activé dès que les champs requis sont valides
calculateBtn.disabled = true;

// ─── Gestion des erreurs de champ ─────────────────────────────────────────────

/**
 * Marque un champ comme invalide et affiche un message d'erreur sous l'input.
 *
 * @param {HTMLElement} inputEl  - Le champ input ou select concerné.
 * @param {string}      message  - Le message d'erreur à afficher.
 */
function setFieldError(inputEl, message) {
    const group = inputEl.closest('.form-group');
    if (!group) return;

    inputEl.classList.add('is-invalid');
    inputEl.setAttribute('aria-invalid', 'true');

    // Crée le message d'erreur s'il n'existe pas encore
    let errorEl = group.querySelector('.field-error-msg');
    if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'field-error-msg';
        errorEl.setAttribute('role', 'alert');
        // Insère après le hint existant, ou en dernier dans le groupe
        const hint = group.querySelector('.field-hint');
        if (hint) {
            hint.after(errorEl);
        } else {
            group.appendChild(errorEl);
        }
    }
    errorEl.textContent = message;
}

/**
 * Efface l'état d'erreur d'un champ.
 *
 * @param {HTMLElement} inputEl
 */
function clearFieldError(inputEl) {
    const group = inputEl.closest('.form-group');
    if (!group) return;

    inputEl.classList.remove('is-invalid');
    inputEl.removeAttribute('aria-invalid');

    const errorEl = group.querySelector('.field-error-msg');
    if (errorEl) errorEl.remove();
}

/**
 * Efface toutes les erreurs du formulaire.
 */
function clearAllErrors() {
    [inputNbEmployes, inputTauxHoraire, inputHeures, selectFrequence].forEach(clearFieldError);
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Vérifie que les champs principaux ont des valeurs positives valides.
 * Utilisé pour activer/désactiver le bouton en temps réel.
 *
 * @returns {boolean}
 */
function areMainFieldsValid() {
    const nb     = parseFloat(inputNbEmployes.value);
    const taux   = parseFloat(inputTauxHoraire.value);
    const heures = parseFloat(inputHeures.value);

    return nb > 0 && taux >= 0 && heures >= 0 &&
           !isNaN(nb) && !isNaN(taux) && !isNaN(heures);
}

/**
 * Valide l'ensemble du formulaire avant le calcul.
 * Affiche les messages d'erreur sur les champs concernés.
 *
 * @param {{ nbEmployes: number, tauxHoraire: number, heuresMensuelles: number, frequence: number }} formData
 * @param {string[]} articlesSelectionnes
 * @returns {boolean} true si tout est valide, false sinon.
 */
function validateInputs(formData, articlesSelectionnes) {
    let isValid = true;

    // Nombre d'employés
    if (!formData.nbEmployes || formData.nbEmployes <= 0 || isNaN(formData.nbEmployes)) {
        setFieldError(inputNbEmployes, 'Veuillez entrer un nombre d'employés valide (minimum 1).');
        isValid = false;
    } else {
        clearFieldError(inputNbEmployes);
    }

    // Taux horaire
    if (isNaN(formData.tauxHoraire) || formData.tauxHoraire < 0) {
        setFieldError(inputTauxHoraire, 'Veuillez entrer un taux horaire valide (0 $ ou plus).');
        isValid = false;
    } else {
        clearFieldError(inputTauxHoraire);
    }

    // Heures mensuelles
    if (isNaN(formData.heuresMensuelles) || formData.heuresMensuelles < 0) {
        setFieldError(inputHeures, 'Veuillez entrer un nombre d'heures valide (0 ou plus).');
        isValid = false;
    } else {
        clearFieldError(inputHeures);
    }

    // Fréquence
    if (!formData.frequence || isNaN(formData.frequence) || formData.frequence <= 0) {
        setFieldError(selectFrequence, 'Veuillez sélectionner une fréquence de commande.');
        isValid = false;
    } else {
        clearFieldError(selectFrequence);
    }

    // Au moins un produit sélectionné
    if (articlesSelectionnes.length === 0) {
        showProductsError('Veuillez sélectionner au moins un type d'article.');
        isValid = false;
    } else {
        clearProductsError();
    }

    return isValid;
}

// ─── Erreur de sélection de produits ─────────────────────────────────────────

/**
 * Affiche un message d'erreur sous la grille de produits.
 *
 * @param {string} message
 */
function showProductsError(message) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    let errorEl = document.getElementById('products-error-msg');
    if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.id = 'products-error-msg';
        errorEl.className = 'products-error-msg';
        errorEl.setAttribute('role', 'alert');
        grid.after(errorEl);
    }
    errorEl.textContent = message;
}

/**
 * Efface le message d'erreur de la grille de produits.
 */
function clearProductsError() {
    const errorEl = document.getElementById('products-error-msg');
    if (errorEl) errorEl.remove();
}

// ─── Lecture des données du formulaire ───────────────────────────────────────

/**
 * Lit les valeurs brutes du formulaire et les convertit en nombres.
 *
 * @returns {{ nbEmployes: number, tauxHoraire: number, heuresMensuelles: number, frequence: number }}
 */
function getFormData() {
    return {
        nbEmployes:       parseFloat(inputNbEmployes.value),
        tauxHoraire:      parseFloat(inputTauxHoraire.value),
        heuresMensuelles: parseFloat(inputHeures.value),
        frequence:        parseInt(selectFrequence.value, 10),
    };
}

/**
 * Retourne un tableau des valeurs des checkboxes cochées.
 * NOTE : les valeurs doivent correspondre aux clés de config.js
 * (tshirt, hoodie, crewneck, etc.).
 *
 * @returns {string[]}
 */
function getSelectedProducts() {
    return Array.from(productCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

// ─── Activation du bouton en temps réel ──────────────────────────────────────

/**
 * Met à jour l'état du bouton selon la validité des champs principaux.
 */
function updateButtonState() {
    calculateBtn.disabled = !areMainFieldsValid();
}

// Écoute les saisies sur les 3 champs qui contrôlent l'état du bouton
[inputNbEmployes, inputTauxHoraire, inputHeures].forEach(input => {
    input.addEventListener('input', updateButtonState);
});

// ─── Animation de compteur ────────────────────────────────────────────────────

/**
 * Anime un élément de 0 jusqu'à `finalValue` sur une durée donnée.
 * Utilise requestAnimationFrame et une courbe ease-out cubique pour
 * une progression fluide et naturelle (rapide au départ, lente à la fin).
 *
 * @param {HTMLElement} element     - L'élément dont le contenu sera animé.
 * @param {number}      finalValue  - La valeur cible à atteindre.
 * @param {number}      [duration]  - Durée de l'animation en ms (défaut : 1500).
 */
function animateCounter(element, finalValue, duration = 1500) {
    // Respecte la préférence système "mouvement réduit" —
    // affiche la valeur finale immédiatement sans animation.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.textContent = formatCurrency(finalValue);
        return;
    }

    let startTime = null;

    /**
     * Courbe ease-out cubique : décélère progressivement vers la fin.
     * @param {number} t - Progression normalisée entre 0 et 1.
     * @returns {number}
     */
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function step(timestamp) {
        if (!startTime) startTime = timestamp;

        const elapsed  = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1); // clamp à 1
        const eased    = easeOutCubic(progress);

        const currentValue = Math.round(finalValue * eased);
        element.textContent = formatCurrency(currentValue);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            // Valeur finale exacte (évite les arrondis de fin d'animation)
            element.textContent = formatCurrency(finalValue);
        }
    }

    requestAnimationFrame(step);
}

// ─── Affichage des résultats ──────────────────────────────────────────────────

/**
 * Met à jour l'interface avec les résultats calculés et révèle la section résultats.
 * Les économies admin et produits s'affichent instantanément.
 * Les économies totales s'animent avec un effet de compteur.
 *
 * @param {{ adminSavings: number, productSavings: number, totalSavings: number }} results
 */
function displayResults(results) {
    // Affichage immédiat des deux premières cartes
    elAdminSavings.textContent   = formatCurrency(results.adminSavings);
    elProductSavings.textContent = formatCurrency(results.productSavings);

    // Valeur initiale à zéro — sera animée après révélation
    elTotalSavings.textContent = formatCurrency(0);

    // Rendre la section visible (retire l'attribut HTML `hidden`)
    resultsSection.removeAttribute('hidden');

    // Déclencher l'animation CSS, puis lancer le compteur une fois visible
    requestAnimationFrame(() => {
        resultsContainer.classList.add('visible');

        // Léger délai pour que l'animation d'entrée CSS commence en premier
        setTimeout(() => {
            animateCounter(elTotalSavings, results.totalSavings);
        }, 300);
    });

    // Défiler vers les résultats
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Gestion de la soumission du formulaire ───────────────────────────────────

form.addEventListener('submit', (event) => {
    event.preventDefault();

    // 1. Lire les données brutes
    const formData = getFormData();
    const articlesSelectionnes = getSelectedProducts();

    // 2. Valider — stoppe si invalide
    if (!validateInputs(formData, articlesSelectionnes)) return;

    // 3. Tout est valide : effacer les erreurs résiduelles
    clearAllErrors();
    clearProductsError();

    // 4. Calculer
    const results = calculateSavings({ ...formData, articlesSelectionnes });

    // 5. Afficher
    displayResults(results);

    // 6. Tracking Meta Pixel — événement de conversion Lead
    if (typeof fbq !== 'undefined') {
        fbq('track', 'Lead', {
            content_name: 'EstimateCalculated',
            value: results.totalSavings,
            currency: 'CAD',
        });
    }
});
