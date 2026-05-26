import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { portfolioId } = body

    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .eq('user_id', user.id)
      .single()

    if (portfolioError || !portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 403 })
    }

    const [{ data: scenarios }, { data: mechanisms }] = await Promise.all([
      supabase.from('scenarios').select('*'),
      supabase.from('transmission_mechanisms').select('*')
    ])

    const userMessage = `
Portfolio:
- Name: ${portfolio.name}
- Sector: ${portfolio.sector}
- Geographies: ${portfolio.geography || 'Not specified'}
- Key Assets: ${portfolio.assets || 'Not specified'}
- Dependencies: ${portfolio.dependencies || 'Not specified'}

Scenarios in library:
${(scenarios || []).map((s: Record<string, string>) => `- ${s.name}: ${s.summary} (Urgency: ${s.urgency})`).join('\n')}

Transmission mechanisms:
${(mechanisms || []).map((m: Record<string, string>) => `- ${m.name}: ${m.description}`).join('\n')}

Return ONLY a JSON object with these exact keys. No markdown, no code fences, no explanation:
{
  "relevant_scenarios": ["string"],
  "transmission_channels": ["string"],
  "evidence": ["string"],
  "confidence_levels": {"risk name": "High|Medium|Low"},
  "diligence_questions": ["string"],
  "monitoring_triggers": ["string"],
  "recommended_actions": ["string"]
}`

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 45000
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'You are a senior geopolitical risk analyst. Return only raw valid JSON. No markdown formatting, no code fences, no explanation.',
      messages: [{ role: 'user', content: userMessage }]
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Parse failed. Raw:', rawText)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    await supabase.from('exposure_briefs').insert({
      user_id: user.id,
      portfolio_id: portfolioId,
      brief_content: parsed
    })

    return NextResponse.json({ brief: parsed })

  } catch (error) {
    console.error('Brief generation error:', error)
    return NextResponse.json({ error: 'Brief generation failed' }, { status: 500 })
  }
}
