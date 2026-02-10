"""Tests for core/export.py"""
from core.export import format_timestamp, generate_ass_content


class TestFormatTimestamp:
    def test_zero(self):
        assert format_timestamp(0.0) == "0:00:00.00"

    def test_one_second(self):
        assert format_timestamp(1.0) == "0:00:01.00"

    def test_fractional_seconds(self):
        assert format_timestamp(1.5) == "0:00:01.50"

    def test_one_minute(self):
        assert format_timestamp(60.0) == "0:01:00.00"

    def test_one_hour(self):
        assert format_timestamp(3600.0) == "1:00:00.00"

    def test_complex_time(self):
        # 1h 23m 45.67s
        t = 3600 + 23 * 60 + 45.67
        result = format_timestamp(t)
        assert result == "1:23:45.67"

    def test_centisecond_rounding(self):
        # 99 centiseconds
        result = format_timestamp(0.99)
        assert result == "0:00:00.99"

    def test_centisecond_boundary(self):
        # When rounding to 100 centiseconds, should roll over to next second
        result = format_timestamp(0.999)
        # round(0.999 * 100) = 100 -> rolls to 0cs + 1s
        assert result == "0:00:01.00"

    def test_small_fraction(self):
        result = format_timestamp(0.01)
        assert result == "0:00:00.01"


class TestGenerateAssContentColorConversion:
    def _make_styles(self, text_color="#FFFFFF", outline_color="#000000"):
        return {
            "fontFamily": "Arial",
            "fontSize": 24,
            "textColor": text_color,
            "outlineColor": outline_color,
            "outlineWidth": 2.0,
            "shadowDepth": 2.0,
            "bold": True,
            "uppercase": False,
            "position": {"x": 0, "y": 0},
        }

    def test_white_rgb_to_bgr(self):
        """#FFFFFF -> &HFFFFFF&"""
        styles = self._make_styles(text_color="#FFFFFF")
        content = generate_ass_content([], styles, 1080, 1920)
        assert "&HFFFFFF&" in content

    def test_red_rgb_to_bgr(self):
        """#FF0000 (red RGB) -> &H0000FF& (blue in BGR)"""
        styles = self._make_styles(text_color="#FF0000")
        content = generate_ass_content([], styles, 1080, 1920)
        assert "&H0000FF&" in content

    def test_blue_rgb_to_bgr(self):
        """#0000FF (blue RGB) -> &HFF0000& (red in BGR)"""
        styles = self._make_styles(text_color="#0000FF")
        content = generate_ass_content([], styles, 1080, 1920)
        assert "&HFF0000&" in content

    def test_green_rgb_to_bgr(self):
        """#00FF00 (green) stays &H00FF00&"""
        styles = self._make_styles(text_color="#00FF00")
        content = generate_ass_content([], styles, 1080, 1920)
        assert "&H00FF00&" in content

    def test_outline_color_bgr(self):
        """Outline color should also be converted RGB->BGR."""
        styles = self._make_styles(outline_color="#FF0000")
        content = generate_ass_content([], styles, 1080, 1920)
        # Outline color in BGR: red -> &H0000FF&
        # The content should have this for the OutlineColour field
        assert "&H0000FF&" in content

    def test_custom_color(self):
        """#AABBCC -> BB=middle, so BGR=&HCCBBAA&"""
        styles = self._make_styles(text_color="#AABBCC")
        content = generate_ass_content([], styles, 1080, 1920)
        assert "&HCCBBAA&" in content


class TestGenerateAssContentStructure:
    def _make_styles(self):
        return {
            "fontFamily": "TestFont",
            "fontSize": 48,
            "textColor": "#FFFFFF",
            "outlineColor": "#000000",
            "outlineWidth": 3.0,
            "shadowDepth": 1.0,
            "bold": True,
            "uppercase": False,
            "position": {"x": 0, "y": 0},
        }

    def test_script_info_section(self):
        content = generate_ass_content([], self._make_styles(), 1080, 1920)
        assert "[Script Info]" in content
        assert "ScriptType: v4.00+" in content

    def test_play_resolution(self):
        content = generate_ass_content([], self._make_styles(), 1080, 1920)
        assert "PlayResX: 1080" in content
        assert "PlayResY: 1920" in content

    def test_styles_section(self):
        content = generate_ass_content([], self._make_styles(), 1080, 1920)
        assert "[V4+ Styles]" in content
        assert "Style: Default,TestFont,48" in content

    def test_events_section(self):
        content = generate_ass_content([], self._make_styles(), 1080, 1920)
        assert "[Events]" in content

    def test_font_name_in_style(self):
        styles = self._make_styles()
        styles["fontFamily"] = "MyCustomFont"
        content = generate_ass_content([], styles, 1080, 1920)
        assert "MyCustomFont" in content

    def test_bold_value(self):
        styles = self._make_styles()
        styles["bold"] = True
        content = generate_ass_content([], styles, 1080, 1920)
        # Bold true -> -1 in ASS
        assert ",-1," in content

    def test_not_bold_value(self):
        styles = self._make_styles()
        styles["bold"] = False
        content = generate_ass_content([], styles, 1080, 1920)
        # Bold false -> 0 in ASS
        assert ",0,0,0,0," in content


class TestGenerateAssContentDialogue:
    def _make_styles(self):
        return {
            "fontFamily": "Arial",
            "fontSize": 24,
            "textColor": "#FFFFFF",
            "outlineColor": "#000000",
            "outlineWidth": 2.0,
            "shadowDepth": 2.0,
            "bold": True,
            "uppercase": False,
            "position": {"x": 0, "y": 0},
        }

    def test_dialogue_lines(self):
        subtitles = [
            {"start": 0.0, "end": 1.0, "text": "Hello"},
            {"start": 1.5, "end": 2.5, "text": "World"},
        ]
        content = generate_ass_content(subtitles, self._make_styles(), 1080, 1920)
        assert "Dialogue:" in content
        assert "Hello" in content
        assert "World" in content

    def test_timestamp_format_in_dialogue(self):
        subtitles = [{"start": 0.0, "end": 1.5, "text": "Test"}]
        content = generate_ass_content(subtitles, self._make_styles(), 1080, 1920)
        assert "0:00:00.00" in content
        assert "0:00:01.50" in content

    def test_uppercase_applied(self):
        styles = self._make_styles()
        styles["uppercase"] = True
        subtitles = [{"start": 0.0, "end": 1.0, "text": "hello world"}]
        content = generate_ass_content(subtitles, styles, 1080, 1920)
        assert "HELLO WORLD" in content

    def test_uppercase_not_applied(self):
        styles = self._make_styles()
        styles["uppercase"] = False
        subtitles = [{"start": 0.0, "end": 1.0, "text": "hello world"}]
        content = generate_ass_content(subtitles, styles, 1080, 1920)
        assert "hello world" in content


class TestGenerateAssContentPositioning:
    def test_center_position(self):
        """Position x=0, y=0 should map to center of video."""
        styles = {
            "fontFamily": "Arial",
            "fontSize": 24,
            "textColor": "#FFFFFF",
            "outlineColor": "#000000",
            "outlineWidth": 2.0,
            "shadowDepth": 2.0,
            "bold": True,
            "uppercase": False,
            "position": {"x": 0, "y": 0},
        }
        subtitles = [{"start": 0.0, "end": 1.0, "text": "Test"}]
        content = generate_ass_content(subtitles, styles, 1080, 1920)
        # x = 1080/2 + 0 = 540, y = 1920/2 - 0 = 960
        assert "\\pos(540,960)" in content

    def test_offset_position(self):
        """Position offset should adjust from center."""
        styles = {
            "fontFamily": "Arial",
            "fontSize": 24,
            "textColor": "#FFFFFF",
            "outlineColor": "#000000",
            "outlineWidth": 2.0,
            "shadowDepth": 2.0,
            "bold": True,
            "uppercase": False,
            "position": {"x": 100, "y": -200},
        }
        subtitles = [{"start": 0.0, "end": 1.0, "text": "Test"}]
        content = generate_ass_content(subtitles, styles, 1080, 1920)
        # x = 540 + 100 = 640, y = 960 - (-200) = 1160
        assert "\\pos(640,1160)" in content

    def test_an5_alignment(self):
        """Should use \\an5 alignment (center)."""
        styles = {
            "fontFamily": "Arial",
            "fontSize": 24,
            "textColor": "#FFFFFF",
            "outlineColor": "#000000",
            "outlineWidth": 2.0,
            "shadowDepth": 2.0,
            "bold": True,
            "uppercase": False,
            "position": {"x": 0, "y": 0},
        }
        subtitles = [{"start": 0.0, "end": 1.0, "text": "Test"}]
        content = generate_ass_content(subtitles, styles, 1080, 1920)
        assert "\\an5" in content
