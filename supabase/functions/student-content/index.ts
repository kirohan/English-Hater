import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const x = Number(n)
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.trunc(x))) : fallback
}
const clean = (v: unknown, max = 80) => String(v ?? '').trim().slice(0, max)
const shuffle = <T>(items: T[]) => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function publicQuestion(q: any) {
  return {
    id: q.id,
    track: q.track,
    topic: q.topic,
    difficulty: q.difficulty || 'easy',
    question: q.question,
    choices: Array.isArray(q.choices) ? q.choices : [],
    source_type: q.source_type || '',
    source_name: q.source_name || '',
    source_year: q.source_year || null,
    tags: Array.isArray(q.tags) ? q.tags : [],
    cloudSecure: true,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sign in required.' }, 401)
    const token = authHeader.slice(7)

    const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}')
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
    const url = Deno.env.get('SUPABASE_URL') || ''
    const publishable = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY') || ''
    const secret = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!url || !publishable || !secret) return json({ error: 'Backend configuration error.' }, 500)

    const authClient = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userError } = await authClient.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Invalid or expired session.' }, 401)
    const user = userData.user

    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    const body = await req.json().catch(() => ({})) as any
    const action = clean(body.action, 30)

    if (action === 'session' || action === 'browse') {
      const mode = action === 'browse' ? 'question_bank' : (clean(body.mode, 20) === 'exam' ? 'exam' : 'practice')
      const hardMax = mode === 'question_bank' ? 30 : 50
      const count = clamp(body.count === 'all' ? hardMax : body.count, 1, hardMax, mode === 'question_bank' ? 20 : 5)
      const track = clean(body.track, 24)
      const topic = clean(body.topic || 'all', 64)
      const difficulty = clean(body.difficulty || 'all', 20)
      const search = clean(body.search || '', 120)

      let query = admin.from('questions')
        .select('id,track,topic,difficulty,question,choices,source_type,source_name,source_year,tags')
        .eq('published', true)
      if (track) query = query.eq('track', track)
      if (topic && topic !== 'all') query = query.eq('topic', topic)
      if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty)
      if (search) query = query.or(`question.ilike.%${search.replace(/[,%()]/g, '')}%,source_name.ilike.%${search.replace(/[,%()]/g, '')}%`)
      const { data, error } = await query.limit(Math.min(250, Math.max(80, count * 5)))
      if (error) throw error
      const picked = shuffle(data || []).slice(0, count)

      const { data: quota, error: quotaError } = await admin.rpc('consume_student_quota', {
        p_user_id: user.id,
        p_kind: 'questions',
        p_units: picked.length,
        p_limit: 500,
      })
      if (quotaError) throw quotaError
      if (!quota?.allowed) return json({ error: 'Daily question limit reached for this beta account.' }, 429)

      const expires = new Date(Date.now() + (mode === 'exam' ? 3 : 2) * 60 * 60 * 1000).toISOString()
      const { data: sessionRow, error: sessionError } = await admin.from('question_sessions_secure')
        .insert({ user_id: user.id, mode, question_ids: picked.map((q: any) => String(q.id)), expires_at: expires })
        .select('id,expires_at').single()
      if (sessionError) throw sessionError
      return json({ session_id: sessionRow.id, expires_at: sessionRow.expires_at, questions: picked.map(publicQuestion) })
    }

    if (action === 'answer' || action === 'reveal') {
      const sessionId = clean(body.session_id, 80)
      const questionId = clean(body.question_id, 160)
      const selected = body.selected === null || body.selected === undefined ? null : clamp(body.selected, 0, 3, 0)
      const { data: sess, error: sessError } = await admin.from('question_sessions_secure')
        .select('id,user_id,mode,question_ids,expires_at').eq('id', sessionId).eq('user_id', user.id).maybeSingle()
      if (sessError) throw sessError
      if (!sess || new Date(sess.expires_at).getTime() < Date.now()) return json({ error: 'Question session expired. Start a new set.' }, 410)
      if (!Array.isArray(sess.question_ids) || !sess.question_ids.includes(questionId)) return json({ error: 'Question is not part of this session.' }, 403)

      const { data: q, error: qError } = await admin.from('questions')
        .select('id,answer,explanation,choices').eq('id', questionId).eq('published', true).maybeSingle()
      if (qError) throw qError
      if (!q) return json({ error: 'Question not found.' }, 404)

      const { data: quota, error: quotaError } = await admin.rpc('consume_student_quota', {
        p_user_id: user.id,
        p_kind: 'answers',
        p_units: 1,
        p_limit: 500,
      })
      if (quotaError) throw quotaError
      if (!quota?.allowed) return json({ error: 'Daily answer-check limit reached for this beta account.' }, 429)

      return json({
        question_id: q.id,
        correct: action === 'reveal' || selected === null ? null : selected === Number(q.answer),
        answer: Number(q.answer),
        explanation: q.explanation || '',
      })
    }

    if (action === 'submit_exam') {
      const sessionId = clean(body.session_id, 80)
      const answers = Array.isArray(body.answers) ? body.answers.slice(0, 50) : []
      const { data: sess, error: sessError } = await admin.from('question_sessions_secure')
        .select('id,user_id,mode,question_ids,expires_at').eq('id', sessionId).eq('user_id', user.id).maybeSingle()
      if (sessError) throw sessError
      if (!sess || sess.mode !== 'exam' || new Date(sess.expires_at).getTime() < Date.now()) return json({ error: 'Exam session expired.' }, 410)
      const ids = Array.isArray(sess.question_ids) ? sess.question_ids : []
      const { data: qs, error: qError } = await admin.from('questions').select('id,answer,explanation').in('id', ids)
      if (qError) throw qError
      const byId = new Map((qs || []).map((q: any) => [String(q.id), q]))
      const results = ids.map((id: string, i: number) => {
        const q: any = byId.get(String(id))
        const selected = answers[i] === null || answers[i] === undefined ? null : clamp(answers[i], 0, 3, 0)
        return {
          question_id: id,
          selected,
          correct: q ? selected === Number(q.answer) : false,
          answer: q ? Number(q.answer) : null,
          explanation: q?.explanation || '',
        }
      })
      const { data: quota, error: quotaError } = await admin.rpc('consume_student_quota', {
        p_user_id: user.id,
        p_kind: 'answers',
        p_units: Math.max(1, results.length),
        p_limit: 500,
      })
      if (quotaError) throw quotaError
      if (!quota?.allowed) return json({ error: 'Daily answer-check limit reached for this beta account.' }, 429)
      return json({ results, correct: results.filter((r: any) => r.correct).length, total: results.length })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Unexpected server error.' }, 500)
  }
})
