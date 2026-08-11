"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDeletedOrUnavailableTrack = isDeletedOrUnavailableTrack;
exports.estimateTrackHeuristics = estimateTrackHeuristics;
/**
 * Helper function to check if a track title or artist represents a deleted, private,
 * or unavailable video/track on YouTube or Spotify.
 */
function isDeletedOrUnavailableTrack(title, artist, videoId) {
    if (!title || !title.trim())
        return true;
    const cleanTitle = title.toLowerCase().trim();
    const cleanArtist = (artist || '').toLowerCase().trim();
    const deletedTitles = [
        'deleted video',
        'private video',
        'this video is unavailable',
        'this video is private',
        'video unavailable',
        'unknown title',
        'unavailable video',
    ];
    if (deletedTitles.includes(cleanTitle)) {
        return true;
    }
    if (cleanTitle.includes('deleted video') ||
        cleanTitle.includes('private video') ||
        cleanTitle.includes('video is unavailable') ||
        cleanTitle.includes('video unavailable')) {
        return true;
    }
    if (cleanArtist === 'unknown artist' &&
        (cleanTitle === 'unknown' || cleanTitle === '' || cleanTitle.includes('deleted') || cleanTitle.includes('private'))) {
        return true;
    }
    return false;
}
/**
 * Heuristic fallback when Gemini AI is offline or quota is exceeded.
 */
function estimateTrackHeuristics(title, artist, tags = []) {
    const text = `${title} ${artist} ${tags.join(' ')}`.toLowerCase();
    let bpm = 120;
    let intensity = 0.5;
    let review = 'Balanced musical style with steady rhythm and clean production.';
    // High intensity keywords
    if (/\b(phonk|drift|hardstyle|metal|rock|drill|trap|gym|workout|heavy|dubstep|bass|remix|speed up|sped up|aggressive|hype)\b/i.test(text)) {
        intensity = 0.85;
        bpm = 145;
        review = 'High energy, aggressive rhythm, heavy bass line, intense driving dynamics.';
    }
    // Chill / Low intensity keywords
    else if (/\b(lofi|lo-fi|chill|sleep|study|ambient|piano|acoustic|slowed|reverb|floating|dreamy|relax|smooth|meditation|night|relaxing)\b/i.test(text)) {
        intensity = 0.25;
        bpm = 85;
        review = 'Smooth, atmospheric, relaxed floating vibe with soft warm instruments.';
    }
    // Upbeat / Pop / Electronic keywords
    else if (/\b(dance|house|synth|funk|disco|pop|upbeat|party|groove|club|electro)\b/i.test(text)) {
        intensity = 0.65;
        bpm = 128;
        review = 'Upbeat dance rhythm with catchy synth lines and driving bassline.';
    }
    return {
        estimated_bpm: bpm,
        intensity_score: intensity,
        vibe_review: review,
    };
}
