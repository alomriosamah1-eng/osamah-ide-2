# علم آثار معماري لوكيل OpenCode

**الحالة:** دفعة 17 — تحليل مصدر قابل للتتبع، وليس إعلاناً عن اتصال مزود أو تنفيذ أداة لم يُثبت بعد.

## نطاق المراجعة

راجعت النسخة المضمّنة تحت `third_party/opencode/`، ثم قارنت هوية الحزمة ومراجع المصدر مع المستودع الرسمي [anomalyco/opencode][1]. النسخة المضمّنة تعلن في `packages/opencode/package.json` عن الإصدار `1.18.23` وترخيص MIT. أما GitHub فيعرض فرع `dev` وإصداراً أحدث مرئياً وقت المراجعة هو `v1.18.26`؛ لذلك لا يجوز وصف النسخة المضمّنة بأنها أحدث نسخة، ولا يجوز استبدالها تلقائياً من الشبكة أثناء البناء.

## خريطة المكوّنات الفعلية

| المجال | المصدر المضمّن | ما يقدمه فعلياً | قرار الدمج في Osamah |
|---|---|---|---|
| اكتشاف المزودين والنماذج | `packages/core/src/models-dev.ts` و`packages/opencode/src/provider/provider.ts` | مخطط مزود يحوي `id`, `name`, `env`, `npm`, `api`, ونماذج تحوي القيود والتكلفة و`reasoning` و`tool_call` والوسائط والحالة. الجرد يقرأ `models.opencode.ai/api.json` ويخزنه مؤقتاً لمدة محدودة. | يستعمل Osamah نتيجة اكتشاف OpenCode أو `/api/model` فقط؛ لا ينشئ قائمة بديلة عند الفراغ. |
| محولات المزود | `packages/opencode/src/provider/provider.ts` | محولات SDK مضمّنة لمزودين متعددين، مع تحميل كسول، اختيار endpoint (`chat`/`responses`/`languageModel`) ومعالجة متغيرات البيئة والتوثيق. | تبقى مفاتيح المزود وتفاصيل المحول داخل عملية OpenCode/الخادم؛ لا تنقل إلى React. |
| بناء الطلب والتحويل | `packages/opencode/src/provider/transform.ts` و`packages/opencode/src/session/llm/request.ts` | تحويل رسائل وميزات النموذج وخيارات التفكير والأدوات إلى عقد SDK المناسب، مع سياسات خاصة بالمزود. | لا يعاد تنفيذ هذه القواعد في الواجهة. طبقة Osamah تنسق الجلسة وتعرض حالة صريحة فقط. |
| دورة الجلسة | `packages/opencode/src/session/session.ts`, `prompt.ts`, `processor.ts` | معالجة دورة prompt، أجزاء الرسائل، إعادة المحاولة، ضغط السياق، وتحديث أجزاء استدعاء الأدوات. | طبقة البوابة تحفظ حدود الملكية والسياسة، وتتعامل مع أحداث الجلسة كبيانات غير موثوقة حتى تُتحقق. |
| استدعاء الأدوات | `packages/opencode/src/session/message-v2.ts` و`processor.ts` ومجلدات `tool` | تمثيل `ToolCall` و`ToolResult` وربط معرّف الاستدعاء بالنتيجة ومعالجة حالات partial/done/error. | لا يسمح Osamah بأداة جديدة أو تنفيذ عميل مباشر؛ التنفيذ يجب أن يمر من جلسة OpenCode المصرح بها. |
| البث | `packages/opencode/src/session/llm/ai-sdk.ts`, `native-request.ts`, `native-runtime.ts` ومسار النقل `cli/cmd/run/stream.transport.ts` | مسارات SDK/native وبث أجزاء الطلب والرسالة، مع مهلات وقطع وإعادة محاولة في الطبقات المناسبة. | المرحلة الحالية تستخدم انتظاراً ثم قراءة الرسائل؛ SSE/streaming حي دفعة لاحقة بعد عقد واختبار مستقل. |
| HTTP API | `packages/client/src/generated/client.ts` و`types.ts` ومسارات `server/routes/instance/httpapi/groups` | عقد مولد للجلسات والمزودين والرسائل والأذونات. | `server/opencode/api.ts` هو الغلاف المملوك لـOsamah، ولا تتصل React بمحرك OpenCode مباشرة. |

## دورة الوكيل المطلوبة

الدورة المستهدفة في متطلبات المشروع هي **Observe → Reason → Plan → Call Model → Tool Call → Execute Tool → Return Result → Continue → Final Answer**. في مصدر OpenCode، توجد هذه المسؤوليات موزعة بين معالجة الجلسة، تحويل الطلب، أجزاء الرسائل، ومعالج استدعاءات الأدوات؛ وليست دالة مستقلة يمكن استيرادها بأمان إلى خادم Osamah من دون نقل شجرة اعتماد OpenCode كاملة. لذلك يكون مسار التنفيذ الصحيح هو جعل OpenCode محرك الدورة، بينما تملك Osamah طبقة Gateway للتحقق من الهوية والملكية والسياسة والتدفق، لا نسخة سطحية منطقية تنافس المصدر.

## الفجوة الحالية

يملك Osamah حالياً اكتشاف الحالة والنماذج وإنشاء الجلسة وإرسال prompt والانتظار وقراءة الرسائل والأذونات، مع حارس `OPENCODE_EMBEDDED_EXECUTION_ENABLED=1`. لا يملك بعد **سجل مزود مستقل** يحافظ على قدرات النموذج الموسعة، ولا مدير بث حي، ولا سجل أحداث دورة وكيل قابل للتدقيق، ولا اختباراً فعلياً مع مزود مهيأ داخل بيئة التشغيل الحالية. ونتيجة `/api/model` الفارغة حالة إعداد صحيحة وليست سبباً لإضافة نموذج وهمي.

## قرار الدفعة التالية

تبدأ الدفعة التالية بعقود pure functions لسجل المزودين والنماذج وحساب القدرات من بيانات اكتشاف حقيقية، مع اختبارات رفض للمدخلات غير الموثوقة. بعدها فقط ينفذ Router/Authentication Manager/Streaming Manager على الخادم. لن تُضاف أسرار أو endpoints أو معرفات نماذج ثابتة، ولن تُعلن إجابة وكيل قبل تشغيل مزود حقيقي وإثبات المسار طرفياً.

## ملاحظات الترخيص والتحديث

مصدر OpenCode المضمّن مرخص MIT وفق ملف `third_party/opencode/LICENSE` وبيانات الحزمة المحلية. يجب الاحتفاظ بنص الترخيص وسجل الإصدار عند أي تحديث. لا ينبغي دمج تغييرات الإصدار الأحدث تلقائياً لأن ذلك قد يغيّر عقود SDK أو الحزم أو سلوك HTTP؛ يلزم حينها تحديث مضبوط مع فحوص حدود واستعراض فروقات.

## المراجع

[1]: https://github.com/anomalyco/opencode "المستودع الرسمي لـ OpenCode"
[2]: https://github.com/anomalyco/opencode/releases/tag/v1.18.26 "إصدار OpenCode v1.18.26"
[3]: https://github.com/anomalyco/opencode/blob/dev/packages/core/src/models-dev.ts "مصدر جرد النماذج في OpenCode"
[4]: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/provider/provider.ts "مصدر محولات المزودين في OpenCode"
[5]: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/processor.ts "مصدر معالجة استدعاءات الأدوات والجلسة"
[6]: https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/llm/ai-sdk.ts "مصدر تكامل LLM والبث عبر AI SDK"
