export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) return res.status(500).json({error: 'API key not configured'});

  const { prompt, maxTokens, temp, json } = req.body;
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

  const systemPrompt = json
    ? 'Voce e um especialista em RH e ATS. Responda APENAS com JSON valido, sem markdown.'
    : 'Voce e um especialista em curriculos ATS. REGRAS DE FORMATACAO OBRIGATORIAS:\n1. Cada secao em sua propria linha\n2. Linha em branco entre secoes\n3. Cada bullet point em sua propria linha iniciando com •\n4. NUNCA coloque dois topicos na mesma linha\n5. Formato exato:\n\nNOME\nCargo | Especialidade\nEmail | Telefone | Cidade\n\nOBJETIVO PROFISSIONAL\ntexto\n\nRESUMO PROFISSIONAL\ntexto\n\nEXPERIENCIA PROFISSIONAL\n\nCargo | Empresa\nData inicio - Data fim\n• bullet 1\n• bullet 2\nResultados:\n• resultado\n\nFORMACAO ACADEMICA\n\nCurso\nInstituicao | Periodo\n\nCOMPETENCIAS TECNICAS\nhabilidade1 | habilidade2 | habilidade3\n\nIDIOMAS\nIdioma - Nivel';

  for (const model of models) {
    try {
      const body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: temp || 0.1,
        max_tokens: maxTokens || 1500
      };
      if (json) body.response_format = { type: 'json_object' };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429 || response.status === 413) continue;
        return res.status(response.status).json({ error: data.error?.message || 'API error' });
      }

      const text = data.choices?.[0]?.message?.content;
      if (!text) continue;
      return res.status(200).json({ text });
    } catch(e) { continue; }
  }

  return res.status(429).json({ error: 'Limite atingido. Aguarde 1 minuto.' });
}
