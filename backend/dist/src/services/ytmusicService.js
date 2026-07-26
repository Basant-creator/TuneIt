"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YtMusicService = void 0;
const googleapis_1 = require("googleapis");
const ytmusic_1 = require("../config/ytmusic");
class YtMusicService {
    static instance;
    oauth2Client;
    hasTokens = false;
    constructor() {
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(ytmusic_1.googleConfig.clientId, ytmusic_1.googleConfig.clientSecret, ytmusic_1.googleConfig.redirectUri);
    }
    static getInstance() {
        if (!YtMusicService.instance) {
            YtMusicService.instance = new YtMusicService();
        }
        return YtMusicService.instance;
    }
    /**
     * Helper getter for YouTube API client v3 using active OAuth client.
     */
    getYoutubeClient() {
        return googleapis_1.google.youtube({
            version: 'v3',
            auth: this.oauth2Client,
        });
    }
    /**
     * Guards service methods to ensure an active Google session exists.
     */
    ensureAuthenticated() {
        if (!this.hasTokens) {
            throw new Error('Unauthorized. No active Google session.');
        }
    }
    /**
     * Generates the Google authorize URL with YouTube scopes.
     * offline access_type is required to get a refresh token!
     */
    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/youtube'],
            prompt: 'consent', // Forces Google to show consent screen to ensure refresh token is returned
        });
    }
    /**
     * Exchanges authorization code for tokens and stores them in memory.
     */
    async handleCallback(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            this.hasTokens = true;
            console.log('[YtMusicService] Google OAuth tokens set successfully.');
            return tokens;
        }
        catch (err) {
            console.error('[YtMusicService] Error during Google token exchange:', err?.message || err);
            throw err;
        }
    }
    /**
     * Fetches the user profile details (YouTube Channel info).
     */
    async getUserProfile() {
        this.ensureAuthenticated();
        try {
            const youtube = this.getYoutubeClient();
            console.log('[YtMusicService] Fetching YouTube channel profile...');
            const response = await youtube.channels.list({
                part: ['snippet'],
                mine: true,
            });
            const channel = response.data.items?.[0];
            if (!channel) {
                throw new Error('No YouTube channel associated with this account.');
            }
            return {
                id: channel.id || 'youtube_channel_user',
                display_name: channel.snippet?.title || 'YouTube User',
                email: 'Authenticated Session',
                images: channel.snippet?.thumbnails?.default?.url
                    ? [{ url: channel.snippet.thumbnails.default.url }]
                    : [],
            };
        }
        catch (err) {
            console.error('[YtMusicService] Error fetching YouTube profile:', err?.message || err);
            throw err;
        }
    }
    /**
     * Fetches the playlists owned by the authenticated user.
     */
    async getUserPlaylists() {
        this.ensureAuthenticated();
        try {
            const youtube = this.getYoutubeClient();
            console.log('[YtMusicService] Fetching playlists from YouTube...');
            const response = await youtube.playlists.list({
                part: ['snippet', 'contentDetails'],
                mine: true,
                maxResults: 50,
            });
            const items = (response.data.items || []).map((pl) => ({
                id: pl.id || '',
                name: pl.snippet?.title || 'Untitled Playlist',
                description: pl.snippet?.description || '',
                uri: `youtube:playlist:${pl.id}`,
                images: pl.snippet?.thumbnails
                    ? Object.values(pl.snippet.thumbnails).map((t) => ({ url: t.url }))
                    : [],
                tracks: { total: pl.contentDetails?.itemCount || 0 },
            }));
            return { items };
        }
        catch (err) {
            console.error('[YtMusicService] Error fetching playlists:', err?.message || err);
            throw err;
        }
    }
    /**
     * Fetches the tracks for a given playlist and gets their tags.
     */
    async getPlaylistTracks(playlistId) {
        this.ensureAuthenticated();
        try {
            const youtube = this.getYoutubeClient();
            console.log(`[YtMusicService] Fetching items for playlist: ${playlistId}...`);
            let allItems = [];
            let nextPageToken;
            do {
                const response = await youtube.playlistItems.list({
                    part: ['snippet'],
                    playlistId,
                    maxResults: 50,
                    pageToken: nextPageToken,
                });
                if (response.data.items) {
                    allItems = allItems.concat(response.data.items);
                }
                nextPageToken = response.data.nextPageToken || undefined;
            } while (nextPageToken);
            console.log(`[YtMusicService] Fetched ${allItems.length} total items. Fetching video details...`);
            const videoIds = allItems
                .map((item) => item.snippet?.resourceId?.videoId)
                .filter(Boolean);
            if (videoIds.length === 0)
                return [];
            let allVideos = [];
            // YouTube videos.list maxResults is 50, so chunk videoIds into batches of 50
            const CHUNK_SIZE = 50;
            for (let i = 0; i < videoIds.length; i += CHUNK_SIZE) {
                const chunk = videoIds.slice(i, i + CHUNK_SIZE);
                const videoResponse = await youtube.videos.list({
                    part: ['snippet'],
                    id: chunk,
                });
                if (videoResponse.data.items) {
                    allVideos = allVideos.concat(videoResponse.data.items);
                }
            }
            return allItems.map((item, index) => {
                const videoId = item.snippet?.resourceId?.videoId;
                const video = allVideos.find((v) => v.id === videoId);
                return {
                    videoId,
                    title: item.snippet?.title || 'Unknown Title',
                    artist: item.snippet?.videoOwnerChannelTitle || 'Unknown Artist',
                    tags: video?.snippet?.tags || [],
                    originalIndex: index,
                };
            });
        }
        catch (err) {
            console.error('[YtMusicService] Error fetching playlist tracks:', err?.message || err);
            throw err;
        }
    }
    /**
     * Creates a new playlist on YouTube.
     */
    async createPlaylist(title, description) {
        this.ensureAuthenticated();
        try {
            const youtube = this.getYoutubeClient();
            console.log(`[YtMusicService] Creating playlist "${title}"...`);
            const response = await youtube.playlists.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title: title.trim(),
                        description: description || 'Created and optimized with TuneIt Drift Engine',
                    },
                    status: {
                        privacyStatus: 'private',
                    },
                },
            });
            const playlistId = response.data.id;
            if (!playlistId) {
                throw new Error('Failed to retrieve ID for created playlist.');
            }
            console.log(`[YtMusicService] Playlist created successfully with ID: ${playlistId}`);
            return {
                id: playlistId,
                title: response.data.snippet?.title || title,
                url: `https://music.youtube.com/playlist?list=${playlistId}`,
            };
        }
        catch (err) {
            console.error('[YtMusicService] Error creating playlist:', err?.message || err);
            throw err;
        }
    }
    /**
     * Adds video tracks to an existing playlist in order.
     */
    async addTracksToPlaylist(playlistId, videoIds) {
        this.ensureAuthenticated();
        try {
            const youtube = this.getYoutubeClient();
            console.log(`[YtMusicService] Adding ${videoIds.length} tracks to playlist ${playlistId}...`);
            for (let i = 0; i < videoIds.length; i++) {
                const videoId = videoIds[i];
                try {
                    await youtube.playlistItems.insert({
                        part: ['snippet'],
                        requestBody: {
                            snippet: {
                                playlistId,
                                resourceId: {
                                    kind: 'youtube#video',
                                    videoId,
                                },
                            },
                        },
                    });
                }
                catch (itemErr) {
                    console.error(`[YtMusicService] Failed to add track ${videoId} (index ${i}):`, itemErr?.message || itemErr);
                    // Continue inserting remaining tracks even if one fails
                }
            }
            console.log(`[YtMusicService] Finished inserting tracks into playlist ${playlistId}.`);
        }
        catch (err) {
            console.error('[YtMusicService] Error adding tracks to playlist:', err?.message || err);
            throw err;
        }
    }
    /**
     * Searches YouTube for a track by query string (title + artist).
     */
    async searchTrack(query) {
        this.ensureAuthenticated();
        try {
            const youtube = this.getYoutubeClient();
            // Append 'topic audio' to prioritize official embeddable YouTube Topic releases over VEVO blocked videos
            const response = await youtube.search.list({
                part: ['snippet'],
                q: `${query} topic audio`,
                type: ['video'],
                maxResults: 1,
            });
            const item = response.data.items?.[0];
            if (!item || !item.id?.videoId)
                return null;
            return {
                videoId: item.id.videoId,
                title: item.snippet?.title || query,
                artist: item.snippet?.channelTitle || 'Unknown Artist',
                tags: [],
                originalIndex: 0,
            };
        }
        catch (err) {
            console.error(`[YtMusicService] Error searching track for query "${query}":`, err?.message || err);
            return null;
        }
    }
    /**
     * Checks if a session exists.
     */
    hasSession() {
        return this.hasTokens;
    }
}
exports.YtMusicService = YtMusicService;
