/**
 * Remotion Video Composition Template
 * 
 * Combines Manim video clips with TTS audio segments.
 * Customize scene timings and content for your video.
 */

import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
  Sequence,
  staticFile,
  Video,
  Easing,
} from 'remotion';
import { Audio } from '@remotion/media';
import { loadFont } from '@remotion/google-fonts/SpaceGrotesk';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
});

// ============================================================================
// CONFIGURATION - Update these for your video
// ============================================================================

const FPS = 30;

// Define your scenes with Manim video durations (in seconds)
// Get these by running: ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4
const SCENES = [
  { id: 'hook', manim: 'AgentDebugLoop.mp4', audio: 'segment-1-hook.mp3', duration: 10.9 },
  { id: 'problem', manim: null, audio: 'segment-2-problem.mp3', duration: 4.0 },  // Text-only
  { id: 'solution', manim: 'OldVsNewWorkflow.mp4', audio: 'segment-3-solution.mp3', duration: 10.3 },
  { id: 'result', manim: 'UpstreamDownstream.mp4', audio: 'segment-4-result.mp3', duration: 18.4 },
  { id: 'punchline', manim: 'InputOutputTransform.mp4', audio: 'segment-5-punchline.mp3', duration: 13.5 },
];

// Calculate frame timings
const sceneFrames = SCENES.map((scene, index) => {
  const startFrame = SCENES.slice(0, index).reduce((sum, s) => sum + Math.ceil(s.duration * FPS), 0);
  const durationFrames = Math.ceil(scene.duration * FPS);
  return { ...scene, startFrame, durationFrames };
});

const TOTAL_DURATION = sceneFrames.reduce((sum, s) => sum + s.durationFrames, 0);

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

/**
 * Animated text reveal with fade + slide up
 */
const RevealText: React.FC<{ 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, className = '', style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame - delay, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame - delay, [0, fps * 0.4], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      className={className}
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontFamily,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Background with subtle grid and gradient
 */
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.012) * 0.01 + 1;

  return (
    <>
      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: `scale(${pulse})`,
        }}
      />
      {/* Blue gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.06) 0%, transparent 60%)',
        }}
      />
    </>
  );
};

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

/**
 * Manim video scene - plays a pre-rendered Manim clip
 */
const ManimScene: React.FC<{ videoFile: string; audioFile: string }> = ({ videoFile, audioFile }) => {
  return (
    <AbsoluteFill>
      <Video 
        src={staticFile(videoFile)} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
  );
};

/**
 * Text-only transition scene
 * Customize the content for your video
 */
const TransitionScene: React.FC<{ audioFile: string }> = ({ audioFile }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill 
      className="flex items-center justify-center px-12"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <Background />
      <div className="text-center z-10">
        {/* Customize these lines for your transition */}
        <RevealText delay={0} className="text-4xl font-bold text-red-400 mb-8">
          Three months
        </RevealText>
        <RevealText delay={fps * 0.8} className="text-3xl text-gray-400 mb-12">
          of downstream cleanup.
        </RevealText>
        <RevealText delay={fps * 2} className="text-4xl font-bold text-blue-400">
          Then something changes.
        </RevealText>
      </div>
      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
  );
};

// ============================================================================
// MAIN COMPOSITION
// ============================================================================

export const VideoComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {sceneFrames.map((scene, index) => (
        <Sequence 
          key={scene.id} 
          from={scene.startFrame} 
          durationInFrames={scene.durationFrames}
        >
          {scene.manim ? (
            <ManimScene videoFile={scene.manim} audioFile={scene.audio} />
          ) : (
            <TransitionScene audioFile={scene.audio} />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ============================================================================
// EXPORT CONFIG - Use in Root.tsx
// ============================================================================

export const VIDEO_COMPOSITION_CONFIG = {
  id: 'VideoComposition',
  component: VideoComposition,
  durationInFrames: TOTAL_DURATION,
  fps: FPS,
  width: 1080,
  height: 1920,  // Portrait for LinkedIn. Use 1080 for square.
};

/**
 * Root.tsx usage:
 * 
 * import { VideoComposition, VIDEO_COMPOSITION_CONFIG } from './VideoComposition';
 * 
 * <Composition
 *   id={VIDEO_COMPOSITION_CONFIG.id}
 *   component={VIDEO_COMPOSITION_CONFIG.component}
 *   durationInFrames={VIDEO_COMPOSITION_CONFIG.durationInFrames}
 *   fps={VIDEO_COMPOSITION_CONFIG.fps}
 *   width={VIDEO_COMPOSITION_CONFIG.width}
 *   height={VIDEO_COMPOSITION_CONFIG.height}
 * />
 */
