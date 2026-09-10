import json
import unittest
from unittest.mock import patch
from pathlib import Path
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.agent_1_intent import agent_1_intent, _llm_extract_intent, NARROW_TOPICS
from agents.agent_7_response import agent_7_response
from pipeline import run_pipeline, _SESSION_STATES


class TestIntentAndMultiTurn(unittest.TestCase):
    def setUp(self):
        _SESSION_STATES.clear()

    def test_criterion_1_timing_llm_path(self):
        """1. Query 'what time should I go fishing near Kochi' -> narrow_topic == 'timing' via LLM path."""
        mock_sarvam_json = json.dumps({
            "location_name": "Kochi",
            "persona": "fisherman",
            "query_type": "fishing",
            "narrow_topic": "timing",
            "time_window": "today",
            "vessel_type": "small fishing boat",
        })

        with patch("agents.agent_1_intent.sarvam_chat_completion", return_value=mock_sarvam_json):
            intent = agent_1_intent("what time should I go fishing near Kochi")
            self.assertTrue(intent["llm_used"], "LLM path should be marked as used")
            self.assertEqual(intent["narrow_topic"], "timing")
            self.assertEqual(intent["query_type"], "fishing")
            self.assertIsNotNone(intent["location"])
            self.assertIn("Kochi", intent["location"]["name"])

    def test_criterion_2_hazards_llm_path(self):
        """2. Query 'any hazards near Chennai' -> narrow_topic == 'hazards' via LLM path."""
        mock_sarvam_json = json.dumps({
            "location_name": "Chennai",
            "persona": "fisherman",
            "query_type": "safety",
            "narrow_topic": "hazards",
            "time_window": "today",
            "vessel_type": "small fishing boat",
        })

        with patch("agents.agent_1_intent.sarvam_chat_completion", return_value=mock_sarvam_json):
            intent = agent_1_intent("any hazards near Chennai")
            self.assertTrue(intent["llm_used"], "LLM path should be marked as used")
            self.assertEqual(intent["narrow_topic"], "hazards")
            self.assertEqual(intent["query_type"], "safety")
            self.assertIsNotNone(intent["location"])
            self.assertIn("Chennai", intent["location"]["name"])

    def test_criterion_3_intent_summary_in_agent_7_response(self):
        """3. agent_7_response(...) output includes a populated intentSummary block matching input intent."""
        intent = {
            "persona": "fisherman",
            "query_type": "marine_conditions",
            "narrow_topic": "wind_speed",
            "location": {"name": "Kochi, Kerala", "latitude": 9.93, "longitude": 76.26},
            "is_coastal": True,
            "vessel_type": "small fishing boat",
            "time_window": "today",
        }
        weather = {"status": "ok", "wind_speed_kmh": 18.5, "source": "Open-Meteo"}
        ocean = {"status": "ok"}
        risk = {"status": "SAFE"}

        res = agent_7_response(intent, weather, ocean, risk)
        self.assertIn("intentSummary", res)
        summary = res["intentSummary"]
        self.assertEqual(summary["persona"], "fisherman")
        self.assertEqual(summary["domain"], "marine_conditions")
        self.assertEqual(summary["topic"], "wind_speed")
        self.assertEqual(summary["location"], "Kochi, Kerala")

    def test_test_a_location_follow_up_kavaratti(self):
        """Test A (Task 3 — location follow-up):
        Turn 1: 'Kavaratti me mausam kesa hai?' -> resolves Kavaratti, narrow_topic=weather.
        Turn 2: 'Kya me waha fishing ke liye jaa sakta hu?' with UI sending default location 'Kochi, Kerala'
                -> must resolve to Kavaratti, query_type=safety, and geofence checked against Kavaratti.
        """
        session_id = "test_session_kavaratti_followup"

        # Turn 1
        turn1 = run_pipeline(
            "Kavaratti me mausam kesa hai?",
            context_location="Kochi, Kerala",
            session_id=session_id,
        )
        intent1 = turn1["agents"]["intent"]
        self.assertIsNotNone(intent1["location"])
        self.assertIn("Kavaratti", intent1["location"]["name"])
        self.assertEqual(intent1["narrow_topic"], "weather")

        # Turn 2: 'waha' pronoun reference with UI default location 'Kochi, Kerala'
        turn2 = run_pipeline(
            "Kya me waha fishing ke liye jaa sakta hu?",
            context_location="Kochi, Kerala",
            session_id=session_id,
        )
        intent2 = turn2["agents"]["intent"]
        self.assertIsNotNone(intent2["location"], "Location must resolve")
        self.assertIn("Kavaratti", intent2["location"]["name"], "Must resolve to Kavaratti, not Kochi/default")
        self.assertNotIn("Kochi", intent2["location"]["name"])
        self.assertEqual(intent2["query_type"], "safety")

        # Confirm coordinates are near Kavaratti (lat ~10.56, lon ~72.64), not Kochi (~9.93, ~76.26)
        lat = intent2["location"]["latitude"]
        lon = intent2["location"]["longitude"]
        self.assertAlmostEqual(lat, 10.5669, delta=0.5)
        self.assertAlmostEqual(lon, 72.6420, delta=0.5)

        # Geofence check should NOT have Vembanad (Kochi)
        geofence = turn2["agents"]["geofence"]
        if geofence and geofence.get("inside_restricted_zone"):
            self.assertNotIn("Vembanad", geofence.get("zone_name", ""))

    def test_test_b_query_type_can_i_go_fishing(self):
        """Test B (Task 4 — query_type):
        'Kya me kavaratti me fishing ke liye jaa sakta hu?' -> query_type=safety,
        and reply's first sentence is a direct verdict (not generic marine_conditions).
        """
        # Test with LLM path (mocked Sarvam)
        mock_sarvam_json = json.dumps({
            "location_name": "Kavaratti",
            "persona": "fisherman",
            "query_type": "safety",
            "narrow_topic": None,
            "time_window": "today",
            "vessel_type": "small fishing boat",
        })
        with patch("agents.agent_1_intent.sarvam_chat_completion", return_value=mock_sarvam_json):
            intent_llm = agent_1_intent("Kya me kavaratti me fishing ke liye jaa sakta hu?")
            self.assertTrue(intent_llm["llm_used"])
            self.assertEqual(intent_llm["query_type"], "safety")
            self.assertIsNone(intent_llm["narrow_topic"])
            self.assertIn("Kavaratti", intent_llm["location"]["name"])

        # Test with regex fallback path
        with patch("agents.agent_1_intent.sarvam_chat_completion", return_value=None):
            intent_regex = agent_1_intent("Kya me kavaratti me fishing ke liye jaa sakta hu?")
            self.assertFalse(intent_regex["llm_used"])
            self.assertEqual(intent_regex["query_type"], "safety")
            self.assertIsNone(intent_regex["narrow_topic"])
            self.assertIn("Kavaratti", intent_regex["location"]["name"])

    def test_test_c_ux_verdict_lead_sentence(self):
        """Test C (Task 5 — UX):
        For any safety query_type reply, assert first sentence contains one of:
        'Yes,', 'No,', 'Proceed with caution', 'not safe'.
        """
        location = {"name": "Kavaratti, Lakshadweep", "latitude": 10.5669, "longitude": 72.6420}
        weather = {"status": "ok", "wave_height_m": 1.2, "wind_speed_kmh": 15.0, "swell_period_s": 8.0}
        ocean = {"status": "ok"}

        # 1. SAFE status
        intent_safe = {"query_type": "safety", "location": location, "persona": "fisherman"}
        risk_safe = {"status": "SAFE", "reasons": []}
        res_safe = agent_7_response(intent_safe, weather, ocean, risk_safe)
        narrative_safe = res_safe["decisionOutput"]["narrative"]
        first_sent_safe = narrative_safe.split(".")[0]
        self.assertTrue(
            any(k in first_sent_safe for k in ["Yes,", "Proceed with caution", "not safe", "No,"]),
            f"Expected verdict in first sentence, got: {first_sent_safe}"
        )

        # 2. CAUTION status
        risk_caution = {"status": "CAUTION", "reasons": ["wind speeds approaching 30 km/h"]}
        res_caution = agent_7_response(intent_safe, weather, ocean, risk_caution)
        narrative_caution = res_caution["decisionOutput"]["narrative"]
        first_sent_caution = narrative_caution.split(".")[0]
        self.assertTrue(
            any(k in first_sent_caution for k in ["Yes,", "Proceed with caution", "not safe", "No,"]),
            f"Expected verdict in first sentence, got: {first_sent_caution}"
        )

        # 3. UNSAFE status
        risk_unsafe = {"status": "UNSAFE", "reasons": ["high wave warnings over 3.0 m"]}
        res_unsafe = agent_7_response(intent_safe, weather, ocean, risk_unsafe)
        narrative_unsafe = res_unsafe["decisionOutput"]["narrative"]
        first_sent_unsafe = narrative_unsafe.split(".")[0]
        self.assertTrue(
            any(k in first_sent_unsafe for k in ["Yes,", "Proceed with caution", "not safe", "No,"]),
            f"Expected verdict in first sentence, got: {first_sent_unsafe}"
        )

    def test_explicit_override_over_carry_over(self):
        """Turn 1 mentions Kavaratti. Turn 2 explicitly says 'now for Chennai instead' -> resolves to Chennai."""
        session_id = "test_session_override"
        turn1 = run_pipeline("Kavaratti me mausam kesa hai?", session_id=session_id)
        self.assertIn("Kavaratti", turn1["agents"]["intent"]["location"]["name"])

        turn2 = run_pipeline("now for Chennai instead", session_id=session_id)
        intent2 = turn2["agents"]["intent"]
        self.assertIsNotNone(intent2["location"])
        self.assertIn("Chennai", intent2["location"]["name"])
        self.assertNotIn("Kavaratti", intent2["location"]["name"])


if __name__ == "__main__":
    unittest.main()
