import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SpotifyTokenCache {
  token: string
  expiresAt: number
}

let tokenCache: SpotifyTokenCache | null = null

async function getSpotifyAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now()
  if (tokenCache && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.token
  }

  const credentials = btoa(`${clientId}:${clientSecret}`)
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Spotify token request failed: ${response.status} ${body}`)
  }

  const data = await response.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }
  return tokenCache.token
}

interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    name: string
    images: { url: string; width: number; height: number }[]
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const spotifyClientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const spotifyClientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase env not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!spotifyClientId || !spotifyClientSecret) {
      return new Response(JSON.stringify({ error: 'Spotify credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { q } = await req.json()
    const query = typeof q === 'string' ? q.trim() : ''
    if (query.length < 2) {
      return new Response(JSON.stringify({ tracks: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getSpotifyAccessToken(spotifyClientId, spotifyClientSecret)
    const searchParams = new URLSearchParams({
      q: query,
      type: 'track',
      limit: '8',
    })

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?${searchParams.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )

    if (!searchResponse.ok) {
      const body = await searchResponse.text()
      throw new Error(`Spotify search failed: ${searchResponse.status} ${body}`)
    }

    const searchData = await searchResponse.json()
    const tracks = (searchData.tracks?.items ?? []) as SpotifyTrack[]

    const results = tracks.map((track) => ({
      track_id: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      album_art_url: track.album.images[0]?.url ?? null,
    }))

    return new Response(JSON.stringify({ tracks: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
