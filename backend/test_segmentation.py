from core.segmentation import segment_subtitles

def test_long_sentence():
    # "Ошибка, которую совершает, наверное, 90 % всех изучающих"
    # Simulated word data
    words = [
        {"word": "Ошибка,", "start": 0.0, "end": 0.5},
        {"word": "которую", "start": 0.5, "end": 1.0},
        {"word": "совершает,", "start": 1.0, "end": 1.5},
        {"word": "наверное,", "start": 1.5, "end": 2.0},
        {"word": "90", "start": 2.0, "end": 2.2},
        {"word": "%", "start": 2.2, "end": 2.4},
        {"word": "всех", "start": 2.4, "end": 2.7},
        {"word": "изучающих", "start": 2.7, "end": 3.5},
    ]

    print("--- Test Long Sentence ---")
    subs = segment_subtitles(words)
    for sub in subs:
        print(f"[{len(sub['text'])} chars] {sub['text']}")

    # "Давайте даю 3 секунды на подумать"
    words2 = [
        {"word": "Давайте", "start": 4.0, "end": 4.5},
        {"word": "даю", "start": 4.5, "end": 5.0},
        {"word": "3", "start": 5.0, "end": 5.2},
        {"word": "секунды", "start": 5.2, "end": 5.8},
        {"word": "на", "start": 5.8, "end": 6.0},
        {"word": "подумать", "start": 6.0, "end": 7.0},
    ]
    print("\n--- Test Preposition Sentence ---")
    subs2 = segment_subtitles(words2)
    for sub in subs2:
        print(f"[{len(sub['text'])} chars] {sub['text']}")

if __name__ == "__main__":
    test_long_sentence()
