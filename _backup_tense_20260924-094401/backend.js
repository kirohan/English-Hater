(() => {
  const cfg = window.EH_BACKEND_CONFIG || {};
  const enabled = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
  const client = enabled ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  const deviceKey = (() => {
    let key = localStorage.getItem('eh_device_key');
    if (!key) {
      key = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem('eh_device_key', key);
    }
    return key;
  })();

  const deviceName = () => {
    const ua = navigator.userAgent || 'Browser';
    const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
    let browser = 'Browser';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';
    const platform = navigator.userAgentData?.platform || navigator.platform || (mobile ? 'Mobile' : 'Device');
    return `${browser} on ${platform}`.slice(0, 80);
  };

  function needCloud() {
    if (!enabled) throw new Error('Cloud backend is not configured yet.');
  }

  async function session() {
    if (!enabled) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function user() {
    const s = await session();
    return s?.user || null;
  }

  async function signUp(email, password, name) {
    needCloud();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { name: String(name || '').trim() } }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    needCloud();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      const result = await registerDevice();
      if (!result.allowed) {
        await client.auth.signOut();
        throw new Error(`Device limit reached. English Haters currently allows ${cfg.maxDevices || 2} devices per account. Remove an old device first.`);
      }
    }
    return data;
  }

  async function signOut() {
    if (!enabled) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function sendPasswordReset(email) {
    needCloud();
    const base = String(cfg.siteUrl || location.origin).replace(/\/$/, '');
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/?recovery=1`
    });
    if (error) throw error;
  }

  async function updatePassword(password) {
    needCloud();
    const { data, error } = await client.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }

  function onAuthChange(callback) {
    if (!enabled) return { unsubscribe(){} };
    const { data } = client.auth.onAuthStateChange((event, s) => callback(s, event));
    return data.subscription;
  }

  async function registerDevice() {
    needCloud();
    const { data, error } = await client.rpc('register_device', {
      p_device_key: deviceKey,
      p_device_name: deviceName(),
      p_max_devices: Number(cfg.maxDevices || 2)
    });
    if (error) throw error;
    return data || { allowed: false };
  }

  async function listDevices() {
    needCloud();
    const u = await user();
    if (!u) return [];
    const { data, error } = await client.from('user_devices')
      .select('id,device_key,device_name,last_seen_at,created_at')
      .eq('user_id', u.id)
      .order('last_seen_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => ({ ...d, current: d.device_key === deviceKey }));
  }

  async function removeDevice(id) {
    needCloud();
    const { error } = await client.from('user_devices').delete().eq('id', id);
    if (error) throw error;
  }

  async function getProfile() {
    needCloud();
    const u = await user();
    if (!u) return null;
    const { data, error } = await client.from('profiles')
      .select('id,name,current_track,xp,avatar_path,role,created_at')
      .eq('id', u.id).single();
    if (error) throw error;
    let avatar_url = '';
    if (data.avatar_path) {
      const { data: signed, error: signedError } = await client.storage.from('avatars').createSignedUrl(data.avatar_path, 3600);
      if (!signedError) avatar_url = signed?.signedUrl || '';
    }
    return { ...data, email: u.email || '', avatar_url };
  }

  async function saveProfile(patch) {
    needCloud();
    const u = await user();
    if (!u) throw new Error('Sign in first.');
    const allowed = {};
    if (patch.name !== undefined) allowed.name = String(patch.name || '').trim().slice(0, 80);
    if (patch.current_track !== undefined) allowed.current_track = patch.current_track;
    if (patch.xp !== undefined) allowed.xp = Number(patch.xp || 0);
    allowed.updated_at = new Date().toISOString();
    const { error } = await client.from('profiles').update(allowed).eq('id', u.id);
    if (error) throw error;
    return getProfile();
  }

  async function uploadAvatar(blob) {
    needCloud();
    const u = await user();
    if (!u) throw new Error('Sign in first.');
    const path = `${u.id}/avatar.jpg`;
    const { error: upError } = await client.storage.from('avatars').upload(path, blob, {
      contentType: 'image/jpeg', cacheControl: '3600', upsert: true
    });
    if (upError) throw upError;
    const { error } = await client.from('profiles').update({ avatar_path: path, updated_at: new Date().toISOString() }).eq('id', u.id);
    if (error) throw error;
    return getProfile();
  }

  async function removeAvatar() {
    needCloud();
    const p = await getProfile();
    if (!p) return;
    if (p.avatar_path) await client.storage.from('avatars').remove([p.avatar_path]);
    const { error } = await client.from('profiles').update({ avatar_path: null, updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) throw error;
  }

  async function pullProgress() {
    needCloud();
    const u = await user();
    if (!u) return null;
    const { data, error } = await client.from('user_progress')
      .select('xp,history_json,mistakes_json,practice_days_json,exam_history_json,achievements_json,updated_at')
      .eq('user_id', u.id).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function pushProgress(progress) {
    needCloud();
    const u = await user();
    if (!u) return;
    const row = {
      user_id: u.id,
      xp: Number(progress.xp || 0),
      history_json: progress.history || [],
      mistakes_json: progress.mistakes || {},
      practice_days_json: progress.practiceDays || [],
      exam_history_json: progress.examHistory || [],
      achievements_json: progress.achievements || [],
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('user_progress').upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
    await saveProfile({ current_track: progress.track, xp: row.xp });
  }

  function mapCloudQuestion(q) {
    return {
      id: q.id,
      track: q.track,
      topic: q.topic,
      subtopic: q.subtopic || '', curriculum: q.curriculum || '', chapter: q.chapter || '', unit: q.unit || '',
      difficulty: q.difficulty || 'easy',
      question: q.question,
      choices: Array.isArray(q.choices) ? q.choices : [],
      answer: Number(q.answer || 0),
      explanation: q.explanation || '',
      source_type: q.source_type || '',
      source_name: q.source_name || '',
      source_year: q.source_year || null,
      tags: Array.isArray(q.tags) ? q.tags : [],
      review_status: q.review_status || 'approved', import_batch: q.import_batch || '',
      published: q.published !== false,
      cloud: true
    };
  }

  function mapCloudLesson(l) {
    return {
      id: l.id,
      track: l.track,
      topic: l.topic,
      title: l.title,
      rule: l.rule,
      examples: Array.isArray(l.examples) ? l.examples : [],
      sort_order: Number(l.sort_order || 0),
      published: l.published !== false,
      cloud: true
    };
  }

  async function loadContent() {
    if (!enabled) return { questions: [], lessons: [] };
    // Student clients intentionally do NOT read the cloud questions table directly.
    // Lessons contain no answer key and remain safe for direct published reads.
    const lRes = await client.from('lessons').select('*').eq('published', true);
    if (lRes.error) throw lRes.error;
    return { questions: [], lessons: (lRes.data || []).map(mapCloudLesson) };
  }

  async function studentContent(payload) {
    needCloud();
    const s = await session();
    if (!s?.user) throw new Error('Sign in to use the protected question bank.');
    const { data, error } = await client.functions.invoke('student-content', { body: payload });
    if (error) {
      let message = error.message || 'Protected content request failed.';
      try {
        const body = await error.context?.json?.();
        if (body?.error) message = body.error;
      } catch {}
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  async function createQuestionSession(config = {}) {
    const count = config.count === 'all' ? 50 : Math.min(50, Math.max(1, Number(config.count || 5)));
    return studentContent({
      action: 'session', mode: config.mode === 'exam' ? 'exam' : 'practice',
      track: config.track || '', topic: config.topic || 'all', difficulty: config.difficulty || 'all', count
    });
  }

  async function createMistakeSession(keys = [], config = {}) {
    const ids = [...new Set((keys || []).map(k => {
      const text = String(k || '');
      const pos = text.indexOf(':');
      return pos >= 0 ? text.slice(pos + 1) : text;
    }).filter(Boolean))].slice(0, 50);
    if (!ids.length) throw new Error('Your Mistake Book is empty.');
    return studentContent({ action: 'mistakes', question_ids: ids, track: config.track || '', count: Math.min(50, ids.length) });
  }

  async function checkSecureAnswer(sessionId, questionId, selected) {
    return studentContent({ action: 'answer', session_id: sessionId, question_id: String(questionId), selected: Number(selected) });
  }

  async function submitSecureExam(sessionId, answers) {
    return studentContent({ action: 'submit_exam', session_id: sessionId, answers: Array.isArray(answers) ? answers : [] });
  }

  async function browseSecureQuestions(filters = {}) {
    return studentContent({
      action: 'browse', track: filters.track || '', topic: filters.topic || 'all',
      difficulty: filters.difficulty || 'all', search: filters.search || '', count: Math.min(30, Math.max(1, Number(filters.count || 20)))
    });
  }

  async function revealSecureAnswer(sessionId, questionId) {
    return studentContent({ action: 'reveal', session_id: sessionId, question_id: String(questionId) });
  }

  async function isAdmin() {
    if (!enabled) return false;
    const p = await getProfile();
    return p?.role === 'admin';
  }

  async function adminCounts() {
    needCloud();
    if (!(await isAdmin())) throw new Error('Admin access required.');
    const [q, l] = await Promise.all([
      client.from('questions').select('id', { count: 'exact', head: true }),
      client.from('lessons').select('id', { count: 'exact', head: true })
    ]);
    if (q.error) throw q.error;
    if (l.error) throw l.error;
    return { questions: q.count || 0, lessons: l.count || 0 };
  }

  async function publishContent(localQuestions, localLessons) {
    needCloud();
    if (!(await isAdmin())) throw new Error('Admin access required.');
    const qRows = (localQuestions || []).map(q => ({
      id: String(q.id), track: q.track, topic: q.topic, subtopic: q.subtopic || '', curriculum: q.curriculum || '', chapter: q.chapter || '', unit: q.unit || '', difficulty: q.difficulty || 'easy',
      question: q.question, choices: q.choices || [], answer: Number(q.answer || 0),
      explanation: q.explanation || '', source_type: q.source_type || null,
      source_name: q.source_name || null, source_year: q.source_year || null,
      tags: q.tags || [], review_status: q.review_status || 'draft', import_batch: q.import_batch || '', published: (q.review_status || 'draft') === 'approved' && q.published !== false, updated_at: new Date().toISOString()
    }));
    const lRows = (localLessons || []).map(l => ({
      id: String(l.id), track: l.track, topic: l.topic, title: l.title,
      rule: l.rule, examples: l.examples || [], sort_order: Number(l.sort_order || 0),
      published: l.published !== false, updated_at: new Date().toISOString()
    }));
    for (let i = 0; i < qRows.length; i += 200) {
      const { error } = await client.from('questions').upsert(qRows.slice(i, i + 200), { onConflict: 'id' });
      if (error) throw error;
    }
    for (let i = 0; i < lRows.length; i += 200) {
      const { error } = await client.from('lessons').upsert(lRows.slice(i, i + 200), { onConflict: 'id' });
      if (error) throw error;
    }
    return adminCounts();
  }

  async function pullEditableContent() {
    needCloud();
    if (!(await isAdmin())) throw new Error('Admin access required.');
    const [qRes, lRes] = await Promise.all([
      client.from('questions').select('*').order('updated_at', { ascending: false }),
      client.from('lessons').select('*').order('sort_order', { ascending: true })
    ]);
    if (qRes.error) throw qRes.error;
    if (lRes.error) throw lRes.error;
    return {
      questions: (qRes.data || []).map(mapCloudQuestion).map(({cloud,...q}) => q),
      lessons: (lRes.data || []).map(mapCloudLesson).map(({cloud,...l}) => l)
    };
  }

  window.EHBackend = {
    enabled, client, deviceKey, deviceName: deviceName(),
    session, user, signUp, signIn, signOut, sendPasswordReset, updatePassword, onAuthChange,
    registerDevice, listDevices, removeDevice,
    getProfile, saveProfile, uploadAvatar, removeAvatar,
    pullProgress, pushProgress, loadContent,
    createQuestionSession, createMistakeSession, checkSecureAnswer, submitSecureExam, browseSecureQuestions, revealSecureAnswer,
    isAdmin, adminCounts, publishContent, pullEditableContent
  };
})();
