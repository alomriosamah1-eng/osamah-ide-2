# تحديث التحقق — العروض وتكامل OpenCode
**التاريخ:** 26 أغسطس 2026
**المصدر:** docs/WORKSPACE-INTERACTION-REVIEW.md + docs/OPENCODE-GATEWAY-CONTRACT.md + todo.md

## العروض التقديمية (Presenton / Presentation Studio)
- **الحالة:** مُحققة بصرياً وبرمجياً.
- **ما يعمل:** إنشاء/تعديل/حذف العروض والشرائح، حماية المسودات غير المحفوظة (`unsaved-file-guard`)، استعلام حالة Presenton (`presentonRouter`)، نموذج إنشاء الملف وإعادة التسمية.
- **ما لم يُدّعَ:** توليد أو تصدير محتوى Presenton غير متوفر حالياً (يتطلب إعداد مزود معتمد).
- **القيود:** لا بيانات عرض مصطنعة في المراجعة؛ الاختبارات تستخدم حساب اختبار ثم تُنظف.

## تكامل OpenCode
- **الحالة:** واجهة الدردشة مرتبطة بوسيط Osamah الخادمي؛ تشغيل المحرك والجلسة تحققا محلياً.
- **القيود الصادقة:**
  1. `OPENCODE_EMBEDDED_EXECUTION_ENABLED` غير مضبوط حالياً (القيمة 0 حذرة من النشر العام).
  2. `bun` لم يكن متاحاً في بيئة العمل؛ تم تثبيته في `~/.bun/bin/bun`.
  3. تم تثبيت تبعيات `third_party/opencode` عبر `bun install --frozen-lockfile`.
  4. تم بناء/تشغيل المصدر المضمّن بعد إعداد `bun` و`OPENCODE_BUN_PATH`.
- **نتيجة الفحص القديم (قبل الإصلاح):** `unreachable` بسبب غياب `bun`.
- **نتيجة الفحص الجديد (بعد الإصلاح):** `verify-embedded-opencode-session.mjs` ناجح — `runtime: running`، `modelCount: 29`، `sessionCreated: true`، `sessionRemoved: true`، `absenceVerified: true`. ولم يُرسل أي `prompt` (لأن `OPENCODE_EMBEDDED_EXECUTION_ENABLED=0` يمنع التنفيذ، وهو الحاجز المؤقت المطلوب).
- **ما تم:** إنشاء `.env.example`، توثيق القيود في هذا الملف.
- **الخطوة التالية المطلوبة (من docs):** تهيئة مزود حقيقي في OpenCode خارج الواجهة، ثم إثبات إرسال رسالة واسترجاع رد وموافقة صريحة قبل الإعلان عن الدردشة التنفيذية.
