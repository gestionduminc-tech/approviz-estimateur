// js/model.js
// Logique de calcul pure — aucune interaction avec le DOM.
// Toutes les formules sont isolées ici pour faciliter les tests et la maintenance.

import { productSavings as productSavingsConfig } from './config.js';

// ─── Constantes de calcul ──────────────────────────────────────────────────
// NOTE : Ajuster ces valeurs lorsque le model-spec.md sera disponible.

/**
 * Pourcentage du temps administratif économisé grâce à Approviz.
 * Ex: 0.70 = Approviz élimine 70% du temps consacré aux commandes.
 */
const ADMIN_TIME_REDUCTION_RATE = 0.70;

// ─── Fonction principale ───────────────────────────────────────────────────

/**
 * Calcule les économies annuelles estimées pour une entreprise.
 *
 * @param {object} params - Les données saisies dans le formulaire.
 * @param {number} params.nbEmployes          - Nombre d'employés.
 * @param {number} params.tauxHoraire         - Taux horaire moyen ($).
 * @param {number} params.heuresMensuelles    - Heures/mois consacrées aux achats d'articles.
 * @param {number} params.frequence           - Nombre de commandes par année.
 * @param {string[]} params.articlesSelectionnes - IDs des produits sélectionnés.
 *
 * @returns {{ adminSavings: number, productSavings: number, totalSavings: number }}
 */
export function calculateSavings({
    nbEmployes,
    tauxHoraire,
    heuresMensuelles,
    frequence,
    articlesSelectionnes,
}) {
    // ── 1. Économies administratives ────────────────────────────────────────
    //
    // Coût annuel actuel du temps passé à gérer les commandes :
    //   heures/mois × taux horaire × 12 mois
    //
    // Approviz réduit ce temps de ADMIN_TIME_REDUCTION_RATE.
    //
    // Formule : adminSavings = heuresMensuelles × tauxHoraire × 12 × ADMIN_TIME_REDUCTION_RATE

    const coutAdminAnnuel = heuresMensuelles * tauxHoraire * 12;
    const adminSavings = coutAdminAnnuel * ADMIN_TIME_REDUCTION_RATE;

    // ── 2. Économies sur les produits ───────────────────────────────────────
    //
    // Pour chaque article sélectionné, Approviz offre une économie par unité
    // (définie dans config.js). On multiplie par le nombre d'employés (une unité
    // par employé par commande) et par la fréquence annuelle.
    //
    // Formule : productSavings = Σ( économie_unitaire[article] × nbEmployes ) × frequence

    const economiesProduits = articlesSelectionnes.reduce((total, productId) => {
        const economieUnitaire = productSavingsConfig[productId] ?? 0;
        return total + economieUnitaire * nbEmployes;
    }, 0) * frequence;

    // ── 3. Économies totales ────────────────────────────────────────────────

    const totalSavings = adminSavings + economiesProduits;

    return {
        adminSavings,
        productSavings: economiesProduits,
        totalSavings,
    };
}
