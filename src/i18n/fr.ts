import type { Messages } from "./en";

// Core screens translated; remaining keys fall back to English.
export const fr: Partial<Messages> = {
  "app.tagline": "Votre agent IA de recherche d'emploi – honnête, transparent, sous votre contrôle.",
  "nav.dashboard": "Tableau de bord", "nav.cv": "CV & profil", "nav.loops": "Agents de recherche", "nav.matches": "Correspondances",
  "nav.applications": "Candidatures", "nav.notifications": "Notifications", "nav.sources": "Sources d'offres", "nav.settings": "Paramètres", "nav.logout": "Déconnexion",
  "common.save": "Enregistrer", "common.cancel": "Annuler", "common.delete": "Supprimer", "common.back": "Retour", "common.open": "Ouvrir",
  "common.company": "Entreprise", "common.position": "Poste", "common.location": "Lieu", "common.date": "Date", "common.status": "Statut", "common.source": "Source", "common.score": "Score",
  "auth.login": "Se connecter", "auth.register": "Créer un compte", "auth.email": "E-mail", "auth.password": "Mot de passe", "auth.name": "Nom",
  "auth.noAccount": "Pas encore de compte ?", "auth.haveAccount": "Déjà inscrit ?", "auth.invalid": "E-mail ou mot de passe incorrect.",
  "landing.headline": "Téléchargez votre CV une fois. Votre agent trouve chaque jour des offres adaptées.",
  "landing.sub": "De vraies sources d'offres, un score transparent et des lettres de motivation IA qui n'inventent rien. Rien n'est envoyé sans votre accord.",
  "landing.cta": "Commencer gratuitement",
  "onboarding.title": "Configuration", "onboarding.step1": "Télécharger votre CV", "onboarding.step2": "Vérifier votre profil", "onboarding.step3": "Créer votre premier agent", "onboarding.go": "Go", "onboarding.done": "Fait",
  "dash.hello": "Bonjour, {name}", "dash.kpi.jobsToday": "Offres trouvées aujourd'hui", "dash.kpi.matches": "Correspondances", "dash.kpi.pending": "En attente d'approbation",
  "dash.kpi.sent": "Candidatures envoyées", "dash.kpi.interviews": "Entretiens", "dash.kpi.rejections": "Refus", "dash.kpi.activeLoops": "Agents actifs", "dash.kpi.responseRate": "Taux de réponse",
  "dash.recent": "Candidatures récentes", "dash.activity": "Activité des agents",
  "status.draft": "Brouillon", "status.pending_approval": "En attente d'approbation", "status.approved": "Approuvée – postulez", "status.submitted": "Envoyée (confirmée)",
  "status.applied_externally": "Postulé (par vous)", "status.interview": "Entretien", "status.offer": "Offre", "status.rejected": "Refusée", "status.withdrawn": "Retirée",
};
