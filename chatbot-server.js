'use strict';

const express = require('express');
const cors    = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app    = express();
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

app.use(cors());
app.use(express.json());

/* ---------------------------------------------------------------
   System prompt — vollständiger Kontext über das Unternehmen
---------------------------------------------------------------- */
const SYSTEM_PROMPT = `Du bist ein freundlicher und kompetenter Kundenberater für Parkett & Bodenbeläge Mario Herrmann, einem Meisterbetrieb in Koblenz.

Unternehmen:
- Name: Parkett & Bodenbeläge Mario Herrmann
- Art: Meisterbetrieb (staatlich anerkannter Meister)
- Adresse: Rüsternallee 27, 56075 Koblenz
- Telefon Festnetz: +49 261 29179864
- Telefon Mobil:    +49 171 4668105
- Telefax: +49 261 29179865
- E-Mail: Fa.MarioHerrmann@t-online.de
- Motto: „Traditionell und dennoch auf dem neuesten Stand — Qualitätsarbeiten aus Meisterhand"
- USt-IdNr.: DE 229 803 886
- Partner: Thomsit, Römhildt GmbH

Leistungen im Detail:
1. Parkett verlegen: Stabparkett, Schiffsboden, Fischgrätmuster, Dielen; Holzarten: Eiche, Buche, Esche, Ahorn, Nussbaum, Kirsche, Bambus u.v.m.; Verlegearten: schwimmend, geklebt oder genagelt; inkl. Schleifen & Versiegeln (Öl, Wachs, Lack)
2. Bodenbeläge: Vinyl (LVT/Click), Laminat, Teppich, CV-/PVC-Beläge, Korkböden
3. Fliesen verlegen: Wand- und Bodenfliesen, Feinsteinzeug, Naturstein, Mosaikfliesen, Großformatplatten
4. Fenster & Türen einbauen: Fensteraustausch, Innentüren, Haustüren
5. Malerarbeiten: Innenanstriche, Tapezieren, Fassadenanstriche
6. Treppensanierung: Renovierung und Neugestaltung von Holz- und Betontreppen

Häufige FAQ-Antworten:
- Parkett verlegen (Arbeitskosten): ca. 15–30 €/m² je nach Holzart, Verlegemuster und Untergrund (Materialkosten zzgl.)
- Kostenloses Angebot: Immer empfehlen, Kontakt aufzunehmen für ein unverbindliches Vor-Ort-Angebot
- Einsatzgebiet: Koblenz und die gesamte Rhein-Mosel-Region
- Öffnungszeiten: Bitte direkt per Telefon oder E-Mail erfragen

Verhaltensregeln:
- Antworte immer auf Deutsch
- Sei freundlich, verbindlich und professionell
- Halte Antworten prägnant (3–5 Sätze genügen meist)
- Nenne bei Preisfragen immer Richtwerte mit dem Hinweis auf ein kostenloses Vor-Ort-Angebot
- Empfehle bei konkreten Projekten immer die direkte Kontaktaufnahme
- Nenne niemals Konkurrenzunternehmen
- Wenn du etwas nicht weißt, empfehle den direkten Kontakt`;

/* ---------------------------------------------------------------
   POST /api/chat  — Streaming SSE response
---------------------------------------------------------------- */
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const stream = client.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Anthropic API error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

/* ---------------------------------------------------------------
   Health check
---------------------------------------------------------------- */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Chatbot-Server läuft auf http://localhost:${PORT}`);
  console.log(`   Stelle sicher, dass ANTHROPIC_API_KEY gesetzt ist.\n`);
});
