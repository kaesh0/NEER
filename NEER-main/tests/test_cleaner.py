import re, sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def clean_sarvam_narrative(text: str) -> str | None:
    if not text:
        return None

    # Helper: Check if a candidate string is clean of meta reasoning
    def is_clean(candidate: str) -> bool:
        if not candidate or len(candidate.strip()) < 20:
            return False
        lower = candidate.lower()
        poison_words = [
            "the user wants", "i must use only", "let me extract", "the instructions say",
            "so i need to", "let me check", "check constraints", "key constraints",
            "evaluating against", "that's 3 sentences", "that's 2 sentences",
            "my draft:", "let me draft:", "sentence 1:", "i need to mention"
        ]
        return not any(pw in lower for pw in poison_words)

    # 1. XML tag extraction
    m = re.search(r"<narrative>(.*?)</narrative>", text, re.DOTALL | re.IGNORECASE)
    if m:
        candidate = m.group(1).strip()
        if is_clean(candidate):
            return candidate

    # 2. Quoted draft extraction: models often write: Let me draft: "..." or Revised: "..."
    # This handles both Hindi and English drafts cleanly
    quotes = re.findall(r'"([^"]{30,800})"', text)
    valid_quotes = [q.strip() for q in quotes if is_clean(q)]
    if valid_quotes:
        return valid_quotes[-1]  # The latest revision / final draft

    # 3. Devanagari extraction: if the model wrote reasoning in English and the answer in Hindi
    devanagari_blocks = re.findall(r'[\u0900-\u097F][\u0900-\u097F\s\d.,/!?:;\'"()\-।॥]{20,}', text)
    if devanagari_blocks:
        longest = max(devanagari_blocks, key=len).strip().strip('"\' ')
        if len(longest) > 30:
            return longest

    # 4. Marker extraction (Forward search from conclusion markers)
    markers = [
        "let me draft:", "draft:", "revised:", "revised draft:",
        "final text:", "final response:", "my response:", "let's go with:"
    ]
    lower_text = text.lower()
    for marker in markers:
        if marker in lower_text:
            idx = lower_text.rfind(marker) + len(marker)
            tail = text[idx:].strip()
            # If followed by quotes
            if tail.startswith('"') and '"' in tail[1:]:
                q_text = tail[1:tail.index('"', 1)].strip()
                if is_clean(q_text):
                    return q_text
            # Otherwise split on any subsequent reasoning
            split_pat = r"(?i)\b(the instructions say|let me check|check constraints|wait,)\b"
            sub_parts = re.split(split_pat, tail)
            cand = sub_parts[0].strip().strip('"\' \n')
            if is_clean(cand):
                return cand

    # 5. Head Truncation (Answer first, reasoning trailing after)
    split_pattern = (
        r"(?i)\b(the instructions say|let'?s refine|that'?s \d sentences|let me check|"
        r"i should ensure|check constraints|my draft|revised draft|revised:|let'?s evaluate|"
        r"so i need to|i need to mention|key constraints|sentence \d|let'?s go with|draft:|evaluating against)\b"
    )
    parts = re.split(split_pattern, text)
    if len(parts) > 1 and len(parts[0].strip()) > 30:
        head = parts[0].strip().strip("\"' \n")
        m_sent = re.findall(r".*?[.!।](?:\s|$)", head, re.DOTALL)
        cand = "".join(m_sent).strip().strip("\"' ") if m_sent else head
        if is_clean(cand):
            return cand

    # 6. If entire text is already clean and not excessively long (< 120 words)
    words = text.split()
    if len(words) < 120 and is_clean(text):
        return text.strip(' "”\'')

    # If it reached here, it is contaminated with scratchpad and couldn't be cleanly parsed
    return None


# Test with the current run's exact output:
text_run_2 = '''The user wants me to respond as a marine-assistance response writer for Indian coastal communities. I must use ONLY the supplied JSON data. Output must be ONLY the final conversational narrative directly to the user in 2-4 clear sentences. Must be enclosed strictly between <narrative> and </narrative> tags. No reasoning, thought process, scratchpad notes, or analysis inside the tags. I need to state clearly the risk status, current conditions (wave height, wind speed, ocean currents), and safety advice.

Let me extract the data:
- Intent: fishing safety query for Visakhapatnam tomorrow morning for small fishing boat.
- Location: Visakhapatnam, Andhra Pradesh
- Time: tomorrow (2026-09-05)
- Persona: fisherman
- Language: Hindi (hi-IN)
- Weather status: OK
- Forecast valid for: 2026-09-05T06:00
- Wave height: 1.18 m
- Wind speed: 3.5 km/h
- Current speed: 4.7 km/h
- Ocean status: live
- PFZ advisory: LIVE OFFICIAL INCOIS ADVISORY, sector NORTH ANDHRA PRADESH, valid until 5 SEP 2026, nearest PFZ Bhimunipatnam (17.6, 83.3), distance from coast 30-35 km, depth 49-54 m, distance from user 19.4 km
- Risk status: SAFE
- Weather status: SAFE
- Safety score: 100.0
- Reasons: All marine parameters within favourable operating limits.
- Geofence: {}
- Route: {}

I need to write in Hindi (reply_language_code is hi-IN) since the original query is in Hindi.

The narrative should be 2-4 clear sentences.
Must include:
- Risk status (SAFE/COASTAL OPTIMA)
- Current conditions: wave height 1.18m, wind speed 3.5 km/h, ocean currents/current speed 4.7 km/h
- Safety advice

Also mention the location/time context: Visakhapatnam, tomorrow morning (kal subah/kal 5 September subah).

Let me draft:

"कल सुबह विशखापत्तनम के पास छोटी नाव से मछली पकड़ने जाना पूरी तरह सुरक्षित है। जलस्तर 1.18 मीटर, हवा की गति 3.5 किमी/घंटा और लहरें 4.7 किमी/घंटा की गति से आ रही हैं, जो सभी सुरक्षित सीमा के भीतर हैं। आपको सावधानी से आगे बढ़ना चाहिए और निकलने से पहले स्थानीय मौसम अपडेट भी देख लेना चाहिए।"

Wait, the prompt says "state clearly the risk status, current conditions (wave height, wind speed, ocean currents), and safety advice.'''

res = clean_sarvam_narrative(text_run_2)
print("EXTRACTED RESULT:")
print(res)
assert res is not None
assert "user wants" not in res
assert "विशखापत्तनम" in res
print("\n>>> TEST PASSED: Perfectly extracted the clean Hindi narrative! <<<")
