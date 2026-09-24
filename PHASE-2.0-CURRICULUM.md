# English Haters — Phase 2.0 Curriculum & Content Architecture

This phase turns the V1 feature-complete app into a production content platform.

## Five production tracks

1. Class 6–8 (`junior`)
2. SSC (`ssc`)
3. HSC (`hsc`)
4. Engineering Admission (`engineering`)
5. University Admission (`university`)

Legacy `admission` data is automatically migrated to `university` for backward compatibility.

## Canonical content hierarchy

Track → Module / Chapter → Topic → Subtopic → Rule / Examples → Practice Questions

Exam-specific structures are overlays stored through metadata such as curriculum, chapter, source name, source year and tags. This avoids hard-coding one university or one year's admission pattern into the core product.

## Curriculum map size

- Class 6–8: 18 topics / 68 subtopics
- SSC: 21 topics / 78 subtopics
- HSC: 21 topics / 82 subtopics
- Engineering Admission: 14 topics / 46 subtopics
- University Admission: 21 topics / 69 subtopics
- Total: 95 planned topics / 343 subtopic rows

## Admin changes

- New Curriculum Map tab in Content Admin.
- Coverage counters show lessons/questions available for each planned topic.
- Lesson authoring now supports curriculum, chapter, review status and import batch metadata.
- Lesson CSV import/export supports the production metadata.
- Unapproved lessons cannot be published through the cloud publisher.
- `curriculum-map.csv` provides the full production planning sheet.

## Student behavior

The curriculum map does not expose empty placeholder lessons to students. Student Learn/Practice screens continue to show only content that actually exists and has been published.

For tracks that are mapped but still empty, students see that the path is being prepared rather than being sent into an empty random-practice session.

## Admission architecture

Engineering and university admissions are deliberately separate. Institution/year-specific patterns belong in overlays (for example MIST, DU, JU, GST) because admission formats can change.
