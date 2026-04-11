"""
Manim Scene Templates for LinkedIn Videos

Reusable scene patterns for common visualizations.
Import and customize for your specific video.

Usage:
    manim -ql scenes.py SceneName        # Preview
    manim -qh -r 1080,1920 --fps 30 scenes.py SceneName  # LinkedIn Portrait
"""

from manim import *
import numpy as np

# ============================================================================
# COLOR PALETTE - Never change these
# ============================================================================

DARK_BG = "#0a0a0a"
BLUE_ACCENT = "#3b82f6"
RED_ACCENT = "#ef4444"
GREEN_ACCENT = "#22c55e"
YELLOW_ACCENT = "#eab308"
GRAY_TEXT = "#9ca3af"


# ============================================================================
# BASE SCENE - Inherit from this
# ============================================================================

class BaseScene(Scene):
    """Base scene with dark background and standard setup."""
    
    def construct(self):
        self.camera.background_color = DARK_BG
        self.build()
    
    def build(self):
        """Override this method in subclasses."""
        raise NotImplementedError("Subclasses must implement build()")


# ============================================================================
# PORTRAIT LAYOUT GUIDELINES
# ============================================================================
#
# LinkedIn videos are PORTRAIT (1080x1920, 9:16 aspect ratio).
# Manim's default coordinate system is landscape-oriented.
#
# Default Manim (landscape 16:9):
#   X axis: -7 to 7 (wide)
#   Y axis: -4 to 4 (short)
#
# Portrait 9:16 effective coordinates:
#   X axis: -4 to 4 (narrow)  
#   Y axis: -7 to 7 (tall)
#
# RULES FOR PORTRAIT:
# 1. Stack vertically (UP/DOWN), not horizontally (LEFT/RIGHT)
# 2. Keep elements within x = -3 to 3
# 3. Use full vertical space: y = -6 to 6
# 4. Use smaller fonts (20-42pt vs 24-48pt)
# 5. Use HORIZONTAL dividers, not vertical
# 6. Always render with: manim -qh -r 1080,1920 --fps 30
#
# ============================================================================


# ============================================================================
# TEMPLATE 1: Cycle Flow (Debug Loop, Iteration, etc.) - PORTRAIT OPTIMIZED
# ============================================================================

class CycleFlow(BaseScene):
    """
    Circular flow showing a repeating cycle (PORTRAIT LAYOUT).
    
    Use for: Debug loops, iteration patterns, recurring problems.
    
    Customize:
        - steps: List of step names
        - colors: List of colors for each step
        - title: Title text
        - repeat_count: How many times to show the loop cycling
        - repeat_label: Text showing repetition (e.g., "× 4")
    """
    
    # Configuration - override in subclass or modify directly
    steps = ["Write", "Review", "Bug!", "Fix"]
    colors = [BLUE_ACCENT, GRAY_TEXT, RED_ACCENT, YELLOW_ACCENT]
    title = "The Debug Loop"
    repeat_count = 2
    repeat_label = "× 4"
    
    def build(self):
        # Create circular nodes - SMALLER radius for portrait
        nodes = VGroup()
        radius = 1.5  # Reduced from 2 for portrait
        
        for i, (step, color) in enumerate(zip(self.steps, self.colors)):
            angle = PI/2 - i * (2 * PI / len(self.steps))
            pos = radius * np.array([np.cos(angle), np.sin(angle), 0])
            
            circle = Circle(radius=0.5, color=color, fill_opacity=0.2)  # Smaller circles
            circle.set_stroke(color, width=3)
            circle.move_to(pos)
            
            text = Text(step, font_size=20, color=WHITE)  # Smaller font
            text.move_to(pos)
            
            node = VGroup(circle, text)
            nodes.add(node)
        
        # Create arrows between nodes (clockwise)
        arrows = VGroup()
        for i in range(len(self.steps)):
            start = nodes[i].get_center()
            end = nodes[(i + 1) % len(self.steps)].get_center()
            
            direction = end - start
            direction = direction / np.linalg.norm(direction)
            
            arrow = Arrow(
                start + direction * 0.6,
                end - direction * 0.6,
                color=GRAY_TEXT,
                stroke_width=2,
                buff=0
            )
            arrows.add(arrow)
        
        # Title - positioned for portrait (higher up)
        title_text = Text(self.title, font_size=32, color=WHITE)
        title_text.move_to(UP * 4)  # Portrait: use absolute position
        
        # Animate
        self.play(Write(title_text))
        self.wait(0.5)
        
        for node in nodes:
            self.play(FadeIn(node, scale=0.8), run_time=0.5)
        
        for arrow in arrows:
            self.play(Create(arrow), run_time=0.3)
        
        # Highlight traveling around the loop
        highlight = Circle(radius=0.7, color=YELLOW_ACCENT, stroke_width=4)
        highlight.move_to(nodes[0])
        self.play(Create(highlight))
        
        for _ in range(self.repeat_count):
            for i in range(1, len(self.steps) + 1):
                self.play(
                    highlight.animate.move_to(nodes[i % len(self.steps)]),
                    run_time=0.4
                )
        
        # Repeat label
        if self.repeat_label:
            repeat_text = Text(self.repeat_label, font_size=48, color=RED_ACCENT)
            repeat_text.next_to(nodes, RIGHT, buff=1)
            self.play(Write(repeat_text))
        
        self.wait(1)


# ============================================================================
# TEMPLATE 2: Stacked Comparison (Portrait-Optimized)
# ============================================================================

class SideBySide(BaseScene):
    """
    Stacked comparison of two approaches (PORTRAIT LAYOUT).
    
    NOTE: For portrait videos, this stacks vertically (top/bottom)
    instead of side-by-side (left/right).
    
    Use for: Old vs New, Bad vs Good, Before vs After.
    
    Customize:
        - top_title: Title for top section (was left_title)
        - bottom_title: Title for bottom section (was right_title)
        - top_items: List of items for top section
        - bottom_items: List of items for bottom section
        - top_color: Color for top (usually RED_ACCENT for "bad")
        - bottom_color: Color for bottom (usually GREEN_ACCENT for "good")
        - show_verdict: Whether to show X and checkmark at end
    """
    
    # Aliases for backward compatibility
    left_title = "Old Way"
    right_title = "New Way"
    left_items = ["Write", "Review", "Bug", "Fix"]
    right_items = ["Questions", "Answer", "Verify", "Done ✓"]
    left_color = RED_ACCENT
    right_color = GREEN_ACCENT
    show_verdict = True
    
    @property
    def top_title(self): return self.left_title
    @property
    def bottom_title(self): return self.right_title
    @property
    def top_items(self): return self.left_items
    @property
    def bottom_items(self): return self.right_items
    @property
    def top_color(self): return self.left_color
    @property
    def bottom_color(self): return self.right_color
    
    def build(self):
        # Header
        header = Text("Comparison", font_size=28, color=WHITE)
        header.move_to(UP * 5.5)
        
        # TOP SECTION (was left)
        top_title_text = Text(self.top_title, font_size=26, color=self.top_color)
        top_title_text.move_to(UP * 3.5)
        
        top_box = RoundedRectangle(
            width=5, height=2.5,
            corner_radius=0.2,
            color=self.top_color,
            fill_opacity=0.1
        )
        top_box.set_stroke(self.top_color, width=2)
        top_box.move_to(UP * 1.5)
        
        top_items_group = VGroup()
        for i, step in enumerate(self.top_items[:4]):  # Limit to 4 items
            color = RED_ACCENT if "Bug" in step or "..." in step else GRAY_TEXT
            text = Text(f"• {step}", font_size=18, color=color if color == RED_ACCENT else WHITE)
            top_items_group.add(text)
        top_items_group.arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        top_items_group.move_to(UP * 1.5)
        
        # HORIZONTAL DIVIDER (not vertical!)
        divider = DashedLine(LEFT * 3, RIGHT * 3, color=GRAY_TEXT, dash_length=0.15)
        divider.move_to(DOWN * 0.5)
        
        # BOTTOM SECTION (was right)
        bottom_title_text = Text(self.bottom_title, font_size=26, color=self.bottom_color)
        bottom_title_text.move_to(DOWN * 1.5)
        
        bottom_box = RoundedRectangle(
            width=5, height=2.5,
            corner_radius=0.2,
            color=self.bottom_color,
            fill_opacity=0.1
        )
        bottom_box.set_stroke(self.bottom_color, width=2)
        bottom_box.move_to(DOWN * 3.5)
        
        bottom_items_group = VGroup()
        for i, step in enumerate(self.bottom_items[:4]):  # Limit to 4 items
            color = GREEN_ACCENT if "Done" in step or "✓" in step else BLUE_ACCENT
            text = Text(f"• {step}", font_size=18, color=color if "Done" in step or "✓" in step else WHITE)
            bottom_items_group.add(text)
        bottom_items_group.arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        bottom_items_group.move_to(DOWN * 3.5)
        
        # Footer
        footer = Text("", font_size=24, color=WHITE)
        footer.move_to(DOWN * 6)
        
        # Animate
        self.play(Write(header))
        
        # Top section
        self.play(Write(top_title_text))
        self.play(FadeIn(top_box))
        for item in top_items_group:
            self.play(Write(item), run_time=0.3)
        
        self.play(Create(divider))
        
        # Bottom section
        self.play(Write(bottom_title_text))
        self.play(FadeIn(bottom_box))
        for item in bottom_items_group:
            self.play(Write(item), run_time=0.3)
        
        # Verdict
        if self.show_verdict:
            self.wait(0.5)
            cross = Cross(VGroup(top_box, top_items_group), color=RED_ACCENT, stroke_width=3)
            check = SurroundingRectangle(VGroup(bottom_box, bottom_items_group), 
                                         color=GREEN_ACCENT, buff=0.2, corner_radius=0.2)
            
            self.play(Create(cross))
            self.play(Create(check))
        
        self.wait(1)


# ============================================================================
# TEMPLATE 3: Pipeline with Gate
# ============================================================================

class Pipeline(BaseScene):
    """
    Linear pipeline flow with a gate/checkpoint.
    
    Use for: Upstream/downstream, process flow, verification gates.
    
    Customize:
        - stages: List of stage names
        - gate_position: Index where gate appears (0-based)
        - gate_label: Label for the gate
        - show_blocked: Whether to show items being blocked
    """
    
    stages = ["INPUT", "PROCESS", "OUTPUT"]
    gate_position = 1
    gate_label = "GATE"
    show_blocked = True
    
    def build(self):
        # Pipeline line
        pipe = Line(LEFT * 5.5, RIGHT * 5.5, color=GRAY_TEXT, stroke_width=8)
        
        # Stage boxes
        stage_width = 10 / len(self.stages)
        stage_boxes = VGroup()
        
        for i, stage in enumerate(self.stages):
            x = -5 + stage_width/2 + i * stage_width
            box = RoundedRectangle(
                width=2, height=1,
                corner_radius=0.1,
                color=BLUE_ACCENT if i == 0 else GRAY_TEXT,
                fill_opacity=0.2
            )
            box.set_stroke(BLUE_ACCENT if i == 0 else GRAY_TEXT, width=3)
            text = Text(stage, font_size=20, color=WHITE)
            group = VGroup(box, text)
            group.move_to([x, 0, 0])
            stage_boxes.add(group)
        
        # Gate
        gate_x = -5 + stage_width/2 + self.gate_position * stage_width - stage_width/2
        gate = Rectangle(width=0.3, height=1.5, color=GREEN_ACCENT, fill_opacity=0.8)
        gate.move_to([gate_x, 0, 0])
        gate_label_text = Text(self.gate_label, font_size=16, color=GREEN_ACCENT)
        gate_label_text.next_to(gate, UP, buff=0.2)
        
        # Labels
        upstream = Text("UPSTREAM", font_size=24, color=BLUE_ACCENT)
        upstream.move_to(LEFT * 4 + UP * 1.5)
        downstream = Text("DOWNSTREAM", font_size=24, color=RED_ACCENT)
        downstream.move_to(RIGHT * 3.5 + UP * 1.5)
        
        # Animate base
        self.play(Create(pipe))
        self.play(Write(upstream), Write(downstream))
        
        for box in stage_boxes:
            self.play(FadeIn(box), run_time=0.3)
        
        # Without gate - bugs flow through
        if self.show_blocked:
            title1 = Text("Without gates:", font_size=28, color=RED_ACCENT)
            title1.to_edge(UP)
            self.play(Write(title1))
            
            bugs = VGroup(*[Dot(color=RED_ACCENT, radius=0.15) for _ in range(3)])
            for bug in bugs:
                bug.move_to(LEFT * 5.5)
                self.play(bug.animate.move_to(RIGHT * 5.5), run_time=0.6, rate_func=linear)
            
            self.play(FadeOut(bugs), FadeOut(title1))
        
        # With gate
        title2 = Text("With gates:", font_size=28, color=GREEN_ACCENT)
        title2.to_edge(UP)
        self.play(Write(title2))
        self.play(FadeIn(gate), Write(gate_label_text))
        
        # Items hit gate and transform
        for _ in range(3):
            item = Dot(color=RED_ACCENT, radius=0.15)
            item.move_to(LEFT * 5.5)
            
            self.play(item.animate.move_to([gate_x - 0.3, 0, 0]), run_time=0.4)
            self.play(
                item.animate.set_color(GREEN_ACCENT),
                Flash(gate, color=GREEN_ACCENT),
                run_time=0.3
            )
            self.play(item.animate.move_to(RIGHT * 5.5), run_time=0.4)
        
        self.wait(1)


# ============================================================================
# TEMPLATE 4: Input → Output Transform
# ============================================================================

class InputOutput(BaseScene):
    """
    Shows input transformation to output.
    
    Use for: Before/after, cause/effect, fix demonstrations.
    
    Customize:
        - bad_input: Text for problematic input
        - bad_output: Text for problematic output
        - good_input: Text for correct input
        - good_output: Text for correct output
        - title: Main title
    """
    
    title = "Fix the Input → Output Fixes Itself"
    bad_input = "vague prompt..."
    bad_output = "broken code"
    good_input = "clear context +\nverification gates"
    good_output = "working code ✓"
    
    def build(self):
        # Title
        title_text = Text(self.title, font_size=36, color=WHITE)
        title_text.to_edge(UP, buff=0.8)
        
        # Bad path
        bad_in = Text(self.bad_input, font_size=28, color=RED_ACCENT)
        bad_in.move_to(LEFT * 3 + UP * 1.5)
        
        arrow1 = Arrow(LEFT * 1.5 + UP * 1.5, RIGHT * 1.5 + UP * 1.5, color=GRAY_TEXT)
        
        bad_out = Text(self.bad_output, font_size=28, color=RED_ACCENT)
        bad_out.move_to(RIGHT * 3 + UP * 1.5)
        
        bad_group = VGroup(bad_in, arrow1, bad_out)
        
        # Good path
        good_in = Text(self.good_input, font_size=24, color=GREEN_ACCENT)
        good_in.move_to(LEFT * 3 + DOWN * 1.5)
        
        arrow2 = Arrow(LEFT * 1 + DOWN * 1.5, RIGHT * 1 + DOWN * 1.5, 
                      color=BLUE_ACCENT, stroke_width=4)
        
        good_out = Text(self.good_output, font_size=28, color=GREEN_ACCENT)
        good_out.move_to(RIGHT * 3 + DOWN * 1.5)
        
        good_group = VGroup(good_in, arrow2, good_out)
        
        # Animate
        self.play(Write(title_text))
        self.wait(0.5)
        
        # Bad path
        self.play(Write(bad_in))
        self.play(Create(arrow1))
        self.play(Write(bad_out))
        
        cross = Cross(bad_group, color=RED_ACCENT, stroke_width=3)
        self.play(Create(cross), run_time=0.5)
        
        self.wait(0.5)
        
        # Good path
        self.play(Write(good_in))
        self.play(Create(arrow2))
        self.play(Write(good_out))
        
        box = SurroundingRectangle(good_group, color=GREEN_ACCENT, buff=0.3)
        self.play(Create(box))
        
        # Final emphasis
        final = Text("⚡", font_size=72)
        final.next_to(good_out, RIGHT, buff=0.5)
        self.play(FadeIn(final, scale=2))
        
        self.wait(1)


# ============================================================================
# EXAMPLE: Customized Scene
# ============================================================================

class AgentDebugLoop(CycleFlow):
    """Example: Customize CycleFlow for AI agent debugging."""
    steps = ["Write", "Review", "Bug!", "Fix"]
    colors = [BLUE_ACCENT, GRAY_TEXT, RED_ACCENT, YELLOW_ACCENT]
    title = "The Debug Loop"
    repeat_count = 2
    repeat_label = "× 4"


class OldVsNewWorkflow(SideBySide):
    """Example: Customize SideBySide for workflow comparison."""
    left_title = "Old Way"
    right_title = "New Way"
    left_items = ["Write", "Review", "Bug", "Fix", "Bug", "Fix", "Bug..."]
    right_items = ["Questions", "Answer", "Write", "Verify", "Done ✓"]


class UpstreamDownstream(Pipeline):
    """Example: Customize Pipeline for verification gates."""
    stages = ["INPUT", "OUTPUT"]
    gate_position = 1
    gate_label = "GATE"


class InputOutputTransform(InputOutput):
    """Example: Customize InputOutput for prompt fixing."""
    title = "Fix the Input → Output Fixes Itself"
    bad_input = "vague prompt..."
    bad_output = "broken code"
    good_input = "clear context +\nverification gates"
    good_output = "working code ✓"


# ============================================================================
# RENDER ALL
# ============================================================================

if __name__ == "__main__":
    print("""
Available scenes:
    manim -ql manim_scenes.py CycleFlow
    manim -ql manim_scenes.py SideBySide
    manim -ql manim_scenes.py Pipeline
    manim -ql manim_scenes.py InputOutput
    
Or customized versions:
    manim -ql manim_scenes.py AgentDebugLoop
    manim -ql manim_scenes.py OldVsNewWorkflow
    manim -ql manim_scenes.py UpstreamDownstream
    manim -ql manim_scenes.py InputOutputTransform
    """)
