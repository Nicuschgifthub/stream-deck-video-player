const StreamDeckVideoPlayer = require('./class/stream-deck-video-player');
const path = require('path');

const CONFIG = {
    VIDEO_PATH: path.join(__dirname, 'assets', 'example-video.mp4'),
    TARGET_FPS: 30,
    GRID_WIDTH: 3,
    GRID_HEIGHT: 2,
    KEY_SIZE: 80,
};

async function runPlayer() {
    const player = new StreamDeckVideoPlayer(
        CONFIG.VIDEO_PATH,
        CONFIG.TARGET_FPS,
        CONFIG.GRID_WIDTH,
        CONFIG.GRID_HEIGHT,
        CONFIG.KEY_SIZE
    );

    try {
        // 1. Load all frames into memory
        await player.preloadFrames();

        // 2. Connect to the device
        await player.connectStreamDeck();

        // 3. Start playing the video loop
        player.startPlayback();

        // 4. Set up the SIGINT handler for a clean exit
        process.on('SIGINT', async () => {
            await player.shutdown();
            process.exit(0);
        });

        // Keep the Node.js process alive
        process.stdin.resume();

    } catch (err) {
        console.error('Critical Failure:', err.message);
        if (player.streamDeck) player.streamDeck.close();
        process.exit(1);
    }
}

runPlayer();