import json
from pipeline import run_pipeline

def run_tests():
    print("=" * 80)
    print("TEST SUITE: MASTER PROMPT V10 LITERAL REPRODUCTION & COMPOUND TEST")
    print("=" * 80)

    # 1. Literal Reproduction Query Pair at Kochi, Kerala
    session_id = "v10_kochi_reproduction_session"
    kochi_context = "Kochi, Kerala (9.9312, 76.2673)"

    print("\n--- LITERAL REPRODUCTION: TURN 1 ---")
    q1 = "Aaj fishing ke liye mausam kesa rahega?"
    print(f"Query 1: '{q1}' (context: {kochi_context})")
    res1 = run_pipeline(q1, context_location=kochi_context, session_id=session_id)
    dec1 = res1["final_output"]["decisionOutput"]
    print("Headline 1:", dec1.get("headline"))
    print("Status 1:  ", dec1.get("status"))
    print("Narrative 1:\n", dec1.get("narrative"))
    print("Recommended Actions 1:\n", dec1.get("recommendedActions"))

    print("\n--- LITERAL REPRODUCTION: TURN 2 ---")
    q2 = "kya aaj fishing karne jaa sakte hain?"
    print(f"Query 2: '{q2}' (same session)")
    res2 = run_pipeline(q2, context_location=kochi_context, session_id=session_id)
    dec2 = res2["final_output"]["decisionOutput"]
    print("Headline 2:", dec2.get("headline"))
    print("Status 2:  ", dec2.get("status"))
    print("Narrative 2:\n", dec2.get("narrative"))
    print("Recommended Actions 2:\n", dec2.get("recommendedActions"))

    # 2. Four Compound Single-Message Questions
    print("\n" + "=" * 80)
    print("FOUR COMPOUND SINGLE-MESSAGE QUESTIONS")
    print("=" * 80)

    # Compound 1: Weather + Safety (at Kochi, inside MPA)
    c1 = "Aaj mausam kesa hai aur kya main fishing ke liye jaa sakta hoon?"
    print(f"\n[Compound 1: Weather + Safety] Query: '{c1}' (Location: Kochi, Kerala)")
    res_c1 = run_pipeline(c1, context_location="Kochi, Kerala", session_id="c1_session")
    dec_c1 = res_c1["final_output"]["decisionOutput"]
    intent_c1 = res_c1["final_output"].get("intentSummary") or res_c1["agents"]["intent"]
    print("Query Type:     ", intent_c1.get("domain") or intent_c1.get("query_type"))
    print("Compound Topics:", res_c1["agents"]["intent"].get("compound_topics"))
    print("Headline:       ", dec_c1.get("headline"))
    print("Narrative:\n", dec_c1.get("narrative"))

    # Compound 1b: Weather + Safety (at Surat, outside MPA / SAFE)
    c1b = "Aaj mausam kaisa hai aur kya main fishing ke liye jaa sakta hu Surat me?"
    print(f"\n[Compound 1b: Weather + Safety] Query: '{c1b}' (Location: Surat)")
    res_c1b = run_pipeline(c1b, session_id="c1b_session")
    dec_c1b = res_c1b["final_output"]["decisionOutput"]
    intent_c1b = res_c1b["final_output"].get("intentSummary") or res_c1b["agents"]["intent"]
    print("Query Type:     ", intent_c1b.get("domain") or intent_c1b.get("query_type"))
    print("Compound Topics:", res_c1b["agents"]["intent"].get("compound_topics"))
    print("Headline:       ", dec_c1b.get("headline"))
    print("Narrative:\n", dec_c1b.get("narrative"))

    # Compound 2: Weather + PFZ
    c2 = "Aaj mausam kaisa hai aur fishing zone kitna dur hai Surat me?"
    print(f"\n[Compound 2: Weather + PFZ] Query: '{c2}'")
    res_c2 = run_pipeline(c2, session_id="c2_session")
    dec_c2 = res_c2["final_output"]["decisionOutput"]
    print("Compound Topics:", res_c2["agents"]["intent"].get("compound_topics"))
    print("Headline:       ", dec_c2.get("headline"))
    print("Narrative:\n", dec_c2.get("narrative"))

    # Compound 3: Safety + Timing (at Kochi, inside MPA)
    c3 = "Is it safe to fish and what is the best time to go near Kochi?"
    print(f"\n[Compound 3: Safety + Timing] Query: '{c3}'")
    res_c3 = run_pipeline(c3, session_id="c3_session")
    dec_c3 = res_c3["final_output"]["decisionOutput"]
    print("Compound Topics:", res_c3["agents"]["intent"].get("compound_topics"))
    print("Headline:       ", dec_c3.get("headline"))
    print("Narrative:\n", dec_c3.get("narrative"))

    # Compound 4: Hazards + Route (at Kochi, inside MPA)
    c4 = "Are there any hazards and which route is safe from Kochi?"
    print(f"\n[Compound 4: Hazards + Route] Query: '{c4}'")
    res_c4 = run_pipeline(c4, session_id="c4_session")
    dec_c4 = res_c4["final_output"]["decisionOutput"]
    print("Compound Topics:", res_c4["agents"]["intent"].get("compound_topics"))
    print("Headline:       ", dec_c4.get("headline"))
    print("Narrative:\n", dec_c4.get("narrative"))

if __name__ == "__main__":
    run_tests()
