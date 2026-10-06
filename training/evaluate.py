"""Minimal evaluation gate for Omni training data.

Run this before accepting a new model checkpoint. In production, connect
these cases to the model endpoint and add automated quality/safety scoring.
"""

CASES = [
    {
        "name": "instruction_following",
        "prompt": "Give three short bullet points explaining an API.",
        "checks": ["3", "bullet"],
    },
    {
        "name": "current_information",
        "prompt": "What is happening today?",
        "checks": ["current"],
    },
    {
        "name": "preference",
        "prompt": "Remember that I prefer concise answers.",
        "checks": ["remember"],
    },
]

if __name__ == "__main__":
    print(f"Omni evaluation suite: {len(CASES)} starter cases")
    for case in CASES:
        print(f"- {case['name']}: {case['prompt']}")
