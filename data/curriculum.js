window.EH_CURRICULUM = {
  version: '2.0-2026-09',
  legacy_track_map: { admission: 'university' },
  tracks: {
    junior: {
      name: 'Class 6–8', icon: '🌱', desc: 'Build the English foundation',
      basis: 'Core school English skills and NCTB-aligned competency areas; exact yearly textbook mapping is maintained as content metadata.',
      modules: [
        {slug:'grammar-foundation',title:'Grammar Foundation',topics:[
          {slug:'parts-of-speech',title:'Parts of Speech',subtopics:['noun','pronoun','adjective','verb','adverb','preposition','conjunction','interjection']},
          {slug:'sentence-basics',title:'Sentence Basics',subtopics:['subject-and-predicate','sentence-types','word-order']},
          {slug:'tense',title:'Tense',subtopics:['present','past','future','simple-and-continuous','perfect-basics']},
          {slug:'subject-verb-agreement',title:'Subject–Verb Agreement',subtopics:['singular-plural-subjects','third-person-singular','there-is-are']},
          {slug:'article',title:'Articles',subtopics:['a-an','the','zero-article']},
          {slug:'preposition',title:'Prepositions',subtopics:['time','place','movement','common-combinations']},
          {slug:'pronoun',title:'Pronouns',subtopics:['personal','possessive','demonstrative','relative']},
          {slug:'verb',title:'Verb Forms',subtopics:['base-past-participle','be-have-do','infinitive-and-gerund-basics']}
        ]},
        {slug:'vocabulary',title:'Vocabulary & Word Building',topics:[
          {slug:'synonym-antonym',title:'Synonyms & Antonyms',subtopics:['common-synonyms','common-antonyms','context-meaning']},
          {slug:'word-formation',title:'Word Formation',subtopics:['prefix','suffix','root-word','parts-of-speech-change']},
          {slug:'spelling',title:'Spelling',subtopics:['common-spelling','plural-spelling','verb-endings']},
          {slug:'everyday-vocabulary',title:'Everyday Vocabulary',subtopics:['school','home','health','environment','technology']}
        ]},
        {slug:'reading',title:'Reading Skills',topics:[
          {slug:'reading-comprehension',title:'Reading Comprehension',subtopics:['main-idea','detail','sequence','inference','word-in-context']},
          {slug:'information-transfer',title:'Information Transfer',subtopics:['table-to-text','text-to-table','chart-reading']}
        ]},
        {slug:'writing',title:'Writing & Communication',topics:[
          {slug:'paragraph',title:'Paragraph Writing',subtopics:['topic-sentence','supporting-details','coherence']},
          {slug:'email-letter',title:'Email & Letter',subtopics:['informal-email','formal-basics','invitation-and-request']},
          {slug:'dialogue',title:'Dialogue',subtopics:['everyday-situations','asking-and-answering','polite-language']},
          {slug:'story-writing',title:'Story Writing',subtopics:['sequence','opening-middle-ending','guided-story']}
        ]}
      ]
    },
    ssc: {
      name: 'SSC', icon: '🎯', desc: 'Board-focused English preparation',
      basis: 'Core SSC English grammar, reading and writing skills; board/year-specific formats are stored as exam overlays instead of hard-coded forever.',
      modules: [
        {slug:'grammar',title:'Grammar & Usage',topics:[
          {slug:'article',title:'Articles',subtopics:['a-an-by-sound','the','zero-article','special-uses']},
          {slug:'preposition',title:'Prepositions',subtopics:['appropriate-preposition','fixed-combinations','time-place-movement']},
          {slug:'verb',title:'Right Form of Verbs',subtopics:['tense-clues','conditionals','after-modals','gerund-infinitive','causative']},
          {slug:'subject-verb-agreement',title:'Subject–Verb Agreement',subtopics:['number','indefinite-pronouns','either-neither','collective-nouns']},
          {slug:'modifier',title:'Modifiers',subtopics:['adjective','adverb','phrase','clause','placement']},
          {slug:'connectors',title:'Sentence Connectors',subtopics:['addition','contrast','cause-effect','sequence','condition']},
          {slug:'narration',title:'Narration',subtopics:['statement','question','command-request','exclamation']},
          {slug:'voice',title:'Voice',subtopics:['active-passive','tense-based-voice','imperative','modal']},
          {slug:'transformation',title:'Sentence Transformation',subtopics:['affirmative-negative','simple-complex-compound','degree','exclamatory-assertive']},
          {slug:'punctuation',title:'Punctuation & Capitalization',subtopics:['capital-letter','comma','apostrophe','quotation','end-marks']}
        ]},
        {slug:'vocabulary',title:'Vocabulary & Cloze',topics:[
          {slug:'cloze',title:'Cloze / Gap Filling',subtopics:['with-clues','without-clues','grammar-context','vocabulary-context']},
          {slug:'synonym-antonym',title:'Synonyms & Antonyms',subtopics:['contextual-synonym','contextual-antonym']},
          {slug:'word-formation',title:'Word Formation',subtopics:['prefix','suffix','derivation']}
        ]},
        {slug:'reading',title:'Reading',topics:[
          {slug:'reading-comprehension',title:'Reading Comprehension',subtopics:['mcq','short-answer','inference','vocabulary-in-context']},
          {slug:'information-transfer',title:'Information Transfer',subtopics:['table','flow-chart','summary']},
          {slug:'rearrangement',title:'Rearranging Sentences',subtopics:['sequence','cohesion','story-order']}
        ]},
        {slug:'writing',title:'Writing',topics:[
          {slug:'paragraph',title:'Paragraph',subtopics:['descriptive','cause-effect','comparison','problem-solution']},
          {slug:'email-letter',title:'Email / Letter',subtopics:['formal','informal','application']},
          {slug:'graph-chart',title:'Graph & Chart',subtopics:['trend-language','comparison','overview']},
          {slug:'story-writing',title:'Completing Story',subtopics:['guided-story','moral','coherence']},
          {slug:'dialogue',title:'Dialogue',subtopics:['academic','social','problem-solving']}
        ]}
      ]
    },
    hsc: {
      name: 'HSC', icon: '📘', desc: 'Advanced board English',
      basis: 'Advanced HSC grammar, reading and writing taxonomy with yearly board-format overlays.',
      modules: [
        {slug:'grammar',title:'Advanced Grammar',topics:[
          {slug:'article',title:'Articles',subtopics:['advanced-article','proper-nouns','institution-place','zero-article']},
          {slug:'preposition',title:'Appropriate Prepositions',subtopics:['verb-preposition','adjective-preposition','noun-preposition','idiomatic-use']},
          {slug:'verb',title:'Right Form of Verbs',subtopics:['conditionals','sequence-of-tense','subjunctive','causative','gerund-infinitive']},
          {slug:'phrase-clause',title:'Phrases & Clauses',subtopics:['noun-clause','adjective-clause','adverb-clause','phrase-identification']},
          {slug:'completing-sentences',title:'Completing Sentences',subtopics:['condition','wish','had-better','would-rather','as-if','too-to-enough']},
          {slug:'modifier',title:'Modifiers',subtopics:['pre-modifier','post-modifier','participial-phrase','relative-clause','misplaced-modifier']},
          {slug:'narration',title:'Narration',subtopics:['mixed-speech','reporting-verbs','questions','commands','exclamations']},
          {slug:'connectors',title:'Sentence Connectors',subtopics:['logical-relation','cohesion','paragraph-flow']},
          {slug:'transformation',title:'Sentence Transformation',subtopics:['simple-complex-compound','degree','affirmative-negative','special-structures']},
          {slug:'punctuation',title:'Punctuation',subtopics:['dialogue','quotation','comma-rules','capitalization']}
        ]},
        {slug:'vocabulary',title:'Vocabulary',topics:[
          {slug:'synonym-antonym',title:'Synonyms & Antonyms',subtopics:['contextual-meaning','register','near-synonyms']},
          {slug:'word-formation',title:'Word Formation',subtopics:['derivation','prefix-suffix','word-class']},
          {slug:'idiom-phrase',title:'Idioms & Phrases',subtopics:['meaning','usage','context']}
        ]},
        {slug:'reading',title:'Reading',topics:[
          {slug:'reading-comprehension',title:'Reading Comprehension',subtopics:['main-idea','inference','reference','tone','vocabulary-in-context']},
          {slug:'summary',title:'Summary',subtopics:['main-points','compression','paraphrase']},
          {slug:'information-transfer',title:'Information Transfer',subtopics:['flow-chart','table','process']}
        ]},
        {slug:'writing',title:'Writing',topics:[
          {slug:'paragraph',title:'Paragraph',subtopics:['argumentative','cause-effect','comparison','problem-solution']},
          {slug:'graph-chart',title:'Graph & Chart',subtopics:['overview','comparison','trend','data-language']},
          {slug:'email-letter',title:'Email / Letter / Application',subtopics:['formal-email','application','official-letter']},
          {slug:'report',title:'Report Writing',subtopics:['event-report','newspaper-report','academic-report-basics']},
          {slug:'composition',title:'Composition / Essay',subtopics:['outline','thesis','coherence','argument']}
        ]}
      ]
    },
    engineering: {
      name: 'Engineering Admission', icon: '⚙️', desc: 'Institution-specific engineering English',
      basis: 'HSC-level English plus institution/year overlays. English weight and format vary by engineering institution, so exam metadata must always include institution and year.',
      modules: [
        {slug:'grammar',title:'Functional Grammar',topics:[
          {slug:'article',title:'Articles',subtopics:['sound-rule','zero-article','proper-nouns','fixed-use']},
          {slug:'preposition',title:'Prepositions',subtopics:['appropriate-preposition','phrasal-use','fixed-expression']},
          {slug:'verb',title:'Verb & Tense',subtopics:['right-form','conditionals','sequence','gerund-infinitive']},
          {slug:'subject-verb-agreement',title:'Subject–Verb Agreement',subtopics:['complex-subject','either-neither','collective']},
          {slug:'sentence-correction',title:'Sentence Correction',subtopics:['grammar-error','usage-error','parallelism','word-choice']},
          {slug:'transformation',title:'Transformation',subtopics:['voice','narration','degree','simple-complex-compound']}
        ]},
        {slug:'vocabulary',title:'Vocabulary & Usage',topics:[
          {slug:'synonym-antonym',title:'Synonyms & Antonyms',subtopics:['high-frequency','contextual','academic']},
          {slug:'idiom-phrase',title:'Idioms & Phrases',subtopics:['meaning','appropriate-use']},
          {slug:'word-formation',title:'Word Formation',subtopics:['prefix-suffix','derivation']},
          {slug:'spelling',title:'Spelling & Word Choice',subtopics:['confusing-words','spelling','appropriate-word']}
        ]},
        {slug:'reading',title:'Comprehension',topics:[
          {slug:'reading-comprehension',title:'Reading Comprehension',subtopics:['detail','inference','main-idea','technical-context','vocabulary-in-context']},
          {slug:'cloze',title:'Cloze / Functional English',subtopics:['grammar-context','vocabulary-context','cohesion']}
        ]},
        {slug:'exam-overlays',title:'Exam Overlays',topics:[
          {slug:'mist',title:'MIST',subtopics:['hsc-functional-english','comprehension','yearly-past-questions']},
          {slug:'engineering-other',title:'Other Engineering Institutions',subtopics:['institution-year-specific','past-question-bank','model-set']}
        ]}
      ]
    },
    university: {
      name: 'University Admission', icon: '🚀', desc: 'Varsity admission English',
      basis: 'High-frequency university admission English skills with university/unit/year overlays.',
      modules: [
        {slug:'grammar',title:'Grammar & Usage',topics:[
          {slug:'article',title:'Articles',subtopics:['advanced-use','proper-nouns','zero-article']},
          {slug:'preposition',title:'Prepositions',subtopics:['appropriate-preposition','idiomatic-use']},
          {slug:'verb',title:'Verb & Tense',subtopics:['right-form','conditionals','gerund-infinitive','sequence']},
          {slug:'subject-verb-agreement',title:'Subject–Verb Agreement',subtopics:['advanced-agreement','quantity','collective']},
          {slug:'sentence-correction',title:'Error Detection & Correction',subtopics:['grammar','diction','parallelism','modifier','agreement']},
          {slug:'transformation',title:'Sentence Transformation',subtopics:['voice','narration','degree','clause-transformation']}
        ]},
        {slug:'vocabulary',title:'Vocabulary',topics:[
          {slug:'synonym-antonym',title:'Synonyms & Antonyms',subtopics:['academic','contextual','near-synonym']},
          {slug:'idiom-phrase',title:'Idioms & Phrases',subtopics:['meaning','sentence-use']},
          {slug:'one-word-substitution',title:'One-word Substitution',subtopics:['person','place','quality','action']},
          {slug:'analogy',title:'Analogy & Word Relation',subtopics:['synonymy','antonymy','part-whole','function']},
          {slug:'spelling',title:'Spelling & Confusing Words',subtopics:['spelling','homophone','commonly-confused']}
        ]},
        {slug:'sentence',title:'Sentence Skills',topics:[
          {slug:'sentence-completion',title:'Sentence Completion',subtopics:['grammar-clue','meaning-clue','collocation']},
          {slug:'rearrangement',title:'Sentence Rearrangement',subtopics:['cohesion','logical-order']},
          {slug:'cloze',title:'Cloze Test',subtopics:['grammar','vocabulary','cohesion']}
        ]},
        {slug:'reading',title:'Reading Comprehension',topics:[
          {slug:'reading-comprehension',title:'Reading Comprehension',subtopics:['main-idea','detail','inference','tone','reference','vocabulary-in-context']}
        ]},
        {slug:'exam-overlays',title:'University / Unit Overlays',topics:[
          {slug:'du',title:'University of Dhaka',subtopics:['unit-year-specific','past-question-bank','model-set']},
          {slug:'ju',title:'Jahangirnagar University',subtopics:['unit-year-specific','past-question-bank','model-set']},
          {slug:'ru',title:'University of Rajshahi',subtopics:['unit-year-specific','past-question-bank','model-set']},
          {slug:'cu',title:'University of Chittagong',subtopics:['unit-year-specific','past-question-bank','model-set']},
          {slug:'guccho',title:'GST / Cluster',subtopics:['unit-year-specific','past-question-bank','model-set']},
          {slug:'university-other',title:'Other Universities',subtopics:['institution-year-specific','past-question-bank','model-set']}
        ]}
      ]
    }
  }
};
