# تبيان — Tibyān

موسوعة إسلامية بخمس لغات (العربية · English · Русский · Español · Українська) تعرض حكم كل مذهب من المذاهب الأربعة في كل مسألة بمراجعه، ومعها مقالات وأدلة عقلية ومفردات واختبار.

الموقع: https://fiqhpedia.pages.dev

## البنية

| المجلد | ما فيه |
|---|---|
| `app/` `components/` `lib/` `hooks/` | الموقع (Next.js، تصدير ثابت) |
| `data/content/` | **المحتوى المحرَّر**: مسائل `issues/F*.json`، مقالات `articles/M*.json`، `core.json` (الواجهة والمفردات والكتب)، `quiz.json` |
| `data/*.json` | **مولَّد** من `data/content` بـ `tools/build_data.py` — لا يُحرَّر باليد |
| `docs/` | القواعد والضوابط وخريطة الأبواب والمفردات |
| `docs/مراجعات/` | جولات المراجعة الشرعية وشواهد الكتب |
| `prompts/` | برومتات كتابة المحتوى |
| `tools/` | البناء والتدقيق: `build_data.py` · `validate_content.py` · `check_sync.py` … |

## التشغيل

```bash
pnpm install
pnpm build        # يجمّع البيانات ويدقّقها ثم يبني الموقع في out/
pnpm dev
```

التفاصيل كلّها في `CLAUDE.md`.
