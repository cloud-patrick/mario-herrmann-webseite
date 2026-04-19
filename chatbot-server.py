"""
Chatbot-Backend für Parkett & Bodenbeläge Mario Herrmann
Starten: python3 chatbot-server.py
Vorher:  pip3 install anthropic flask flask-cors
"""

import os
import json
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
import anthropic

app = Flask(__name__)
CORS(app)

client = anthropic.Anthropic()  # liest ANTHROPIC_API_KEY aus der Umgebung

SYSTEM_PROMPT = """Du bist ein freundlicher und kompetenter Kundenberater für Parkett & Bodenbeläge Mario Herrmann, einem Meisterbetrieb in Koblenz.

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
- Wenn du etwas nicht weißt, empfehle den direkten Kontakt"""


@app.route("/health")
def health():
    return {"status": "ok"}


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    messages = data.get("messages", [])

    if not messages:
        return {"error": "messages array required"}, 400

    def generate():
        try:
            with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=messages,
            ) as stream:
                for text_chunk in stream.text_stream:
                    yield f"data: {json.dumps({'text': text_chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        content_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    print(f"\n✅ Chatbot-Server läuft auf http://localhost:{port}")
    print("   Stelle sicher, dass ANTHROPIC_API_KEY gesetzt ist.\n")
    app.run(host="0.0.0.0", port=port, debug=False)
