/**
 * Remotion-Only Video Composition Template
 * 
 * For videos that use typography + icons instead of Manim animations.
 * Uses center-aligned layouts and smooth fade/scale animations.
 */

import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { Icon } from "@iconify/react";
import { loadFont } from "@remotion/google-fonts/Outfit";

const { fontFamily } = loadFont();

// ============================================================================
// COLOR PALETTE - Apple-inspired dark theme
// ============================================================================

const colors = {
  bg: "#000000",
  text: "#ffffff",
  accent: "#0a84ff",    // Blue
  success: "#30d158",   // Green
  error: "#ff453a",     // Red
  warning: "#ffd60a",   // Yellow
  dim: "#86868b",       // Gray text
  dimmer: "#48484a",    // Darker gray
};

const FPS = 30;

// ============================================================================
// TIMING CONFIGURATION
// Update these based on your TTS audio durations
// ============================================================================

const TIMING = {
  hook: { start: 0, duration: 5 },
  problem: { start: 5, duration: 12 },
  flip: { start: 17, duration: 5 },
  solution: { start: 22, duration: 15 },
  punchline: { start: 37, duration: 8 },
};

// ============================================================================
// ANIMATION COMPONENTS
// ============================================================================

/**
 * Fade in with upward motion and blur
 * Use for text elements
 */
const FadeInUp = ({ 
  children, 
  delay = 0, 
  style = {} 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(progress, [0, 1], [60, 0], { extrapolateRight: "clamp" });
  const blur = interpolate(progress, [0, 1], [10, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        filter: `blur(${blur}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Scale in animation
 * Use for icons and emphasis elements
 */
const ScaleIn = ({ 
  children, 
  delay = 0,
  style = {}
}: { 
  children: React.ReactNode; 
  delay?: number;
  style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const scale = interpolate(progress, [0, 1], [0.5, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ transform: `scale(${scale})`, opacity, ...style }}>
      {children}
    </div>
  );
};

// ============================================================================
// BASE SCENE WRAPPER
// ALWAYS use justifyContent: "center" - never "flex-start"
// ============================================================================

const SceneWrapper = ({ children }: { children: React.ReactNode }) => (
  <AbsoluteFill
    style={{
      background: colors.bg,
      fontFamily,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",  // ← CRITICAL: Always center
      alignItems: "center",
      padding: 60,
    }}
  >
    {children}
  </AbsoluteFill>
);

// ============================================================================
// SCENE TEMPLATES
// ============================================================================

/**
 * Quote Scene - Big quote with attribution
 */
const QuoteScene = () => (
  <SceneWrapper>
    <FadeInUp delay={0}>
      <div style={{ 
        fontSize: 200, 
        color: colors.dimmer, 
        lineHeight: 0.5,
        marginBottom: -40,
      }}>
        "
      </div>
    </FadeInUp>

    <FadeInUp delay={10} style={{ textAlign: "center" }}>
      <div style={{ 
        fontSize: 64, 
        fontWeight: 700, 
        color: colors.text,
        lineHeight: 1.2,
        maxWidth: 900,
      }}>
        Your quote text here
      </div>
    </FadeInUp>

    <FadeInUp delay={50} style={{ marginTop: 60 }}>
      <div style={{ 
        fontSize: 28, 
        color: colors.dim,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <Icon icon="ph:user-circle-duotone" width={32} />
        Attribution
      </div>
    </FadeInUp>
  </SceneWrapper>
);

/**
 * Icon Cards Scene - Show a concept with icon + label
 */
const IconCardsScene = () => (
  <SceneWrapper>
    <FadeInUp delay={0}>
      <div style={{ 
        fontSize: 42, 
        fontWeight: 600, 
        color: colors.text,
        textAlign: "center",
        marginBottom: 80,
      }}>
        Section title with <span style={{ color: colors.error }}>emphasis</span>
      </div>
    </FadeInUp>

    {/* Card 1 */}
    <FadeInUp delay={30} style={{ width: "100%" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        marginBottom: 40,
        padding: 40,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 24,
      }}>
        <Icon icon="ph:code-duotone" width={80} color={colors.dim} />
        <Icon icon="ph:arrow-right-bold" width={40} color={colors.dimmer} />
        <Icon icon="ph:robot-duotone" width={80} color={colors.accent} />
        <div style={{ fontSize: 28, color: colors.dim, marginLeft: 20 }}>
          Label
        </div>
      </div>
    </FadeInUp>

    {/* Card 2 */}
    <FadeInUp delay={90} style={{ width: "100%" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: 40,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 24,
      }}>
        <Icon icon="ph:lightbulb-duotone" width={80} color={colors.dim} />
        <Icon icon="ph:arrow-right-bold" width={40} color={colors.dimmer} />
        <Icon icon="ph:sparkle-duotone" width={80} color={colors.success} />
        <div style={{ fontSize: 28, color: colors.dim, marginLeft: 20 }}>
          Label
        </div>
      </div>
    </FadeInUp>
  </SceneWrapper>
);

/**
 * Two Options Scene - Compare two choices
 */
const TwoOptionsScene = () => (
  <SceneWrapper>
    <FadeInUp delay={0}>
      <div style={{ fontSize: 32, color: colors.dim, marginBottom: 60 }}>
        The question:
      </div>
    </FadeInUp>

    {/* Option A */}
    <FadeInUp delay={30} style={{ width: "100%", marginBottom: 40 }}>
      <div style={{
        padding: 50,
        background: `linear-gradient(135deg, rgba(255,214,10,0.1) 0%, rgba(255,214,10,0.02) 100%)`,
        borderRadius: 32,
        border: `2px solid ${colors.warning}`,
      }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: colors.warning, marginBottom: 16 }}>
          Option A
        </div>
        <div style={{ 
          fontSize: 28, 
          color: colors.dim,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <Icon icon="ph:x-circle-duotone" width={32} color={colors.error} />
          Downside
        </div>
      </div>
    </FadeInUp>

    {/* OR */}
    <FadeInUp delay={90}>
      <div style={{ fontSize: 36, color: colors.dimmer, margin: "20px 0" }}>or</div>
    </FadeInUp>

    {/* Option B */}
    <FadeInUp delay={120} style={{ width: "100%", marginTop: 20 }}>
      <div style={{
        padding: 50,
        background: `linear-gradient(135deg, rgba(48,209,88,0.1) 0%, rgba(48,209,88,0.02) 100%)`,
        borderRadius: 32,
        border: `2px solid ${colors.success}`,
      }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: colors.success, marginBottom: 16 }}>
          Option B
        </div>
        <div style={{ 
          fontSize: 28, 
          color: colors.dim,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <Icon icon="ph:check-circle-duotone" width={32} color={colors.success} />
          Benefit
        </div>
      </div>
    </FadeInUp>

    {/* Conclusion */}
    <FadeInUp delay={200} style={{ marginTop: 60 }}>
      <div style={{ fontSize: 36, fontWeight: 600, color: colors.text, textAlign: "center" }}>
        Neither is wrong.
        <br />
        <span style={{ color: colors.accent }}>Knowing which one matters.</span>
      </div>
    </FadeInUp>
  </SceneWrapper>
);

/**
 * Simple Statement Scene - Bold text with icon
 */
const StatementScene = () => (
  <SceneWrapper>
    <FadeInUp delay={0}>
      <div style={{ fontSize: 36, color: colors.dim, marginBottom: 40 }}>
        But then...
      </div>
    </FadeInUp>

    <FadeInUp delay={20}>
      <div style={{ 
        fontSize: 72, 
        fontWeight: 800, 
        color: colors.text,
        textAlign: "center",
        lineHeight: 1.2,
      }}>
        Something changes.
      </div>
    </FadeInUp>

    <FadeInUp delay={50} style={{ marginTop: 80 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "24px 48px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 100,
      }}>
        <Icon icon="ph:heart-duotone" width={48} color={colors.error} />
        <span style={{ fontSize: 32, color: colors.text }}>
          They find the joy
        </span>
      </div>
    </FadeInUp>
  </SceneWrapper>
);

/**
 * Punchline Scene - Final takeaway
 */
const PunchlineScene = () => (
  <SceneWrapper>
    <ScaleIn delay={0}>
      <Icon icon="ph:wrench-duotone" width={120} color={colors.accent} />
    </ScaleIn>

    <FadeInUp delay={20} style={{ marginTop: 60 }}>
      <div style={{ fontSize: 48, fontWeight: 600, color: colors.text, textAlign: "center" }}>
        The tool is the same.
      </div>
    </FadeInUp>

    <FadeInUp delay={60} style={{ marginTop: 40 }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: colors.accent, textAlign: "center" }}>
        The value is different.
      </div>
    </FadeInUp>

    <FadeInUp delay={100} style={{ marginTop: 100 }}>
      <div style={{ 
        fontSize: 24, 
        color: colors.dimmer,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <Icon icon="ph:link-simple" width={24} />
        yoursite.com
      </div>
    </FadeInUp>
  </SceneWrapper>
);

// ============================================================================
// MAIN COMPOSITION
// ============================================================================

export const VideoComposition = () => {
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Audio src={staticFile("narration.mp3")} />

      <Sequence from={Math.floor(TIMING.hook.start * FPS)} durationInFrames={Math.ceil(TIMING.hook.duration * FPS)}>
        <QuoteScene />
      </Sequence>

      <Sequence from={Math.floor(TIMING.problem.start * FPS)} durationInFrames={Math.ceil(TIMING.problem.duration * FPS)}>
        <IconCardsScene />
      </Sequence>

      <Sequence from={Math.floor(TIMING.flip.start * FPS)} durationInFrames={Math.ceil(TIMING.flip.duration * FPS)}>
        <StatementScene />
      </Sequence>

      <Sequence from={Math.floor(TIMING.solution.start * FPS)} durationInFrames={Math.ceil(TIMING.solution.duration * FPS)}>
        <TwoOptionsScene />
      </Sequence>

      <Sequence from={Math.floor(TIMING.punchline.start * FPS)} durationInFrames={Math.ceil(TIMING.punchline.duration * FPS)}>
        <PunchlineScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// ============================================================================
// EXPORT CONFIG
// ============================================================================

export const VIDEO_COMPOSITION_CONFIG = {
  id: "VideoComposition",
  component: VideoComposition,
  durationInFrames: Math.ceil(45 * FPS),  // Adjust to your total duration
  fps: FPS,
  width: 1080,
  height: 1920,  // Portrait for LinkedIn
};

/**
 * USAGE:
 * 
 * 1. Update TIMING object with your TTS audio segment durations
 * 2. Customize scene components with your content
 * 3. Generate combined narration.mp3:
 *    ffmpeg -f concat -safe 0 -i concat.txt -c copy public/narration.mp3
 * 4. Preview: npm run dev
 * 5. Render: npx remotion render VideoComposition out/video.mp4
 * 
 * ICONS: Browse at https://icon-sets.iconify.design/ph/
 * Use duotone variants: "ph:icon-name-duotone"
 */
