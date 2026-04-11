# Background Music

Add calm ambient music that ducks (lowers volume) when voiceover plays.

## Free Music Sources (CC0 / Royalty-Free)

| Source | License | Notes |
|--------|---------|-------|
| [Freesound](https://freesound.org/search/?f=license%3A%22Creative+Commons+0%22) | CC0 | Filter by "Creative Commons 0" |
| [Pixabay Music](https://pixabay.com/music/) | Pixabay License | Free for commercial, no attribution required |
| [Free Music Archive](https://freemusicarchive.org/) | Various CC | Check license per track |
| [YouTube Audio Library](https://studio.youtube.com/channel/audio) | Free | Requires YouTube account |
| [Uppbeat](https://uppbeat.io/) | Free tier | 3 downloads/month free |

**Recommended search terms:**
- "calm ambient loop"
- "corporate background"
- "minimal electronic"
- "soft piano"
- "lo-fi background"

## Implementation in Remotion

### Basic Background Music

```tsx
import { Audio, staticFile, Sequence, useCurrentFrame, interpolate } from 'remotion';

// Simple background music (constant low volume)
<Audio 
  src={staticFile('background-music.mp3')} 
  volume={0.15}  // 15% volume - subtle
/>
```

### Volume Ducking (Recommended)

Lower music volume when voiceover is playing:

```tsx
const BackgroundMusic: React.FC<{ voiceoverSegments: Array<{start: number, end: number}> }> = ({ 
  voiceoverSegments 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Check if any voiceover is currently playing
  const isVoiceoverPlaying = voiceoverSegments.some(
    seg => frame >= seg.start && frame <= seg.end
  );
  
  // Duck to 10% when voice plays, 30% otherwise
  const targetVolume = isVoiceoverPlaying ? 0.1 : 0.3;
  
  // Smooth transition (fade over 0.3 seconds)
  const volume = (f: number) => {
    const segmentStart = voiceoverSegments.find(seg => f >= seg.start && f <= seg.end);
    if (segmentStart) {
      // Fade down when voice starts
      return interpolate(
        f,
        [segmentStart.start, segmentStart.start + fps * 0.3],
        [0.3, 0.1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
    }
    // Fade up when voice ends
    const justEnded = voiceoverSegments.find(
      seg => f > seg.end && f <= seg.end + fps * 0.5
    );
    if (justEnded) {
      return interpolate(
        f,
        [justEnded.end, justEnded.end + fps * 0.3],
        [0.1, 0.3],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
    }
    return 0.3;
  };
  
  return (
    <Audio 
      src={staticFile('background-music.mp3')} 
      volume={volume}
      loop
    />
  );
};
```

### Simpler Approach: Frame-Based Ducking

```tsx
const DuckingBackgroundMusic: React.FC = () => {
  // Define voiceover timing (frame ranges)
  const VOICEOVER_FRAMES = [
    { start: 0, end: 280 },      // segment 1
    { start: 327, end: 430 },    // segment 2
    { start: 447, end: 710 },    // segment 3
    // ... add all segments
  ];

  const getVolume = (frame: number) => {
    const DUCK_VOLUME = 0.08;   // When voice plays
    const NORMAL_VOLUME = 0.25; // When no voice
    const FADE_FRAMES = 10;     // Transition duration

    for (const seg of VOICEOVER_FRAMES) {
      // During voiceover
      if (frame >= seg.start + FADE_FRAMES && frame <= seg.end - FADE_FRAMES) {
        return DUCK_VOLUME;
      }
      // Fade in to duck
      if (frame >= seg.start && frame < seg.start + FADE_FRAMES) {
        return interpolate(frame, [seg.start, seg.start + FADE_FRAMES], [NORMAL_VOLUME, DUCK_VOLUME]);
      }
      // Fade out from duck
      if (frame > seg.end - FADE_FRAMES && frame <= seg.end) {
        return interpolate(frame, [seg.end - FADE_FRAMES, seg.end], [DUCK_VOLUME, NORMAL_VOLUME]);
      }
    }
    return NORMAL_VOLUME;
  };

  return <Audio src={staticFile('bgm.mp3')} volume={getVolume} loop />;
};
```

## Downloading Music via CLI

### From Freesound (requires account)

```bash
# Get sound ID from URL (e.g., freesound.org/people/user/sounds/12345/)
# Download via curl (after getting download link from website)
curl -o background-music.mp3 "https://freesound.org/data/previews/123/123456_1234567-lq.mp3"
```

### Using yt-dlp for YouTube Audio Library

```bash
# If you have a direct YouTube link to a free track
yt-dlp -x --audio-format mp3 -o "background-music.mp3" "https://youtube.com/watch?v=..."
```

## Volume Guidelines

| Scenario | Music Volume | Notes |
|----------|-------------|-------|
| No voiceover | 25-35% | Fills silence nicely |
| During voiceover | 5-10% | Barely audible, doesn't compete |
| Transitions | Fade over 0.3s | Smooth, not jarring |
| Intro/Outro | 40-50% | Can be more prominent |

## Recommended Music Characteristics

For LinkedIn/professional videos:

- **Tempo**: 70-100 BPM (calm, not distracting)
- **Key**: Major keys feel positive, minor feels contemplative
- **Instrumentation**: Piano, soft synths, light percussion
- **Length**: At least 60s (or loop-able)
- **No lyrics**: Vocals compete with voiceover

## File Placement

```
remotion/public/
├── background-music.mp3    # Main BGM file
├── segment-1-hook.mp3      # Voiceover segments
├── segment-2-problem.mp3
└── ...
```

## Quick Add to Existing Composition

Add this line inside your main composition:

```tsx
<Audio 
  src={staticFile('background-music.mp3')} 
  volume={0.12}
  loop
/>
```

For ducking, wrap it with the volume function approach above.
