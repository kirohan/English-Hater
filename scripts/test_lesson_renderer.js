const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const packageData = JSON.parse(fs.readFileSync('content/articles/lesson-ssc-article.json', 'utf8'));
const richLesson = packageData.lessons[0];
const store = new Map([['eh_custom_lessons', JSON.stringify([{ ...richLesson, review_status: 'approved', published: true }])]]);
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
context.__ehTest.state.cloudLessons = [{ ...richLesson, title: 'Old cloud sample title', sections: [] }];
context.__ehTest.state.track = 'ssc';
context.__ehTest.state.topic = 'article';
context.__ehTest.state.view = 'rule';
context.__ehTest.render();
const html = appElement.innerHTML;
for (const expected of [
  'Articles: A, An and The', 'A and An: choose by sound, not spelling',
  'The Padma', 'The honesty of the witness', 'Omission of articles',
  'Repetition of articles', 'A few', 'Common mistakes and corrections',
  'Practice and assessment', 'Practice this topic'
]) assert.ok(html.includes(expected), `Rendered Article lesson is missing: ${expected}`);
const renderedSections = (html.match(/class="lesson-section /g) || []).length;
assert.equal(renderedSections, 16, 'all 16 structured lesson sections should render');
assert.ok(html.includes('বাংলায়:'), 'Bangla explanation should render');
console.log('Real Article lesson structured rendering test passed (16 sections).');
