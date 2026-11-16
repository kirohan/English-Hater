# English-Hater Structured Lesson Content Guide

**Schema version:** `1.0.0`  
**Purpose:** Author, validate, review and publish complete lessons without changing application code for each new chapter.

## 1. Content model

A lesson is one complete topic for one learning track. Put its rules, subtopics, explanations, examples, comparisons, exceptions and revision notes in `sections`. Link its practice questions through the existing `track` and `topic` fields in the question bank.

Use one lesson per track and topic. For example, `lesson-ssc-article` uses `track: "ssc"` and `topic: "article"` to replace the current SSC sample topic. Keep the topic slug aligned with the existing question bank. The same chapter for HSC can have a separate ID and `track: "hsc"`.

## 2. Required lesson fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Stable unique ID, such as `lesson-ssc-article` |
| `track` | Yes | `junior`, `ssc`, `hsc`, `engineering`, or `university` |
| `topic` | Yes | Lowercase slug, such as `article` |
| `title` | Yes | Student-facing lesson title |
| `sections` | Yes for rich lessons | Ordered array of lesson sections |
| `schema_version` | Recommended | Currently `1.0.0` |
| `summary` | Recommended | Short introduction shown under the title |
| `level` | Recommended | `foundation`, `beginner`, `intermediate`, `advanced`, or a suitable label |
| `estimated_minutes` | Recommended | Approximate reading and learning time |
| `prerequisites` | Optional | Concepts students should know first |
| `learning_outcomes` | Optional | What students should be able to do after the lesson |
| `sort_order` | Optional | Order within the learning path |
| `source_reference` | Optional | Source title, printed page range and editorial provenance; not shown in the student lesson |
| `practice` | Optional | Link to the protected question bank and supplementary worksheets |

Legacy `rule` and `examples` fields remain supported for older lessons.

## 3. Supported section types

- `introduction`
- `concept`
- `rule`
- `formula`
- `examples`
- `comparison`
- `exception`
- `common_mistake`
- `quick_revision`
- `note`
- `warning`
- `list`
- `text`
- `practice`
- `assessment`

Each section requires a `title` and at least one content field.

## 4. Section fields

| Field | Shape | Purpose |
|---|---|---|
| `id` | String | Stable section anchor ID |
| `type` | String | One supported section type |
| `title` | String | Section heading |
| `body` | String | Explanation; blank lines create paragraphs |
| `formula` | String | Grammar or sentence structure |
| `examples` | Array | Strings or example objects |
| `items` | Array | Bullets or short steps |
| `table` | Object | `headers` and `rows` arrays |
| `mistakes` | Array | Objects with `incorrect`, `correct`, `explanation` |
| `note` | String or object | Tip, note or warning callout |
| `tip` | String | Short learning tip |
| `warning` | String | Important caution |

Example object:

```json
{
  "text": "An hour",
  "explanation": "The h is silent, so the word begins with a vowel sound.",
  "translation": "এক ঘণ্টা"
}
```

## 5. Editorial workflow

1. Prepare one JSON file using `lesson-import-template.json`.
2. Open `admin.html` and choose **Import / Backup**.
3. Upload the JSON file and run validation.
4. Review the preview and commit it to the local review queue.
5. Check every rule, example, table and answer against the approved source.
6. Approve the lesson in the Review Queue.
7. Test it in the student app.
8. Back up the content, then publish through `cloud-admin.html`.

JSON imports always enter the review queue as unpublished. Importing a changed version requires review again. This prevents a new draft from being published accidentally.

## 6. Content rules

- Write original explanations and examples; do not copy substantial textbook passages.
- Keep the source name, page or section reference in editorial records where appropriate.
- Use plain text in JSON. Do not paste HTML into lesson fields.
- Use Bangla only where it improves understanding or is part of the planned teaching style.
- Do not put MCQ answer keys in lesson JSON. Keep questions and answer explanations in the protected question bank.
- Keep a stable lesson ID when updating a chapter so the new version replaces the intended lesson.
- Keep source page references and editorial decisions in `source_reference` or a companion editorial report.
- If the student app only supports MCQs for a topic, keep written worksheets as companion material until the relevant interactive question type exists.
- A lesson's `topic` must match the `topic` value used by its practice questions.

## 7. Database migration

Before publishing structured lessons to Supabase, run `supabase-structured-lessons.sql` once in the Supabase SQL Editor. This adds the JSONB content column while preserving existing lesson rows.
