/* English Haters structured lesson contract. Browser-safe; no dependencies. */
(() => {
  const VERSION = '1.0.0';
  const TRACKS = ['junior', 'ssc', 'hsc', 'engineering', 'university'];
  const REVIEW_STATUSES = ['draft', 'review', 'approved', 'rejected', 'archived'];
  const SECTION_TYPES = [
    'introduction', 'concept', 'rule', 'formula', 'examples', 'comparison',
    'exception', 'common_mistake', 'quick_revision', 'note', 'warning',
    'list', 'text', 'practice', 'assessment'
  ];
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const asText = value => typeof value === 'string' ? value.trim() : '';
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function lessonList(input) {
    if (Array.isArray(input)) return input;
    if (isObject(input) && Array.isArray(input.lessons)) return input.lessons;
    if (isObject(input)) return [input];
    return [];
  }

  function validateSection(section, path) {
    const errors = [];
    if (!isObject(section)) return [`${path} must be an object.`];
    if (!asText(section.title)) errors.push(`${path}.title is required.`);
    const type = asText(section.type || 'text');
    if (!SECTION_TYPES.includes(type)) errors.push(`${path}.type must be one of: ${SECTION_TYPES.join(', ')}.`);
    if (section.body !== undefined && typeof section.body !== 'string') errors.push(`${path}.body must be text.`);
    if (section.formula !== undefined && typeof section.formula !== 'string') errors.push(`${path}.formula must be text.`);
    if (section.examples !== undefined && !Array.isArray(section.examples)) errors.push(`${path}.examples must be an array.`);
    if (Array.isArray(section.examples)) section.examples.forEach((example, i) => {
      if (typeof example !== 'string' && !isObject(example)) errors.push(`${path}.examples[${i}] must be text or an example object.`);
      else if (isObject(example) && !asText(example.text || example.sentence || example.example)) errors.push(`${path}.examples[${i}] needs text, sentence or example.`);
    });
    const items = section.items || section.bullets;
    if (items !== undefined && !Array.isArray(items)) errors.push(`${path}.items must be an array.`);
    if (section.table !== undefined) {
      if (!isObject(section.table)) errors.push(`${path}.table must be an object.`);
      else {
        if (!Array.isArray(section.table.headers) || !section.table.headers.length) errors.push(`${path}.table.headers must be a non-empty array.`);
        if (!Array.isArray(section.table.rows)) errors.push(`${path}.table.rows must be an array.`);
        else section.table.rows.forEach((row, i) => {
          if (!Array.isArray(row)) errors.push(`${path}.table.rows[${i}] must be an array.`);
          else if (Array.isArray(section.table.headers) && row.length !== section.table.headers.length) errors.push(`${path}.table.rows[${i}] must have ${section.table.headers.length} cells.`);
        });
      }
    }
    if (section.mistakes !== undefined && !Array.isArray(section.mistakes)) errors.push(`${path}.mistakes must be an array.`);
    if (Array.isArray(section.mistakes)) section.mistakes.forEach((mistake, i) => {
      if (!isObject(mistake) || !asText(mistake.correct) || !asText(mistake.incorrect)) errors.push(`${path}.mistakes[${i}] needs incorrect and correct text.`);
    });
    const hasContent = ['body', 'formula', 'examples', 'items', 'bullets', 'table', 'note', 'tip', 'warning', 'mistakes'].some(key => {
      const value = section[key];
      return Array.isArray(value) ? value.length > 0 : isObject(value) ? Object.keys(value).length > 0 : asText(value).length > 0;
    });
    if (!hasContent) errors.push(`${path} needs at least one content field (body, formula, examples, items, table, note or mistakes).`);
    return errors;
  }

  function validateLesson(lesson, index = 0) {
    const path = `lessons[${index}]`;
    const errors = [];
    if (!isObject(lesson)) return [`${path} must be an object.`];
    if (lesson.schema_version && lesson.schema_version !== VERSION) errors.push(`${path}.schema_version is not supported; expected ${VERSION}.`);
    if (!asText(lesson.id)) errors.push(`${path}.id is required.`);
    if (!TRACKS.includes(asText(lesson.track))) errors.push(`${path}.track must be one of: ${TRACKS.join(', ')}.`);
    const topic = asText(lesson.topic);
    if (!slugPattern.test(topic)) errors.push(`${path}.topic must be a lowercase slug (example: articles).`);
    if (!asText(lesson.title)) errors.push(`${path}.title is required.`);
    if (lesson.sections !== undefined && !Array.isArray(lesson.sections)) errors.push(`${path}.sections must be an array.`);
    if (Array.isArray(lesson.sections)) lesson.sections.forEach((section, i) => errors.push(...validateSection(section, `${path}.sections[${i}]`)));
    if ((!Array.isArray(lesson.sections) || lesson.sections.length === 0) && !asText(lesson.rule)) {
      errors.push(`${path} needs sections or a legacy rule field.`);
    }
    if (lesson.learning_outcomes !== undefined && (!Array.isArray(lesson.learning_outcomes) || lesson.learning_outcomes.some(x => typeof x !== 'string'))) errors.push(`${path}.learning_outcomes must be an array of text.`);
    if (lesson.prerequisites !== undefined && (!Array.isArray(lesson.prerequisites) || lesson.prerequisites.some(x => typeof x !== 'string'))) errors.push(`${path}.prerequisites must be an array of text.`);
    if (lesson.review_status !== undefined && !REVIEW_STATUSES.includes(asText(lesson.review_status))) errors.push(`${path}.review_status is invalid.`);
    if (lesson.estimated_minutes !== undefined && (!Number.isInteger(Number(lesson.estimated_minutes)) || Number(lesson.estimated_minutes) < 1)) errors.push(`${path}.estimated_minutes must be a positive whole number.`);
    return errors;
  }

  function validatePackage(input) {
    const lessons = lessonList(input);
    const errors = [];
    if (isObject(input) && input.schema_version && input.schema_version !== VERSION) errors.push(`schema_version is not supported; expected ${VERSION}.`);
    if (!lessons.length) return { lessons: [], errors: ['The JSON file must contain one lesson object or a lessons array.'] };
    const ids = new Set();
    lessons.forEach((lesson, index) => {
      errors.push(...validateLesson(lesson, index));
      if (isObject(lesson) && asText(lesson.id)) {
        if (ids.has(lesson.id)) errors.push(`Duplicate lesson id in this file: ${lesson.id}.`);
        ids.add(lesson.id);
      }
    });
    return { lessons, errors };
  }

  function normalizeLesson(input) {
    const lesson = JSON.parse(JSON.stringify(input));
    lesson.schema_version = VERSION;
    lesson.id = asText(lesson.id);
    lesson.track = asText(lesson.track);
    lesson.topic = asText(lesson.topic).toLowerCase();
    lesson.title = asText(lesson.title);
    lesson.summary = asText(lesson.summary);
    lesson.rule = asText(lesson.rule || lesson.summary);
    lesson.level = asText(lesson.level || 'foundation');
    lesson.estimated_minutes = Number(lesson.estimated_minutes || 10);
    lesson.prerequisites = Array.isArray(lesson.prerequisites) ? lesson.prerequisites : [];
    lesson.learning_outcomes = Array.isArray(lesson.learning_outcomes) ? lesson.learning_outcomes : [];
    lesson.sections = Array.isArray(lesson.sections) ? lesson.sections.map((section, index) => ({
      ...section,
      id: asText(section.id) || `section-${index + 1}`,
      type: asText(section.type || 'text')
    })) : [];
    lesson.examples = Array.isArray(lesson.examples) ? lesson.examples : [];
    lesson.sort_order = Number(lesson.sort_order || 0);
    lesson.review_status = REVIEW_STATUSES.includes(lesson.review_status) ? lesson.review_status : 'review';
    lesson.import_batch = asText(lesson.import_batch);
    lesson.published = lesson.review_status === 'approved' && lesson.published === true;
    return lesson;
  }

  window.EHLessonSchema = {
    VERSION,
    TRACKS,
    REVIEW_STATUSES,
    SECTION_TYPES,
    lessonList,
    validateSection,
    validateLesson,
    validatePackage,
    normalizeLesson
  };
})();
