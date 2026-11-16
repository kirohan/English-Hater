const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const store = new Map();
const richLesson = {
  id: 'lesson-ssc-article', track: 'ssc', topic: 'article',
  title: 'Articles: A, An and The', summary: 'A structured sample for renderer testing.',
  rule: 'A, an and the.', level: 'foundation', estimated_minutes: 20,
  prerequisites: ['Nouns'], learning_outcomes: ['Choose articles correctly.'],
  sections: [
    {
      id: 'rule-a-an', type: 'rule', title: 'A and An',
      body: 'Choose by sound.\n\nDo not choose by spelling.',
      formula: 'A / An + singular countable noun',
      examples: [{ text: 'A university', explanation: 'Begins with /j/.', translation: 'একটি বিশ্ববিদ্যালয়' }],
      note: { type: 'tip', title: 'Remember', text: 'Sound matters.' }
    },
    { id: 'compare', type: 'comparison', title: 'Comparison', table: { headers: ['Form', 'Reason'], rows: [['A university', 'Consonant sound'], ['An hour', 'Vowel sound']] } },
    { id: 'mistakes', type: 'common_mistake', title: 'Common mistakes', mistakes: [{ incorrect: 'An university', correct: 'A university', explanation: 'The initial sound is consonant.' }] }
  ],
  review_status: 'approved', published: true
};
store.set('eh_custom_lessons', JSON.stringify([richLesson]));
const appElement = { innerHTML: '', setAttribute() {} };
const document = {
  querySelector: selector => selector === '#app' ? appElement : null,
  querySelectorAll: () => [], addEventListener() {}, body: { dataset: {} }, title: ''
};
const window = { EHBackend: { enabled: false }, addEventListener() {}, scrollTo() {} };
const navigator = { onLine: true };
const localStorage = {
  getItem: key => store.get(key) || null,
  setItem: (key, value) => store.set(key, value),
  removeItem: key => store.delete(key)
};
const context = {
  window, document, navigator, localStorage, console, Date, Math, URL, URLSearchParams,
  crypto: globalThis.crypto, location: { search: '', pathname: '/' },
  setTimeout, clearTimeout, setInterval, clearInterval, confirm: () => true, alert: () => {},
  history: { replaceState() {} }, FormData: function () {}
};
vm.createContext(context);
for (const file of ['data/curriculum.js', 'data/questions.js', 'data/lessons.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
vm.runInContext('globalThis.__ehTest = { state, render };', context);
context.__ehTest.state.track = 'ssc';
context.__ehTest.state.topic = 'article';
context.__ehTest.state.view = 'rule';
context.__ehTest.render();
const html = appElement.innerHTML;
for (const expected of [
  'Articles: A, An and The', 'A / An + singular countable noun', 'A university',
  'Comparison', 'Incorrect', 'Correct', 'What you will learn'
]) assert.ok(html.includes(expected), `Rendered lesson is missing: ${expected}`);
console.log('Student structured lesson rendering test passed.');
