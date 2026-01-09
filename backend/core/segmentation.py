from typing import List, Dict

def segment_subtitles(words: List[Dict]) -> List[Dict]:
    """
    Segments a list of words into subtitles with enhanced rules:
    - 18-26 chars target length (30 max)
    - 1.0s - 2.2s duration
    - No hanging prepositions (<= 3 chars at end)
    - No trailing periods (only ? !)
    """
    raw_subtitles = []
    current_segment_words = []
    
    # Constraints
    # Constraints
    MAX_CHARS = 20
    TARGET_CHARS = 12
    MIN_CHARS = 2
    MAX_DURATION = 1.8
    
    def get_segment_text(segment_words):
        return " ".join([w["word"] for w in segment_words])
    
    def get_segment_duration(segment_words):
        if not segment_words:
            return 0
        return segment_words[-1]["end"] - segment_words[0]["start"]

    for i, word in enumerate(words):
        current_segment_words.append(word)
        
        current_text = get_segment_text(current_segment_words)
        current_duration = get_segment_duration(current_segment_words)
        
        next_word = words[i+1] if i + 1 < len(words) else None
        should_break = False
        
        # 1. Hard Constraints
        
        # PRIORITY: Sentence Boundary (Strict)
        # If the word ends with .?!, we MUST break immediately after this word.
        if word["word"][-1] in ".?!":
             should_break = True
             # Mark as forced so we ignore min char limits (e.g. "Yes." -> break)
             forced_break_flag = True
        else:
             forced_break_flag = False

        if len(current_text) > MAX_CHARS:
             should_break = True
        elif current_duration > MAX_DURATION:
             should_break = True
        
        # 2. Soft Constraints
        elif len(current_text) >= 18:
             if word["word"][-1] in ".?!,":
                 should_break = True
             elif next_word and (next_word["start"] - word["end"] > 0.3):
                 should_break = True
             elif len(current_text) >= TARGET_CHARS:
                 should_break = True
        
        # 3. Pause Logic
        elif next_word and (next_word["start"] - word["end"] > 1.0):
             should_break = True

        if should_break:
            # Min length check (unless forced)
            forced_break = forced_break_flag or (len(current_text) > MAX_CHARS) or (current_duration > MAX_DURATION)
            if len(current_text) < MIN_CHARS and not forced_break:
                if next_word and (next_word["start"] - word["end"] > 1.5):
                    pass
                elif next_word is None:
                    pass
                else:
                    continue 

            raw_subtitles.append({
                "start": current_segment_words[0]["start"],
                "end": current_segment_words[-1]["end"],
                "text": current_text,
                "words": current_segment_words # Keep raw words for post-processing
            })
            current_segment_words = []

    if current_segment_words:
        raw_subtitles.append({
            "start": current_segment_words[0]["start"],
            "end": current_segment_words[-1]["end"],
            "text": get_segment_text(current_segment_words),
            "words": current_segment_words
        })

    # --- POST-PROCESSING ---
    
    # 1. Fix Hanging Prepositions
    # Move last word of segment i to segment i+1 if it is a short preposition
    # Iterate backwards to safely move items
    final_subtitles = []
    
    # We convert robust logic:
    # We might need multiple passes or a smarter loop.
    # Simple approach: Check end of Subtitle[i]. If short, pop it and push to Subtitle[i+1].
    # But wait, pushing to next subtitle changes next subtitle's start time and text.
    
    # Let's rebuild the subtitles from the list of words using the "raw_subtitles" breakpoints as a draft,
    # but allowing adjustments.
    
    # Simpler Post-Process:
    # Just iterate through subtitles. If sub[i] ends with short word, move it to sub[i+1].
    
    i = 0
    while i < len(raw_subtitles) - 1:
        current_sub = raw_subtitles[i]
        next_sub = raw_subtitles[i+1]
        
        current_words = current_sub["words"]
        
        if not current_words:
            i += 1
            continue
            
        last_word_obj = current_words[-1]
        last_word_text = last_word_obj["word"].strip(".,?!") # Check clean word
        
        # Rule: <= 3 chars usually implies preposition.
        # BUT: If it ends with .?!, it's a sentence end. DO NOT MOVE IT.
        word_ends_sentence = last_word_obj["word"][-1] in ".?!"
        
        if len(last_word_text) <= 3 and not word_ends_sentence:
            # Move this word to the Next Subtitle
            # 1. Provide it to next sub
            next_sub["words"].insert(0, last_word_obj)
            next_sub["start"] = last_word_obj["start"]
            next_sub["text"] = get_segment_text(next_sub["words"])
            
            # 2. Remove from current sub
            current_sub["words"].pop()
            if current_sub["words"]:
                current_sub["end"] = current_sub["words"][-1]["end"]
                current_sub["text"] = get_segment_text(current_sub["words"])
            else:
                # If current becomes empty, mark for deletion (handle later or just ignore empty text)
                current_sub["text"] = "" 
        
        i += 1

    # Filter out empty and clean punctuation
    cleaned_subtitles = []
    for sub in raw_subtitles:
        if not sub["text"].strip():
            continue
            
        text = sub["text"]
        
        # 2. Punctuation Rule: Never put point at the end of subtitle 
        # (unless it's ?! which carry emotion/intonation).
        # "Если в субтитрах написана 2-ая часть предложения... то тогда в конце мы никогда не ставим точку"
        # Simplest consistent rule: Remove trailing periods. Keep ? and !
        if text.endswith('.'):
            text = text[:-1]
            
        # Also clean up ".." if ASR hallucinated
        if text.endswith('..'):
             text = text.rstrip('.')
             
        cleaned_subtitles.append({
            "start": sub["start"],
            "end": sub["end"],
            "text": text
        })

    return cleaned_subtitles
