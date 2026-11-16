# Landing-page demo clip

`ezads-ad.mp4` plays in the "How EZ Ads works" section
(`client/src/components/WorkflowAdSection.jsx`). Replacing the file updates the
section — no code change required.

## Current file

| File | Specs |
| --- | --- |
| `ezads-ad.mp4` | 10.0 s, 1280×720 (16:9), H.264 / MP4, 2.32 MB, `+faststart`, no audio |
| `ezads-ad-poster.jpg` | Frame at 5 s (54 KB), shown until playback starts |

## Behaviour

- Autoplays muted and loops, but only while the section is on screen; pauses when
  scrolled away
- The poster frame covers the moment before the first frame decodes
- `prefers-reduced-motion`: no autoplay, native controls shown instead
- The five workflow steps are rendered as text below the clip, so the section
  still reads correctly with the video stopped or blocked

## Swapping the clip

Keep it 16:9 and H.264 so Safari and mobile can play it, and aim for a smaller
file — this is a landing page and most visitors are on mobile data. `+faststart`
lets playback begin before the download finishes:

```bash
ffmpeg -i source.mp4 -vf scale=1280:-2 -c:v libx264 -profile:v high -crf 26 \
  -preset slow -movflags +faststart -an ezads-ad.mp4
```

No audio track is needed: playback is muted, because browsers only autoplay
muted video.

## Licensing

Use footage you own or have licensed for commercial use, and keep the proof. If
the clip is AI-generated, check that the provider grants commercial rights.
