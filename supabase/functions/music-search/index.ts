import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface iTunesTrack {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100?: string
  kind: string
}

function upscaleArtworkUrl(url: string | undefined): string | null {
  if (!url) return null
  return url.replace(/100x100bb\.jpg$/, '300x300bb.jpg')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase env not configured' }), {
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

    const searchParams = new URLSearchParams({
      term: query,
      entity: 'song',
      limit: '8',
      country: 'us',
    })

    const searchResponse = await fetch(
      `https://itunes.apple.com/search?${searchParams.toString()}`,
    )

    if (!searchResponse.ok) {
      const body = await searchResponse.text()
      throw new Error(`Music search failed: ${searchResponse.status} ${body}`)
    }

    const searchData = await searchResponse.json()
    const items = (searchData.results ?? []) as iTunesTrack[]

    const results = items
      .filter((track) => track.kind === 'song' && track.trackId && track.trackName)
      .map((track) => ({
        track_id: String(track.trackId),
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        album_art_url: upscaleArtworkUrl(track.artworkUrl100),
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
