/* ==========================================================================
   APPROVIZ — Estimateur d'Économies v2
   js/main.js
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   1. ÉCONOMIES UNITAIRES PAR PRODUIT ($ par employé par commande)
   -------------------------------------------------------------------------- */

var economieUnitaire = {
    tshirt:          7,
    hoodie:         12,
    crewneck:       10,
    manteau:        50,
    mancheLongue:   10,
    hoodieZipper:   20,
    tuque:          10,
    casquetteBrodee: 10
};

/* --------------------------------------------------------------------------
   2. FORMULE DE CALCUL
   -------------------------------------------------------------------------- */

/**
 * Calcule les économies estimées selon les paramètres du formulaire.
 *
 * @param {object} params
 * @param {number}   params.nbEmployes         - Nombre d'employés
 * @param {number}   params.tauxHoraire        - Taux horaire moyen ($)
 * @param {number}   params.heuresMensuelles   - Heures/mois consacrées aux achats
 * @param {number}   params.frequence          - Nombre de commandes par année
 * @param {string[]} params.articlesSelectionnes - Clés des produits cochés
 * @returns {{ economiesAdmin: number, economiesProduits: number, totalEconomies: number }}
 */
function calculerEconomies(params) {
    var nbEmployes          = params.nbEmployes;
    var tauxHoraire         = params.tauxHoraire;
    var heuresMensuelles    = params.heuresMensuelles;
    var frequence           = params.frequence;
    var articlesSelectionnes = params.articlesSelectionnes;

    // Étape 1 : coût administratif annuel
    var coutAdmin = heuresMensuelles * tauxHoraire * 12;

    // Étape 2 : économies sur le temps administratif (70 % récupéré)
    var economiesAdmin = coutAdmin * 0.70;

    // Étape 3 : économies sur les produits
    var economiesProduits = articlesSelectionnes.reduce(function(total, article) {
        var unitaire = economieUnitaire[article] || 0;
        return total + (unitaire * nbEmployes);
    }, 0) * frequence;

    // Étape 4 : total
    var totalEconomies = economiesAdmin + economiesProduits;

    return {
        economiesAdmin:    Math.round(economiesAdmin),
        economiesProduits: Math.round(economiesProduits),
        totalEconomies:    Math.round(totalEconomies)
    };
}

/* --------------------------------------------------------------------------
   3. FORMATAGE DE LA DEVISE
   -------------------------------------------------------------------------- */

/**
 * Formate un nombre en devise canadienne-française.
 * Ex : 12345 → "12 345 $"
 *
 * @param {number} montant
 * @returns {string}
 */
function formaterDevise(montant) {
    return new Intl.NumberFormat('fr-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0
    }).format(montant);
}

/* --------------------------------------------------------------------------
   4. ANIMATION DU COMPTEUR
   -------------------------------------------------------------------------- */

/**
 * Anime un élément HTML de 0 jusqu'à valeurFinale sur 1,5 seconde.
 * Utilise une courbe ease-out pour un effet fluide et naturel.
 * Respecte la préférence "prefers-reduced-motion".
 *
 * @param {HTMLElement} element      - L'élément dont le contenu est animé.
 * @param {number}      valeurFinale - La valeur cible.
 * @param {number}      [duree]      - Durée en ms (défaut : 1500).
 */
function animerCompteur(element, valeurFinale, duree) {
    duree = duree || 1500;

    // Respect de la préférence système : pas d'animation
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.textContent = formaterDevise(valeurFinale);
        return;
    }

    var startTime = null;

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function step(timestamp) {
        if (!startTime) startTime = timestamp;

        var elapsed  = timestamp - startTime;
        var progress = Math.min(elapsed / duree, 1);
        var eased    = easeOutCubic(progress);
        var valeurActuelle = Math.round(valeurFinale * eased);

        element.textContent = formaterDevise(valeurActuelle);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = formaterDevise(valeurFinale);
        }
    }

    requestAnimationFrame(step);
}

/* --------------------------------------------------------------------------
   5. SÉLECTION DES ÉLÉMENTS DU DOM
   -------------------------------------------------------------------------- */

var form               = document.getElementById('estimator-form');
var inputNbEmployes    = document.getElementById('nbEmployes');
var inputTauxHoraire   = document.getElementById('tauxHoraire');
var inputHeures        = document.getElementById('heuresMensuelles');
var selectFrequence    = document.getElementById('frequence');
var productCards       = document.querySelectorAll('.product-card');
var productCheckboxes  = document.querySelectorAll('#product-grid input[type="checkbox"]');
var calculateBtn       = document.getElementById('calculate-btn');

var resultsSection     = document.getElementById('results-section');
var elAdminSavings     = document.getElementById('admin-savings');
var elProductSavings   = document.getElementById('product-savings');
var elTotalSavings     = document.getElementById('total-savings');

var productsError      = document.getElementById('products-error');
var currentYearEl      = document.getElementById('current-year');

/* --------------------------------------------------------------------------
   6. INITIALISATION
   -------------------------------------------------------------------------- */

// Année dans le footer
if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
}

/* --------------------------------------------------------------------------
   7. INTERACTION DES CARTES PRODUITS
   Synchronise l'état visuel (classe is-selected) avec la checkbox native.
   -------------------------------------------------------------------------- */

productCards.forEach(function(card) {
    var checkbox = card.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    // Clic sur la carte entière toggle la checkbox et la classe visuelle
    card.addEventListener('click', function(event) {
        // Évite le double-toggle si le clic vient directement de la checkbox
        if (event.target === checkbox) return;

        checkbox.checked = !checkbox.checked;
        card.classList.toggle('is-selected', checkbox.checked);
    });

    // Si le clic vient de la checkbox elle-même (navigateur clavier / label)
    checkbox.addEventListener('change', function() {
        card.classList.toggle('is-selected', checkbox.checked);
    });
});

/* --------------------------------------------------------------------------
   8. GESTION DES ERREURS DE CHAMPS
   -------------------------------------------------------------------------- */

/**
 * Affiche un message d'erreur sous un champ de formulaire.
 *
 * @param {HTMLElement} inputEl  - Le champ concerné.
 * @param {string}      message  - Le texte d'erreur.
 */
function afficherErreurChamp(inputEl, message) {
    var group = inputEl.closest('.form-group');
    if (!group) return;

    inputEl.classList.add('is-invalid');
    inputEl.setAttribute('aria-invalid', 'true');

    var errorEl = group.querySelector('.field-error');
    if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.setAttribute('role', 'alert');
        group.appendChild(errorEl);
    }
    errorEl.textContent = message;
}

/**
 * Efface l'état d'erreur d'un champ.
 *
 * @param {HTMLElement} inputEl
 */
function effacerErreurChamp(inputEl) {
    var group = inputEl.closest('.form-group');
    if (!group) return;

    inputEl.classList.remove('is-invalid');
    inputEl.removeAttribute('aria-invalid');

    var errorEl = group.querySelector('.field-error');
    if (errorEl) errorEl.remove();
}

/** Efface toutes les erreurs du formulaire. */
function effacerToutesLesErreurs() {
    [inputNbEmployes, inputTauxHoraire, inputHeures, selectFrequence].forEach(effacerErreurChamp);
}

/* --------------------------------------------------------------------------
   9. VALIDATION DU FORMULAIRE
   -------------------------------------------------------------------------- */

/**
 * Valide les données avant le calcul.
 * Affiche les messages d'erreur inline sur les champs invalides.
 *
 * @param {object}   formData              - Données lues du formulaire.
 * @param {string[]} articlesSelectionnes  - Produits cochés.
 * @returns {boolean} true si tout est valide.
 */
function validerFormulaire(formData, articlesSelectionnes) {
    var estValide = true;

    // Nombre d'employés
    if (!formData.nbEmployes || isNaN(formData.nbEmployes) || formData.nbEmployes < 1) {
        afficherErreurChamp(inputNbEmployes, 'Veuillez entrer un nombre d\'employés valide (minimum 1).');
        estValide = false;
    } else {
        effacerErreurChamp(inputNbEmployes);
    }

    // Taux horaire
    if (isNaN(formData.tauxHoraire) || formData.tauxHoraire < 0) {
        afficherErreurChamp(inputTauxHoraire, 'Veuillez entrer un taux horaire valide (0 $ ou plus).');
        estValide = false;
    } else {
        effacerErreurChamp(inputTauxHoraire);
    }

    // Heures mensuelles
    if (isNaN(formData.heuresMensuelles) || formData.heuresMensuelles < 0) {
        afficherErreurChamp(inputHeures, 'Veuillez entrer un nombre d\'heures valide (0 ou plus).');
        estValide = false;
    } else {
        effacerErreurChamp(inputHeures);
    }

    // Fréquence
    if (!formData.frequence || isNaN(formData.frequence) || formData.frequence <= 0) {
        afficherErreurChamp(selectFrequence, 'Veuillez sélectionner une fréquence de commande.');
        estValide = false;
    } else {
        effacerErreurChamp(selectFrequence);
    }

    // Au moins un produit sélectionné
    if (articlesSelectionnes.length === 0) {
        productsError.textContent = 'Veuillez sélectionner au moins un type d\'article.';
        productsError.removeAttribute('hidden');
        estValide = false;
    } else {
        productsError.setAttribute('hidden', '');
    }

    return estValide;
}

/* --------------------------------------------------------------------------
   10. LECTURE DES DONNÉES DU FORMULAIRE
   -------------------------------------------------------------------------- */

function lireFormulaire() {
    return {
        nbEmployes:          parseFloat(inputNbEmployes.value),
        tauxHoraire:         parseFloat(inputTauxHoraire.value),
        heuresMensuelles:    parseFloat(inputHeures.value),
        frequence:           parseInt(selectFrequence.value, 10)
    };
}

function lireArticlesSelectionnes() {
    return Array.from(productCheckboxes)
        .filter(function(cb) { return cb.checked; })
        .map(function(cb) { return cb.value; });
}

/* --------------------------------------------------------------------------
   11. AFFICHAGE DES RÉSULTATS
   -------------------------------------------------------------------------- */

/**
 * Affiche la section résultats et remplit les valeurs calculées.
 * L'économie totale s'anime avec le compteur sur 1,5 seconde.
 *
 * @param {{ economiesAdmin: number, economiesProduits: number, totalEconomies: number }} resultats
 */
function afficherResultats(resultats) {
    // Valeurs instantanées pour les deux premières cartes
    elAdminSavings.textContent   = formaterDevise(resultats.economiesAdmin);
    elProductSavings.textContent = formaterDevise(resultats.economiesProduits);

    // Valeur initiale zéro pour la carte totale (sera animée)
    elTotalSavings.textContent = formaterDevise(0);

    // Révèle la section (retire l'attribut hidden du HTML)
    resultsSection.removeAttribute('hidden');

    // Lance le compteur avec un léger délai pour laisser l'entrée CSS se déclencher
    setTimeout(function() {
        animerCompteur(elTotalSavings, resultats.totalEconomies, 1500);
    }, 250);

    // Défilement fluide vers les résultats
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* --------------------------------------------------------------------------
   12. SOUMISSION DU FORMULAIRE
   -------------------------------------------------------------------------- */

form.addEventListener('submit', function(event) {
    event.preventDefault();

    // 1. Lire les données brutes
    var formData             = lireFormulaire();
    var articlesSelectionnes = lireArticlesSelectionnes();

    // 2. Valider — stoppe si invalide
    if (!validerFormulaire(formData, articlesSelectionnes)) return;

    // 3. Tout est valide : effacer les éventuelles erreurs résiduelles
    effacerToutesLesErreurs();
    productsError.setAttribute('hidden', '');

    // 4. Calculer
    var resultats = calculerEconomies({
        nbEmployes:          formData.nbEmployes,
        tauxHoraire:         formData.tauxHoraire,
        heuresMensuelles:    formData.heuresMensuelles,
        frequence:           formData.frequence,
        articlesSelectionnes: articlesSelectionnes
    });

    // 5. Afficher
    afficherResultats(resultats);
});
