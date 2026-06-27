#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Generate batch import JSON for microeconomics questions.
This creates a JSON payload that can be sent to the admin API for batch import.
"""

import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

def parse_sql_file(filepath):
    """Parse the seed-econ-new.sql file to extract questions."""
    questions = []

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line.startswith('INSERT INTO questions'):
                continue

            # Extract VALUES part
            values_match = line.split("VALUES (", 1)
            if len(values_match) < 2:
                continue

            values_str = values_match[1].rstrip(');')

            # Parse the values - this is tricky with nested JSON
            # Let's use a simpler approach: extract by field
            try:
                # Find question_id
                qid_start = values_str.find("'") + 1
                qid_end = values_str.find("'", qid_start)
                question_id = values_str[qid_start:qid_end]

                # Find stem
                stem_start = values_str.find("'", qid_end + 3) + 1
                stem_end = values_str.find("'", stem_start)
                stem = values_str[stem_start:stem_end]

                # Find options (JSON array)
                opt_start = values_str.find("'[", stem_end) + 1
                # Find the matching closing bracket
                bracket_count = 0
                i = opt_start
                while i < len(values_str):
                    if values_str[i] == '[':
                        bracket_count += 1
                    elif values_str[i] == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            break
                    i += 1
                opt_end = i + 2  # Include the closing ']
                options_str = values_str[opt_start:opt_end - 1]
                options = json.loads(options_str.replace("''", "'"))

                # Find answer
                ans_start = values_str.find("'", opt_end + 2) + 1
                ans_end = values_str.find("'", ans_start)
                answer = values_str[ans_start:ans_end]

                # Find explanation
                exp_start = values_str.find("'", ans_end + 3) + 1
                exp_end = values_str.find("'", exp_start)
                explanation = values_str[exp_start:exp_end]

                # Find question_type
                type_start = values_str.find("'", exp_end + 3) + 1
                type_end = values_str.find("'", type_start)
                question_type = values_str[type_start:type_end]

                questions.append({
                    'question_id': question_id,
                    'stem': stem,
                    'options': options,
                    'answer': answer,
                    'explanation': explanation,
                    'question_type': question_type,
                    'difficulty': 'medium',
                    'knowledge_path': f'微观经济学/{question_id}'
                })
            except Exception as e:
                print(f"Error parsing line: {e}", file=sys.stderr)
                continue

    return questions

def generate_batch_import_payload(questions):
    """Generate JSON payload for admin batch import API."""
    return {
        "questions": [
            {
                "stem": q["stem"],
                "options": q["options"],
                "answer": q["answer"],
                "explanation": q.get("explanation", ""),
                "question_type": q["question_type"],
                "difficulty": q.get("difficulty", "medium"),
                "knowledge_path": q.get("knowledge_path", "")
            }
            for q in questions
        ]
    }

if __name__ == '__main__':
    questions = parse_sql_file(r'C:\Users\C\Desktop\quiz-community\frontend\seed-econ-new.sql')
    print(f"Parsed {len(questions)} questions")

    # Generate batch import payload
    payload = generate_batch_import_payload(questions)

    # Write to file
    output_file = r'C:\Users\C\Desktop\quiz-community\frontend\econ-import.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Generated import payload to {output_file}")
    print(f"File size: {len(json.dumps(payload, ensure_ascii=False))} bytes")

    # Also show curl command
    print("\nTo import via API, run:")
    print(f"curl -X POST https://zkaoyan-app.pages.dev/api/v1/admin/questions_batch_import \\")
    print(f"  -H 'Content-Type: application/json' \\")
    print(f"  -H 'Authorization: Bearer YOUR_TOKEN' \\")
    print(f"  -d @{output_file}")
