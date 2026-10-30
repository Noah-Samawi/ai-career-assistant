import type { Messages } from "./en";

// Core screens translated; remaining keys fall back to English.
export const es: Partial<Messages> = {
  "app.tagline": "Tu agente de IA para buscar empleo – honesto, transparente y bajo tu control.",
  "nav.dashboard": "Panel", "nav.cv": "CV y perfil", "nav.loops": "Agentes de búsqueda", "nav.matches": "Coincidencias",
  "nav.applications": "Candidaturas", "nav.notifications": "Notificaciones", "nav.sources": "Fuentes de empleo", "nav.settings": "Ajustes", "nav.logout": "Cerrar sesión",
  "common.save": "Guardar", "common.cancel": "Cancelar", "common.delete": "Eliminar", "common.back": "Volver", "common.open": "Abrir",
  "common.company": "Empresa", "common.position": "Puesto", "common.location": "Ubicación", "common.date": "Fecha", "common.status": "Estado", "common.source": "Fuente", "common.score": "Coincidencia",
  "auth.login": "Iniciar sesión", "auth.register": "Crear cuenta", "auth.email": "Correo", "auth.password": "Contraseña", "auth.name": "Nombre",
  "auth.noAccount": "¿Aún no tienes cuenta?", "auth.haveAccount": "¿Ya tienes cuenta?", "auth.invalid": "Correo o contraseña incorrectos.",
  "landing.headline": "Sube tu CV una vez. Tu agente encuentra ofertas adecuadas cada día.",
  "landing.sub": "Fuentes de empleo reales, una puntuación transparente y cartas de presentación con IA que no inventan nada. Nada se envía sin tu aprobación.",
  "landing.cta": "Empieza gratis",
  "onboarding.title": "Configuración", "onboarding.step1": "Sube tu CV", "onboarding.step2": "Revisa tu perfil", "onboarding.step3": "Crea tu primer agente", "onboarding.go": "Ir", "onboarding.done": "Hecho",
  "dash.hello": "Hola, {name}", "dash.kpi.jobsToday": "Ofertas encontradas hoy", "dash.kpi.matches": "Coincidencias", "dash.kpi.pending": "Pendientes de aprobación",
  "dash.kpi.sent": "Candidaturas enviadas", "dash.kpi.interviews": "Entrevistas", "dash.kpi.rejections": "Rechazos", "dash.kpi.activeLoops": "Agentes activos", "dash.kpi.responseRate": "Tasa de respuesta",
  "dash.recent": "Candidaturas recientes", "dash.activity": "Actividad de los agentes",
  "status.draft": "Borrador", "status.pending_approval": "Pendiente de aprobación", "status.approved": "Aprobada – postula ahora", "status.submitted": "Enviada (confirmada)",
  "status.applied_externally": "Postulada (por ti)", "status.interview": "Entrevista", "status.offer": "Oferta", "status.rejected": "Rechazada", "status.withdrawn": "Retirada",
};
