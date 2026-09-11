"""NEER Marine Copilot: Comprehensive Intent Test Matrix.

Automated test matrix verifying all 10 intent categories (≥4 phrasing variants each),
4 location conditions (explicit, session fallback, pronoun follow-up, omission follow-up),
and 7 languages (English, Hindi, Tamil, Telugu, Bengali, Malayalam, Hinglish).
"""
import re
import sys
import unittest
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline import run_pipeline, _SESSION_STATES


class TestIntentMatrix(unittest.TestCase):
    """Broad automated intent test matrix covering all categories, location conditions, and languages."""

    @classmethod
    def setUpClass(cls):
        cls.results_table = []
        cls.test_counter = 0

    def setUp(self):
        _SESSION_STATES.clear()

    @classmethod
    def tearDownClass(cls):
        """Print the complete markdown results table after all tests run."""
        print("\n" + "=" * 110)
        print("NEER MARINE COPILOT — AUTOMATED INTENT TEST MATRIX RESULTS")
        print("=" * 110 + "\n")
        header = f"| {'#':<3} | {'Query':<48} | {'Expected Category':<18} | {'Detected Category':<18} | {'Resolved Location':<22} | {'First Sentence Snippet':<40} | {'Status':<6} |"
        sep = f"|{'-'*5}|{'-'*50}|{'-'*20}|{'-'*20}|{'-'*24}|{'-'*42}|{'-'*8}|"
        print(header)
        print(sep)
        for row in cls.results_table:
            idx = str(row["idx"])
            q = (row["query"][:45] + "...") if len(row["query"]) > 45 else row["query"]
            ec = row["expected_cat"][:16]
            dc = row["detected_cat"][:16]
            loc = (row["location"][:20] + "...") if len(row["location"]) > 20 else row["location"]
            snip = (row["first_sentence"][:37] + "...") if len(row["first_sentence"]) > 37 else row["first_sentence"]
            st = row["status"]
            print(f"| {idx:<3} | {q:<48} | {ec:<18} | {dc:<18} | {loc:<22} | {snip:<40} | {st:<6} |")
        print("\n" + "=" * 110 + "\n")

    def _evaluate_cell(
        self,
        query: str,
        expected_cat: str,
        fallback_location: str | None = None,
        session_id: str | None = None,
        expected_loc_substr: str | None = None,
        target_lang_script: str | None = None,
    ) -> dict:
        self.__class__.test_counter += 1
        idx = self.__class__.test_counter

        res = run_pipeline(query, context_location=fallback_location, session_id=session_id)
        intent = res["agents"]["intent"]
        final_output = res["final_output"]
        dec = final_output.get("decisionOutput") or {}

        query_type = intent.get("query_type")
        narrow_topic = intent.get("narrow_topic")
        resolved_loc_dict = intent.get("location")
        resolved_loc_name = resolved_loc_dict.get("name") if resolved_loc_dict else "None"
        clarifying_q = intent.get("clarifying_question")

        narrative = dec.get("narrative") or ""
        first_sentence = re.split(r"[.!?।]\s*", narrative)[0].strip() if narrative else ""
        actions = dec.get("recommendedActions") or []
        decision_status = dec.get("status") or ""

        # Map to human-readable category name
        if narrow_topic:
            detected_cat = narrow_topic
        elif query_type == "safety":
            detected_cat = "safety"
        elif query_type == "fishing":
            detected_cat = "fishing"
        elif query_type == "compound":
            detected_cat = "compound"
        else:
            detected_cat = "marine_conditions"

        # Assertions
        failures = []

        # 1. Category match
        if expected_cat == "weather":
            if narrow_topic not in ("weather", "marine_conditions", None) and query_type != "marine_conditions":
                failures.append(f"Category mismatch: expected weather, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "safety":
            if query_type != "safety":
                failures.append(f"Category mismatch: expected safety, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "pfz":
            if narrow_topic != "pfz" and query_type != "fishing":
                failures.append(f"Category mismatch: expected pfz, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "hazards":
            if narrow_topic != "hazards" and query_type != "safety":
                failures.append(f"Category mismatch: expected hazards, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "route":
            if narrow_topic != "route":
                failures.append(f"Category mismatch: expected route, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "timing":
            if narrow_topic != "timing":
                failures.append(f"Category mismatch: expected timing, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "wind_speed":
            if narrow_topic != "wind_speed":
                failures.append(f"Category mismatch: expected wind_speed, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "wave_height":
            if narrow_topic != "wave_height":
                failures.append(f"Category mismatch: expected wave_height, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "swell":
            if narrow_topic != "swell":
                failures.append(f"Category mismatch: expected swell, got qt={query_type}, nt={narrow_topic}")
        elif expected_cat == "compound":
            if query_type != "compound":
                failures.append(f"Category mismatch: expected compound, got qt={query_type}, nt={narrow_topic}")

        # 2. Location resolved (no unprompted clarifying question when location/fallback provided)
        if expected_loc_substr:
            if not resolved_loc_dict or expected_loc_substr.lower() not in resolved_loc_name.lower():
                failures.append(f"Location mismatch: expected '{expected_loc_substr}' in '{resolved_loc_name}'")
            if clarifying_q:
                failures.append(f"Unexpected clarifying question: '{clarifying_q}'")

        # 3. First sentence responsiveness
        if expected_cat == "safety":
            safety_words = ("yes", "no", "caution", "safe", "proceed", "हाँ", "नहीं", "सावधानी", "सुरक्षित",
                            "ஆம்", "இல்லை", "எச்சரிக்கை", "பாதுகாப்பு", "అవును", "కాదు", "జాగ్రత్త", "సురక్షితం",
                            "হ্যাঁ", "না", "সতর্ক", "নিরাপদ", "അതെ", "അല്ല", "ജാഗ്രത", "സുരക്ഷിത", "होय", "नाही")
            if not any(w in first_sentence.lower() for w in safety_words):
                failures.append(f"First sentence does not provide direct safety verdict: '{first_sentence}'")
        elif expected_cat == "pfz":
            pfz_words = ("km", "distance", "pfz", "fishing zone", "दूर", "किलोमीटर", "தொலைவில்", "தூர", "দূরে", "അകലെ", "अंतर")
            if not any(w in first_sentence.lower() for w in pfz_words):
                failures.append(f"First sentence does not provide PFZ distance: '{first_sentence}'")

        # 4. Language script
        if target_lang_script:
            if target_lang_script == "devanagari" and not re.search(r"[\u0900-\u097F]", narrative):
                failures.append(f"Expected Devanagari script for Hindi/Hinglish in: '{narrative[:50]}'")
            elif target_lang_script == "tamil" and not re.search(r"[\u0B80-\u0BFF]", narrative):
                failures.append(f"Expected Tamil script in: '{narrative[:50]}'")
            elif target_lang_script == "telugu" and not re.search(r"[\u0C00-\u0C7F]", narrative):
                failures.append(f"Expected Telugu script in: '{narrative[:50]}'")
            elif target_lang_script == "bengali" and not re.search(r"[\u0980-\u09FF]", narrative):
                failures.append(f"Expected Bengali script in: '{narrative[:50]}'")
            elif target_lang_script == "malayalam" and not re.search(r"[\u0D00-\u0D7F]", narrative):
                failures.append(f"Expected Malayalam script in: '{narrative[:50]}'")

        # 5. recommendedAction does not contradict narrative
        if "favourable" in narrative.lower() or "safe" in narrative.lower() or "अनुकूल" in narrative or "हाँ" in narrative:
            for act in actions:
                if "unavailable" in act.lower() or "not recommended" in act.lower():
                    failures.append(f"Contradiction: narrative is favourable but action says '{act}'")

        status = "PASS" if not failures else "FAIL"
        row = {
            "idx": idx,
            "query": query,
            "expected_cat": expected_cat,
            "detected_cat": detected_cat,
            "location": resolved_loc_name,
            "first_sentence": first_sentence or "(empty)",
            "status": status,
            "failures": failures,
        }
        self.__class__.results_table.append(row)

        self.assertEqual(len(failures), 0, f"Test #{idx} failed: {failures}")
        return row

    # =========================================================================
    # SECTION 1: 10 INTENT CATEGORIES (≥ 4 PHRASING VARIANTS EACH = 40 TESTS)
    # =========================================================================

    def test_01_weather_phrasings(self):
        self._evaluate_cell("how is weather in Kochi", "weather", expected_loc_substr="Kochi")
        self._evaluate_cell("mausam kaisa hai Surat me", "weather", expected_loc_substr="Surat")
        self._evaluate_cell("weather forecast today Mumbai", "weather", expected_loc_substr="Mumbai")
        self._evaluate_cell("surat mausam", "weather", expected_loc_substr="Surat")

    def test_02_safety_permission_phrasings(self):
        self._evaluate_cell("can I go fishing near Kochi", "safety", expected_loc_substr="Kochi")
        self._evaluate_cell("machli pakadne jaa sakte hain Surat me", "safety", expected_loc_substr="Surat")
        self._evaluate_cell("is it safe to sail from Mumbai", "safety", expected_loc_substr="Mumbai")
        self._evaluate_cell("kya me waha machli pakadne jaa skta hu", "safety", fallback_location="Surat Coast, Gujarat", expected_loc_substr="Surat")

    def test_03_pfz_distance_phrasings(self):
        self._evaluate_cell("where is the fishing zone near Kochi", "pfz", expected_loc_substr="Kochi")
        self._evaluate_cell("fishing zone kitna dur hai meri location se", "pfz", fallback_location="Surat Coast, Gujarat", expected_loc_substr="Surat")
        self._evaluate_cell("nearest pfz from Surat", "pfz", expected_loc_substr="Surat")
        self._evaluate_cell("machli zone distance in Mumbai", "pfz", expected_loc_substr="Mumbai")

    def test_04_hazards_phrasings(self):
        self._evaluate_cell("any cyclone warning near Chennai", "hazards", expected_loc_substr="Chennai")
        self._evaluate_cell("kya koi khatra hai Surat me", "hazards", expected_loc_substr="Surat")
        self._evaluate_cell("tsunami alert Kochi", "hazards", expected_loc_substr="Kochi")
        self._evaluate_cell("high wave warning near Vizag", "hazards", expected_loc_substr="Visakhapatnam")

    def test_05_route_safety_phrasings(self):
        self._evaluate_cell("is the route safe near Mangalore", "route", expected_loc_substr="Mangalore")
        self._evaluate_cell("rasta kaisa hai Surat me", "route", expected_loc_substr="Surat")
        self._evaluate_cell("safe passage to fishing grounds from Kochi", "route", expected_loc_substr="Kochi")
        self._evaluate_cell("can I navigate north from Mumbai", "route", expected_loc_substr="Mumbai")

    def test_06_timing_phrasings(self):
        self._evaluate_cell("when should I go fishing near Kochi", "timing", expected_loc_substr="Kochi")
        self._evaluate_cell("machli pakadne ka sahi samay Surat me", "timing", expected_loc_substr="Surat")
        self._evaluate_cell("best fishing window today in Mumbai", "timing", expected_loc_substr="Mumbai")
        self._evaluate_cell("optimal departure time near Chennai", "timing", expected_loc_substr="Chennai")

    def test_07_wind_speed_phrasings(self):
        self._evaluate_cell("what is wind speed in Kochi", "wind_speed", expected_loc_substr="Kochi")
        self._evaluate_cell("hawa ki raftaar kitni hai Surat me", "wind_speed", expected_loc_substr="Surat")
        self._evaluate_cell("is it too windy near Mumbai", "wind_speed", expected_loc_substr="Mumbai")
        self._evaluate_cell("current wind conditions in Chennai", "wind_speed", expected_loc_substr="Chennai")

    def test_08_wave_height_phrasings(self):
        self._evaluate_cell("how high are the waves in Kochi", "wave_height", expected_loc_substr="Kochi")
        self._evaluate_cell("lehro ki unchai kitni hai Surat me", "wave_height", expected_loc_substr="Surat")
        self._evaluate_cell("wave status near Mumbai", "wave_height", expected_loc_substr="Mumbai")
        self._evaluate_cell("are waves rough near Chennai", "wave_height", expected_loc_substr="Chennai")

    def test_09_swell_phrasings(self):
        self._evaluate_cell("what is the swell in Kochi", "swell", expected_loc_substr="Kochi")
        self._evaluate_cell("swell period kitna hai Surat me", "swell", expected_loc_substr="Surat")
        self._evaluate_cell("swell conditions near Mumbai", "swell", expected_loc_substr="Mumbai")
        self._evaluate_cell("ocean swell forecast Chennai", "swell", expected_loc_substr="Chennai")

    def test_10_compound_phrasings(self):
        self._evaluate_cell("weather and can I go to Kochi", "compound", expected_loc_substr="Kochi")
        self._evaluate_cell("hawa aur lehar kaisa hai kya jaa sakte hain Surat me", "compound", expected_loc_substr="Surat")
        self._evaluate_cell("wind speed and nearest pfz near Mumbai", "compound", expected_loc_substr="Mumbai")
        self._evaluate_cell("safe to fish and where is the zone in Chennai", "compound", expected_loc_substr="Chennai")

    # =========================================================================
    # SECTION 2: LOCATION CONDITIONS (4 CONDITIONS)
    # =========================================================================

    def test_11_location_explicit_in_query(self):
        """Condition A: Explicit in query."""
        self._evaluate_cell("Kya me Mumbai me fishing kar sakta hu?", "safety", expected_loc_substr="Mumbai")

    def test_12_location_session_default_active(self):
        """Condition B: No location named, session/default active (Surat Coast, Gujarat). Must NOT ask clarifying question."""
        self._evaluate_cell("Kya aaj me machli pakadne jaa sakta hu?", "safety", fallback_location="Surat Coast, Gujarat", expected_loc_substr="Surat")

    def test_13_location_followup_pronoun(self):
        """Condition C: Follow-up turn with pronoun ('waha' -> references turn 1 Surat)."""
        session_id = "test_pronoun_session"
        # Turn 1: Surat established
        run_pipeline("Surat me mausam kaisa hai?", session_id=session_id)
        # Turn 2: Follow-up using 'waha'
        self._evaluate_cell("kya me waha machli pakadne jaa skta hu", "safety", session_id=session_id, expected_loc_substr="Surat")

    def test_14_location_followup_omission(self):
        """Condition D: Follow-up turn with omission (no location mentioned in 2nd turn)."""
        session_id = "test_omission_session"
        # Turn 1: Kochi established
        run_pipeline("How are conditions in Kochi?", session_id=session_id)
        # Turn 2: Omission of location
        self._evaluate_cell("what is the nearest fishing zone?", "pfz", session_id=session_id, expected_loc_substr="Kochi")

    # =========================================================================
    # SECTION 3: MULTILINGUAL COVERAGE (7 LANGUAGES ACROSS SAFETY & PFZ)
    # =========================================================================

    def test_15_multilingual_english(self):
        self._evaluate_cell("Can I go fishing near Kochi today?", "safety", expected_loc_substr="Kochi")
        self._evaluate_cell("How far is the nearest fishing zone from Kochi?", "pfz", expected_loc_substr="Kochi")

    def test_16_multilingual_hindi(self):
        # Hindi Devanagari
        self._evaluate_cell("क्या मैं कोच्चि में मछली पकड़ने जा सकता हूँ?", "safety", expected_loc_substr="Kochi", target_lang_script="devanagari")
        self._evaluate_cell("कोच्चि से फिशिंग ज़ोन कितना दूर है?", "pfz", expected_loc_substr="Kochi", target_lang_script="devanagari")
        # Hinglish
        self._evaluate_cell("Kya me Kochi me machli pakadne jaa sakta hu?", "safety", expected_loc_substr="Kochi", target_lang_script="devanagari")
        self._evaluate_cell("Kochi se fishing zone kitna dur hai?", "pfz", expected_loc_substr="Kochi", target_lang_script="devanagari")

    def test_17_multilingual_tamil(self):
        # Tamil script
        self._evaluate_cell("நான் கொச்சியில் மீன்பிடிக்க செல்லலாமா?", "safety", expected_loc_substr="Kochi", target_lang_script="tamil")
        self._evaluate_cell("கொச்சியிலிருந்து மீன்பிடி மண்டலம் எவ்வளவு தூரம்?", "pfz", expected_loc_substr="Kochi", target_lang_script="tamil")
        # Tanglish
        self._evaluate_cell("Kochi la meen pidikka pogalama?", "safety", expected_loc_substr="Kochi", target_lang_script="tamil")

    def test_18_multilingual_telugu(self):
        # Telugu script
        self._evaluate_cell("నేను కొచ్చిలో చేపల వేటకు వెళ్ళవచ్చా?", "safety", expected_loc_substr="Kochi", target_lang_script="telugu")
        self._evaluate_cell("కొచ్చి నుండి చేపల వేట ప్రాంతం ఎంత దూరం?", "pfz", expected_loc_substr="Kochi", target_lang_script="telugu")

    def test_19_multilingual_bengali(self):
        # Bengali script
        self._evaluate_cell("আমি কি কোচিতে মাছ ধরতে যেতে পারি?", "safety", expected_loc_substr="Kochi", target_lang_script="bengali")
        self._evaluate_cell("কোচি থেকে মাছ ধরার অঞ্চল কত দূরে?", "pfz", expected_loc_substr="Kochi", target_lang_script="bengali")

    def test_20_multilingual_malayalam(self):
        # Malayalam script
        self._evaluate_cell("എനിക്ക് കൊച്ചിയിൽ മീൻ പിടിക്കാൻ പോകാമോ?", "safety", expected_loc_substr="Kochi", target_lang_script="malayalam")
        self._evaluate_cell("കൊച്ചിയിൽ നിന്ന് മത്സ്യബന്ധന മേഖല എത്ര ദൂരം?", "pfz", expected_loc_substr="Kochi", target_lang_script="malayalam")
        # Manglish
        self._evaluate_cell("Kochi meen pidikkan pokamo?", "safety", expected_loc_substr="Kochi", target_lang_script="malayalam")

    def test_21_inland_fallback_noida(self):
        """Verify inland fallback location (Noida) is properly resolved and flagged non-coastal."""
        res1 = run_pipeline("aaj mausam kesa rahega?", context_location="Noida, Uttar Pradesh (28.5355, 77.391)")
        intent1 = res1["agents"]["intent"]
        self.assertFalse(intent1["is_coastal"])
        self.assertIn("Noida", intent1["location"]["name"])
        headline1 = res1["final_output"]["decisionOutput"]["headline"]
        self.assertIn("तटीय क्षेत्र प्रतीत नहीं होता", headline1)
        self.assertNotIn("समुद्री परिस्थितियाँ अनुकूल हैं", headline1)

        res2 = run_pipeline("Aaj machli pakadne ke liye mausam kesa rahega?", context_location="Noida, Uttar Pradesh (28.5355, 77.391)")
        intent2 = res2["agents"]["intent"]
        self.assertFalse(intent2["is_coastal"])
        self.assertIn("Noida", intent2["location"]["name"])
        headline2 = res2["final_output"]["decisionOutput"]["headline"]
        self.assertIn("तटीय क्षेत्र प्रतीत नहीं होता", headline2)
        self.assertNotIn("समुद्री परिस्थितियाँ अनुकूल हैं", headline2)


if __name__ == "__main__":
    unittest.main()
