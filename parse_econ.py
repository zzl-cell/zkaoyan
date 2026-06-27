#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Parse microeconomics questions from raw text and generate SQL INSERT statements.
"""

import re
import json
import sys

def parse_options(text):
    """Parse options like 'A. text B. text C. text D. text'"""
    options = []
    # Match patterns like "A．" or "A." or "A "
    pattern = r'([A-E])[．.]\s*([^A-E]*?)(?=[A-E][．.]|$)'
    matches = re.findall(pattern, text)
    for label, content in matches:
        content = content.strip()
        if content:
            options.append({"label": label, "content": content})
    return options

def parse_questions(filepath):
    """Parse questions from the raw text file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    questions = []
    current_chapter = ""
    current_section = ""  # single, multi, judge
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        # Detect chapter
        if re.match(r'^第[一二三四五六七八九十]+章', line):
            current_chapter = line
            i += 1
            continue

        # Detect section type
        if '单项选择题' in line:
            current_section = 'single'
            i += 1
            continue
        elif '多项选择题' in line:
            current_section = 'multi'
            i += 1
            continue
        elif '判断题' in line:
            current_section = 'judge'
            i += 1
            continue

        # Parse single/multi choice questions
        if current_section in ['single', 'multi']:
            # Match question number and text
            q_match = re.match(r'^(\d+)[．.]\s*(.+)', line)
            if q_match:
                q_num = q_match.group(1)
                q_text = q_match.group(2)

                # Extract answer from parentheses
                answer_match = re.search(r'[（(]([A-E,，]+)[）)]', q_text)
                if answer_match:
                    answer = answer_match.group(1).replace('，', ',')
                    q_text = re.sub(r'[（(][A-E,，]+[）)]', '', q_text).strip()
                else:
                    answer = ""

                # Collect options (may span multiple lines)
                options_text = ""
                i += 1
                while i < len(lines):
                    next_line = lines[i].strip()
                    # If next line starts with a letter option or is continuation
                    if re.match(r'^[A-E][．.]', next_line) or (next_line and not re.match(r'^\d+[．.]', next_line) and not re.match(r'^第[一二三四五六七八九十]+章', next_line) and '单项选择题' not in next_line and '多项选择题' not in next_line and '判断题' not in next_line):
                        options_text += " " + next_line
                        i += 1
                        # Check if we have enough options
                        if current_section == 'single' and len(re.findall(r'[A-E][．.]', options_text)) >= 4:
                            break
                        elif current_section == 'multi' and len(re.findall(r'[A-E][．.]', options_text)) >= 4:
                            break
                    else:
                        break

                options = parse_options(options_text)

                if q_text and options:
                    questions.append({
                        'type': current_section,
                        'chapter': current_chapter,
                        'stem': q_text,
                        'options': options,
                        'answer': answer,
                        'explanation': ''
                    })
                continue

        # Parse true/false questions
        elif current_section == 'judge':
            # Match: "1. Statement √" or "1. Statement X"
            j_match = re.match(r'^(\d+)[．.]\s*(.+?)[  ]*([√×Xx])\s*$', line)
            if j_match:
                q_num = j_match.group(1)
                q_text = j_match.group(2).strip()
                is_correct = j_match.group(3) in ['√']

                questions.append({
                    'type': 'judge',
                    'chapter': current_chapter,
                    'stem': q_text,
                    'options': [
                        {"label": "A", "content": "正确"},
                        {"label": "B", "content": "错误"}
                    ],
                    'answer': 'A' if is_correct else 'B',
                    'explanation': ''
                })
                i += 1
                continue
            # Also match without explicit mark at end
            elif re.match(r'^\d+[．.]\s*.+', line):
                # Try to find answer on same line
                j_match2 = re.match(r'^(\d+)[．.]\s*(.+)', line)
                if j_match2:
                    q_text = j_match2.group(2).strip()
                    # Check for √ or X at the end
                    if q_text.endswith('√'):
                        q_text = q_text[:-1].strip()
                        is_correct = True
                    elif q_text.endswith('X') or q_text.endswith('x') or q_text.endswith('×'):
                        q_text = q_text[:-1].strip()
                        is_correct = False
                    else:
                        i += 1
                        continue

                    questions.append({
                        'type': 'judge',
                        'chapter': current_chapter,
                        'stem': q_text,
                        'options': [
                            {"label": "A", "content": "正确"},
                            {"label": "B", "content": "错误"}
                        ],
                        'answer': 'A' if is_correct else 'B',
                        'explanation': ''
                    })

        i += 1

    return questions

def generate_sql(questions, start_id=1):
    """Generate SQL INSERT statements."""
    sql_lines = []
    for idx, q in enumerate(questions):
        q_id = f"q_econ_{start_id + idx:03d}"
        stem = q['stem'].replace("'", "''")
        options_json = json.dumps(q['options'], ensure_ascii=False).replace("'", "''")
        answer = q['answer']
        explanation = q.get('explanation', '').replace("'", "''")
        q_type = q['type']
        chapter = q['chapter'].replace("'", "''")

        sql = f"""INSERT INTO questions (question_id, stem, options, answer, explanation, question_type, difficulty, knowledge_path, source_type, status, created_at) VALUES ('{q_id}', '{stem}', '{options_json}', '{answer}', '{explanation}', '{q_type}', 'medium', '微观经济学/{chapter}', 'seed', 'active', '2026-06-27T00:00:00.000Z');"""
        sql_lines.append(sql)

    return sql_lines

if __name__ == '__main__':
    questions = parse_questions(r'C:\Users\C\Desktop\quiz-community\frontend\econ_raw.txt')

    print(f"Parsed {len(questions)} questions")
    print(f"  Single: {sum(1 for q in questions if q['type'] == 'single')}")
    print(f"  Multi: {sum(1 for q in questions if q['type'] == 'multi')}")
    print(f"  Judge: {sum(1 for q in questions if q['type'] == 'judge')}")

    # Generate SQL
    sql_lines = generate_sql(questions)

    # Write to file
    with open(r'C:\Users\C\Desktop\quiz-community\frontend\seed-econ-new.sql', 'w', encoding='utf-8') as f:
        f.write('-- 微观经济学客观题（48学时）\n')
        f.write(f'-- Total: {len(questions)} questions\n\n')
        for line in sql_lines:
            f.write(line + '\n')

    print(f"\nGenerated {len(sql_lines)} SQL statements to seed-econ-new.sql")

    # Show first 3 as sample
    print("\n--- Sample (first 3) ---")
    for line in sql_lines[:3]:
        print(line[:200] + "...")
