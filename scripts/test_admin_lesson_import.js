const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const store = new Map();
const lessonFile = { text: async () => fs.readFileSync('lesson-import-template.json', 'utf8') };
const elements = {
  '#adminApp': { innerHTML: '' },
  '#lessonJson': { files: [lessonFile] },
  '#lessonImportBatch': { value: 'qa-batch' },
  '#lessonJsonResult': { innerHTML: '' }
};
const document = { querySelector: selector => elements[selector] || null, querySelectorAll: () => [] };
const localStorage = {
  getItem: key => store.get(key) || null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key)
};
const window = {
  EH_CURRICULUM: { tracks: {
    junior: { name: 'Class 6–8' }, ssc: { name: 'SSC' }, hsc: { name: 'HSC' },
    engineering: { name: 'Engineering' }, university: { name: 'University' }
  } },
  EH_QUESTIONS: [], EH_LESSONS: []
};
const context = { window, document, localStorage, console, Date, Math, URL, Blob, confirm: () => true, alert: () => {}, setTimeout, FormData: function () {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/lesson-schema.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('admin.js', 'utf8'), context);

(async () => {
  await context.validateLessonJson();
  assert.match(elements['#lessonJsonResult'].innerHTML, /passed validation/);
  context.commitLessonJson();
  const imported = JSON.parse(store.get('eh_custom_lessons'));
  assert.equal(imported.length, 1);
  assert.equal(imported[0].review_status, 'review');
  assert.equal(imported[0].published, false);
  const review = context.reviewView();
  assert.match(review, /Preview lesson/);
  assert.match(review, /Articles: A, An and The/);
  context.saveLessons(imported.map(lesson => ({ ...lesson, review_status: 'approved', published: true })));
  const approved = JSON.parse(store.get('eh_custom_lessons'))[0];
  assert.equal(approved.review_status, 'approved');
  assert.equal(approved.published, true);
  console.log('Admin structured lesson import, review preview and approval tests passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
