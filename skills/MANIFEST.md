# مهارات OpenCode — مجمع من 12 مصدرًا

## المصادر المُجَمَّعة

| المجلد | المصدر الأصلي | عدد الملفات |
|---|---|---|
| skills/ | https://github.com/mattpocock/skills | 5 |
| opencode/ | https://github.com/anomalyco/opencode | 49 |
| opencode-skills/ | https://github.com/composio-community/opencode-skills + polip + open-hax | 2 |
| agent-skills/ | https://github.com/elastic/agent-skills + gohypergiant | 30 |
| AI-Agent-skills/ | https://github.com/whobat/AI-Agent-skills | 12 |
| ai_agent_skills/ | https://github.com/julweber/ai_agent_skills | 14 |
| claude-code-skills/ | https://github.com/jrbobbyhansen-pixel + notmanas | 3 |

## كيفية الاستخدام مع OpenCode

1. تُقرأ هذه المهارات كـ context إضافي في محطة OpenCode المضمّنة (`third_party/opencode`).
2. يمكنك ربطها بـ `server/opencode/router.ts` عبر إضافة سياق `skills` عند إنشاء الجلسة إذا لزم الأمر.
3. لا تُخلط بين الأقسام: كل قسم (`presentations` / `programming` / `mind` / `settings`) يمرر سياقه الخاص عبر `buildAgentWorkspacePrompt` ويستخدم جلسة مستقلة (`sessionID`) إذا لزم.
4. التوثيق الكامل في `docs/OPENCODE-GATEWAY-CONTRACT.md` و `.env.example`.
