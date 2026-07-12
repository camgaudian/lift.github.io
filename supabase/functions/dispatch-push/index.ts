import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-push-secret',
}

type PushType =
  | 'friend_request'
  | 'exercise_share'
  | 'template_share'
  | 'workout_reminder'

const PREF_COLUMN: Record<PushType, string> = {
  friend_request: 'push_friend_request',
  exercise_share: 'push_exercise_share',
  template_share: 'push_template_share',
  workout_reminder: 'push_workout_reminder',
}

interface DispatchBody {
  user_id: string
  type: PushType
  title: string
  body: string
  url: string
}

function isPushType(value: string): value is PushType {
  return value in PREF_COLUMN
}

function resolveUrl(pathOrUrl: string, appOrigin: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const origin = appOrigin.replace(/\/$/, '')
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${origin}${path}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const expectedSecret = Deno.env.get('PUSH_DISPATCH_SECRET')
    const providedSecret = req.headers.get('x-push-secret')
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@lift.gaudian.dev'
    const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://lift.gaudian.dev'

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'Push env not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const payload = (await req.json()) as DispatchBody
    if (!payload?.user_id || !payload?.type || !isPushType(payload.type)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const prefColumn = PREF_COLUMN[payload.type]
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'push_friend_request, push_exercise_share, push_template_share, push_workout_reminder',
      )
      .eq('id', payload.user_id)
      .maybeSingle()

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prefs = profile as Record<string, boolean> | null
    if (!prefs || prefs[prefColumn] !== true) {
      return new Response(JSON.stringify({ ok: true, skipped: 'pref_off' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', payload.user_id)

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no_subscriptions' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Lift',
      body: payload.body || '',
      url: resolveUrl(payload.url || '/', appOrigin),
      type: payload.type,
    })

    let sent = 0
    const staleIds: string[] = []

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notificationPayload,
          )
          sent += 1
        } catch (err) {
          const statusCode =
            err && typeof err === 'object' && 'statusCode' in err
              ? Number((err as { statusCode: number }).statusCode)
              : 0
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(sub.id)
          } else {
            console.error('web-push send failed', statusCode, err)
          }
        }
      }),
    )

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds)
    }

    return new Response(JSON.stringify({ ok: true, sent, pruned: staleIds.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
