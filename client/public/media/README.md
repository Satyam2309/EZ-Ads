# Landing-page advert assets

Drop the produced advert clip here and it plays automatically on the landing
page (`client/src/components/HeroAdVideo.jsx`). No code change is required.

## Required files

| File | Purpose | Notes |
| --- | --- | --- |
| `ezads-ad.mp4` | Main clip (required) | H.264 / AVC, `+faststart` so it starts before fully downloaded |
| `ezads-ad.webm` | Optional smaller alternative | VP9 — served first to browsers that support it |
| `ezads-ad-poster.jpg` | Poster frame | Shown before play, and permanently for reduced-motion users |

## Recommended specs

- **Duration:** 8–15 seconds, and ideally loop seamlessly (first frame ≈ last frame)
- **Resolution:** 1920×1080 (16:9). Provide a 1080×1920 (9:16) variant later if you want a mobile-specific cut
- **Frame rate:** 24–30 fps
- **File size:** aim under 3 MB (~2 Mbps). This is a landing page — most visitors are on mobile data
- **Audio:** none needed. Playback is muted (browsers only allow muted autoplay), so record/export without a soundtrack
- **Content direction:** real-looking people scrolling/using the app on a phone, natural light, no on-screen text (the page already carries the copy)

## Compressing

```bash
# MP4 with faststart (start playing before the whole file downloads)
ffmpeg -i source.mp4 -vf scale=1920:-2 -c:v libx264 -profile:v high -crf 24 \
  -preset slow -movflags +faststart -an ezads-ad.mp4

# WebM alternative
ffmpeg -i source.mp4 -vf scale=1920:-2 -c:v libvpx-vp9 -crf 34 -b:v 0 -an ezads-ad.webm

# Poster frame at ~1s
ffmpeg -i source.mp4 -ss 1 -frames:v 1 -q:v 3 ezads-ad-poster.jpg
```

## How it behaves

- Loads and plays only when the section scrolls into view; pauses when scrolled away
- `preload="none"` until then, so it never competes with the page for bandwidth
- `prefers-reduced-motion`: shows the poster only, with a visible note — no autoplay
- If the files are missing, an owner-facing placeholder explains what to supply instead of rendering a broken player

## Licensing

Use footage you own or have licensed for commercial use, and keep the proof.
If the clip is AI-generated, check that the provider grants commercial rights.
