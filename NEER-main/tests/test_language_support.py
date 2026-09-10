import json
import unittest
from unittest.mock import patch
from pathlib import Path
import sys
import re

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline import run_pipeline
from agents.agent_1_intent import agent_1_intent
from agents.agent_7_response import agent_7_response
from services.sarvam_service import prepare_for_agent_1, translate_final_response, LANGUAGE_NAMES


class TestMultilingualSupport(unittest.TestCase):
    """Test suite verifying end-to-end regional language detection, direct in-language LLM generation,

    and deterministic fallback translation.
    """

    def test_criterion_1_hindi_query(self):
        """1. Hindi query -> Hindi reply (Devanagari script)."""
        res_roman = run_pipeline("Kochi me mausam kesa hai?")
        narrative_roman = res_roman["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_roman["agents"]["intent"]["language"]["reply_language_code"], "hi-IN")
        self.assertTrue(bool(re.search(r"[\u0900-\u097F]", narrative_roman)), f"Expected Devanagari in: {narrative_roman}")

        res_native = run_pipeline("कोच्चि में मौसम कैसा है?")
        narrative_native = res_native["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_native["agents"]["intent"]["language"]["reply_language_code"], "hi-IN")
        self.assertTrue(bool(re.search(r"[\u0900-\u097F]", narrative_native)), f"Expected Devanagari in: {narrative_native}")

    def test_criterion_2_tamil_query(self):
        """2. Tamil query -> Tamil reply (Tamil script)."""
        # Native script
        res_native = run_pipeline("கொச்சியில் வானிலை எப்படி இருக்கிறது?")
        narrative_native = res_native["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_native["agents"]["intent"]["language"]["reply_language_code"], "ta-IN")
        self.assertTrue(bool(re.search(r"[\u0B80-\u0BFF]", narrative_native)), f"Expected Tamil script in: {narrative_native}")

        # Romanized Tanglish
        res_roman = run_pipeline("Kochi vanilai epdi irukku?")
        narrative_roman = res_roman["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_roman["agents"]["intent"]["language"]["reply_language_code"], "ta-IN")
        self.assertTrue(bool(re.search(r"[\u0B80-\u0BFF]", narrative_roman)), f"Expected Tamil script in: {narrative_roman}")

    def test_criterion_3_telugu_query(self):
        """3. Telugu query -> Telugu reply (Telugu script)."""
        # Native script
        res_native = run_pipeline("కొచ్చిలో వాతావరణం ఎలా ఉంది?")
        narrative_native = res_native["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_native["agents"]["intent"]["language"]["reply_language_code"], "te-IN")
        self.assertTrue(bool(re.search(r"[\u0C00-\u0C7F]", narrative_native)), f"Expected Telugu script in: {narrative_native}")

        # Romanized Telugu
        res_roman = run_pipeline("Kochi vatavaranam ela undi?")
        narrative_roman = res_roman["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_roman["agents"]["intent"]["language"]["reply_language_code"], "te-IN")
        self.assertTrue(bool(re.search(r"[\u0C00-\u0C7F]", narrative_roman)), f"Expected Telugu script in: {narrative_roman}")

    def test_criterion_4_bengali_query(self):
        """4. Bengali query -> Bengali reply (Bengali script)."""
        # Native script
        res_native = run_pipeline("কোচিতে আবহাওয়া কেমন?")
        narrative_native = res_native["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_native["agents"]["intent"]["language"]["reply_language_code"], "bn-IN")
        self.assertTrue(bool(re.search(r"[\u0980-\u09FF]", narrative_native)), f"Expected Bengali script in: {narrative_native}")

        # Romanized Bengali
        res_roman = run_pipeline("Kochi te abhawa kemon?")
        narrative_roman = res_roman["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_roman["agents"]["intent"]["language"]["reply_language_code"], "bn-IN")
        self.assertTrue(bool(re.search(r"[\u0980-\u09FF]", narrative_roman)), f"Expected Bengali script in: {narrative_roman}")

    def test_criterion_5_malayalam_query(self):
        """5. Malayalam query -> Malayalam reply (Malayalam script)."""
        # Native script
        res_native = run_pipeline("കൊച്ചിയിൽ കാലാവസ്ഥ എങ്ങനെയുണ്ട്?")
        narrative_native = res_native["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_native["agents"]["intent"]["language"]["reply_language_code"], "ml-IN")
        self.assertTrue(bool(re.search(r"[\u0D00-\u0D7F]", narrative_native)), f"Expected Malayalam script in: {narrative_native}")

        # Romanized Malayalam
        res_roman = run_pipeline("Kochi kalavastha engane undu?")
        narrative_roman = res_roman["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res_roman["agents"]["intent"]["language"]["reply_language_code"], "ml-IN")
        self.assertTrue(bool(re.search(r"[\u0D00-\u0D7F]", narrative_roman)), f"Expected Malayalam script in: {narrative_roman}")

    def test_criterion_6_english_regression(self):
        """6. English query -> English reply remains intact."""
        res = run_pipeline("How is the weather in Kochi?")
        narrative = res["final_output"]["decisionOutput"]["narrative"]
        self.assertEqual(res["agents"]["intent"]["language"]["reply_language_code"], "en-IN")
        # Ensure no Indic script characters leak into English reply
        self.assertFalse(bool(re.search(r"[\u0900-\u0D7F]", narrative)))
        self.assertIn("Weather near Kochi, Kerala", narrative)

    def test_criterion_7_simulated_llm_failure_hindi_fallback(self):
        """7. Force Sarvam LLM path to fail (mock None) for Hindi query.

        Confirm deterministic fallback narrative still comes back in Hindi (Devanagari),
        verifying _translate_payload safety net.
        """
        intent = {
            "persona": "fisherman",
            "query_type": "safety",
            "narrow_topic": None,
            "location": {"name": "Kochi, Kerala", "latitude": 9.93, "longitude": 76.26},
            "is_coastal": True,
            "language": {"status": "ok", "reply_language_code": "hi-IN"},
        }
        weather = {"status": "ok", "wave_height_m": 1.1, "wind_speed_kmh": 14.0, "swell_period_s": 8.0}
        ocean = {"status": "ok"}
        risk = {"status": "SAFE", "reasons": []}

        # Force sarvam_chat_completion to fail / return None
        with patch("agents.agent_7_response.sarvam_chat_completion", return_value=None):
            payload = agent_7_response(intent, weather, ocean, risk)

        narrative = payload["decisionOutput"]["narrative"]
        self.assertIsNotNone(narrative)
        self.assertTrue(bool(re.search(r"[\u0900-\u097F]", narrative)), f"Expected Hindi in fallback, got: {narrative}")
        self.assertIn("हाँ", narrative)

    def test_criterion_8_schema_enums_remain_english(self):
        """8. Confirm narrow_topic, query_type, persona in intent and intentSummary

        remain in English enum format regardless of query language.
        """
        regional_queries = [
            "கொச்சியில் வானிலை எப்படி இருக்கிறது?",  # Tamil
            "కొచ్చిలో వాతావరణం ఎలా ఉంది?",         # Telugu
            "কোচিতে আবহাওয়া কেমন?",                  # Bengali
            "കൊച്ചിയിൽ കാലാവസ്ഥ എങ്ങനെയുണ്ട്?",       # Malayalam
            "कोच्चि में मौसम कैसा है?",            # Hindi
        ]

        for q in regional_queries:
            res = run_pipeline(q)
            intent = res["agents"]["intent"]
            summary = res["final_output"]["intentSummary"]

            # Persona must be English enum
            self.assertIn(intent["persona"], ["fisherman", "authority"])
            self.assertIn(summary["persona"], ["fisherman", "authority"])

            # Query type / domain must be English enum
            self.assertIn(intent["query_type"], ["safety", "fishing", "marine_conditions"])
            self.assertIn(summary["domain"], ["safety", "fishing", "marine_conditions"])

            # Narrow topic must be English enum or None
            if intent["narrow_topic"] is not None:
                self.assertIn(intent["narrow_topic"], [
                    "weather", "wind_speed", "wave_height", "swell", "pfz", "geofence",
                    "hazards", "route", "score", "sea_surface_temperature", "chlorophyll", "timing"
                ])
                self.assertEqual(summary["topic"], intent["narrow_topic"])

    def test_in_language_llm_generation_prompting(self):
        """Verify _sarvam_response injects the target language instruction into LLM system prompt

        and directly extracts the narrative without double-translation.
        """
        mock_tamil_llm_response = (
            "Thinking process in English: user asked about safety in Kochi.\n"
            "<narrative>ஆம், நீங்கள் மீன்பிடிக்கச் செல்லலாம். கடல் நிலைமைகள் சாதகமாக உள்ளன.</narrative>"
        )

        captured_messages = []

        def fake_chat_completion(messages, **kwargs):
            captured_messages.extend(messages)
            return mock_tamil_llm_response

        intent = {
            "persona": "fisherman",
            "query_type": "safety",
            "narrow_topic": None,
            "location": {"name": "Kochi, Kerala", "latitude": 9.93, "longitude": 76.26},
            "is_coastal": True,
            "language": {"status": "ok", "reply_language_code": "ta-IN"},
        }
        weather = {"status": "ok", "wave_height_m": 1.1, "wind_speed_kmh": 14.0, "swell_period_s": 8.0}
        ocean = {"status": "ok"}
        risk = {"status": "SAFE", "reasons": []}

        with patch("agents.agent_7_response.sarvam_chat_completion", side_effect=fake_chat_completion):
            payload = agent_7_response(intent, weather, ocean, risk)

        # Check that system prompt instructed LLM in Tamil
        system_content = captured_messages[0]["content"]
        self.assertIn("Tamil", system_content)
        self.assertIn("ta-IN", system_content)

        # Check that extracted narrative was preserved without corruption
        narrative = payload["decisionOutput"]["narrative"]
        self.assertEqual(narrative, "ஆம், நீங்கள் மீன்பிடிக்கச் செல்லலாம். கடல் நிலைமைகள் சாதகமாக உள்ளன.")

    def test_permission_queries_across_all_languages(self):
        """Test ambiguous 'can I go fishing there' pattern across English, Hindi, Tamil, Telugu, Bengali, Malayalam.

        Verifies query_type is 'safety', location carries over to Kavaratti, and first sentence has direct verdict.
        """
        from pipeline import _SESSION_STATES
        last_loc = {"name": "Kavaratti, Lakshadweep", "latitude": 10.5669, "longitude": 72.6420}

        permission_queries = [
            ("English", "Can I go fishing there?", ["Yes,", "can go", "Proceed with caution", "not safe"]),
            ("Hindi", "Kya main wahan machli pakadne ja sakta hoon?", ["हाँ", "सावधानी", "नहीं"]),
            ("Tamil", "நான் அங்கு மீன்பிடிக்க செல்லலாமா?", ["ஆம்", "எச்சரிக்கையுடன்", "இல்லை"]),
            ("Telugu", "నేను అక్కడ చేపల వేటకు వెళ్ళవచ్చా?", ["అవును", "జాగ్రత్తగా", "కాదు"]),
            ("Bengali", "আমি কি সেখানে মাছ ধরতে যেতে পারি?", ["হ্যাঁ", "সতর্কতার", "না"]),
            ("Malayalam", "എനിക്ക് അവിടെ മീൻ പിടിക്കാൻ പോകാമോ?", ["അതെ", "ജാഗ്രതയോടെ", "അല്ല"]),
        ]

        for lang_label, query_text, expected_verdict_words in permission_queries:
            _SESSION_STATES.clear()
            session_id = f"test_session_{lang_label.lower()}"
            # Seed session with Kavaratti
            _SESSION_STATES[session_id] = {
                "last_location": last_loc,
                "last_persona": "fisherman",
                "last_vessel_type": "small fishing boat",
                "recent_turns": [{"query": "weather in Kavaratti", "location": "Kavaratti, Lakshadweep"}],
            }

            res = run_pipeline(query_text, session_id=session_id)
            intent = res["agents"]["intent"]
            narrative = res["final_output"]["decisionOutput"]["narrative"]

            # Must resolve to Kavaratti
            self.assertIsNotNone(intent.get("location"), f"[{lang_label}] Location should not be None")
            self.assertIn("Kavaratti", intent["location"]["name"], f"[{lang_label}] Expected Kavaratti, got: {intent['location']['name']}")

            # Must resolve to safety, broad topic
            self.assertEqual(intent["query_type"], "safety", f"[{lang_label}] Expected query_type == 'safety', got {intent['query_type']}")
            self.assertIsNone(intent["narrow_topic"], f"[{lang_label}] Expected narrow_topic == None, got {intent['narrow_topic']}")

            # Verdict must lead in narrative
            self.assertTrue(
                any(vw in narrative for vw in expected_verdict_words),
                f"[{lang_label}] Expected direct verdict in narrative, got: {narrative}"
            )


if __name__ == "__main__":
    unittest.main()
