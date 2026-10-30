import type { Messages } from "./en";

// Core screens translated; remaining keys fall back to English. Rendered RTL.
export const ar: Partial<Messages> = {
  "app.tagline": "وكيلك الذكي للبحث عن عمل – صادق وشفاف وتحت سيطرتك.",
  "nav.dashboard": "لوحة التحكم", "nav.cv": "السيرة الذاتية والملف", "nav.loops": "وكلاء البحث", "nav.matches": "الوظائف المطابقة",
  "nav.applications": "الطلبات", "nav.notifications": "الإشعارات", "nav.sources": "مصادر الوظائف", "nav.settings": "الإعدادات", "nav.logout": "تسجيل الخروج",
  "common.save": "حفظ", "common.cancel": "إلغاء", "common.delete": "حذف", "common.back": "رجوع", "common.open": "فتح",
  "common.company": "الشركة", "common.position": "الوظيفة", "common.location": "الموقع", "common.date": "التاريخ", "common.status": "الحالة", "common.source": "المصدر", "common.score": "التطابق",
  "auth.login": "تسجيل الدخول", "auth.register": "إنشاء حساب", "auth.email": "البريد الإلكتروني", "auth.password": "كلمة المرور", "auth.name": "الاسم",
  "auth.noAccount": "ليس لديك حساب؟", "auth.haveAccount": "لديك حساب بالفعل؟", "auth.invalid": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "landing.headline": "ارفع سيرتك الذاتية مرة واحدة، ووكيلك يجد لك وظائف مناسبة كل يوم.",
  "landing.sub": "مصادر وظائف حقيقية، ودرجة تطابق واضحة، وخطابات تقديم بالذكاء الاصطناعي لا تختلق أي معلومة. لا يُرسل شيء دون موافقتك.",
  "landing.cta": "ابدأ مجاناً",
  "onboarding.title": "الإعداد", "onboarding.step1": "ارفع سيرتك الذاتية", "onboarding.step2": "راجع ملفك", "onboarding.step3": "أنشئ أول وكيل بحث", "onboarding.go": "ابدأ", "onboarding.done": "تم",
  "dash.hello": "مرحباً، {name}", "dash.kpi.jobsToday": "وظائف اليوم", "dash.kpi.matches": "إجمالي المطابقات", "dash.kpi.pending": "بانتظار الموافقة",
  "dash.kpi.sent": "طلبات مُرسلة", "dash.kpi.interviews": "مقابلات", "dash.kpi.rejections": "رفض", "dash.kpi.activeLoops": "وكلاء نشطون", "dash.kpi.responseRate": "نسبة الردود",
  "dash.recent": "أحدث الطلبات", "dash.activity": "نشاط الوكلاء",
  "status.draft": "مسودة", "status.pending_approval": "بانتظار الموافقة", "status.approved": "تمت الموافقة – قدّم الآن", "status.submitted": "أُرسل (مؤكد)",
  "status.applied_externally": "تم التقديم (بواسطتك)", "status.interview": "مقابلة", "status.offer": "عرض", "status.rejected": "مرفوض", "status.withdrawn": "مسحوب",
};
