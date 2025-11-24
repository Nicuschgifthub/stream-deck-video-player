const { openStreamDeck, listStreamDecks } = require('@elgato-stream-deck/node');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const HID = require('node-hid');

class StreamDeckVideoPlayer {
    /**
     * @param {string} videoPath - The path to the video file.
     * @param {number} targetFPS - The desired frame rate for playback.
     * @param {number} gridWidth - The number of keys wide (e.g., 3 for Stream Deck Mini).
     * @param {number} gridHeight - The number of keys high (e.g., 2 for Stream Deck Mini).
     * @param {number} keySize - The pixel size of a single key (e.g., 80).
     */
    constructor(videoPath, targetFPS = 30, gridWidth = 3, gridHeight = 2, keySize = 80) {
        this.videoPath = videoPath;
        this.targetFPS = targetFPS;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.keySize = keySize;

        this.frameDelayMs = 1000 / this.targetFPS;
        this.totalKeys = this.gridWidth * this.gridHeight;
        this.keyIndices = Array.from({ length: this.totalKeys }, (_, i) => i);

        this.frameSize = this.gridWidth * this.keySize * this.gridHeight * this.keySize * 3;

        this.videoFrames = [];
        this.playbackInterval = null;
        this.streamDeck = null;
        this.isPlaying = false;
    }

    async preloadFrames() {
        if (this.videoFrames.length > 0) {
            console.log("Frames already pre-loaded. Skipping...");
            return;
        }

        return new Promise((resolve, reject) => {
            let frameBuffer = Buffer.alloc(0);
            let ffmpegCommand = ffmpeg(this.videoPath)
                .noAudio()
                .outputFormat('rawvideo')
                .outputOptions([
                    `-filter:v fps=${this.targetFPS}`,
                    '-pix_fmt rgb24',
                    `-s ${this.gridWidth * this.keySize}x${this.gridHeight * this.keySize}`
                ]);

            console.log(`Starting FFmpeg decoding and pre-loading at ${this.targetFPS} FPS...`);

            const stream = ffmpegCommand.pipe();

            stream.on('data', (chunk) => {
                frameBuffer = Buffer.concat([frameBuffer, chunk]);

                while (frameBuffer.length >= this.frameSize) {
                    const rawFrame = frameBuffer.subarray(0, this.frameSize);
                    this.videoFrames.push(rawFrame);
                    frameBuffer = frameBuffer.subarray(this.frameSize);

                    if (this.videoFrames.length % 50 === 0) {
                        process.stdout.write(`Loaded ${this.videoFrames.length} frames... \r`);
                    }
                }
            });

            stream.on('end', () => {
                console.log(`\n✅ Finished pre-loading! Total frames stored: ${this.videoFrames.length}`);
                if (this.videoFrames.length === 0) {
                    return reject(new Error("FFmpeg finished without loading any frames. Check file path/errors."));
                }
                resolve();
            });

            ffmpegCommand.on('error', (err, stdout, stderr) => {
                if (stderr && stderr.includes('Output stream closed') && this.videoFrames.length > 0) {
                    // Suppress known non-critical pipe closure error
                    // console.log(`\n⚠️ Caught non-critical FFmpeg log message.`);
                } else {
                    // console.error('\nFFmpeg Command Fatal Error:', err.message);
                    reject(err);
                }
            });
        });
    }

    /**
     * Finds and connects to the Stream Deck device.
     */
    async connectStreamDeck() {
        let devicePath = null;
        let devices = listStreamDecks();

        if (devices.length > 0) {
            devicePath = devices[0].path;
        } else {
            const allDevices = HID.devices();
            const elgatoDevice = allDevices.find(d => d.manufacturer && d.manufacturer.toLowerCase().includes('elgato'));
            if (elgatoDevice) devicePath = elgatoDevice.path;
        }

        if (!devicePath) {
            throw new Error('No Stream Deck found.');
        }

        this.streamDeck = await openStreamDeck(devicePath);
        console.log(`Connected to Stream Deck. Grid: ${this.gridWidth}x${this.gridHeight}.`);
        this.streamDeck.on('error', (error) => { console.error('Stream Deck Error:', error); });
        await this.streamDeck.clearPanel();
    }

    /**
     * Starts the playback loop from memory onto the Stream Deck.
     */
    startPlayback() {
        if (this.isPlaying) return console.log("Playback is already running.");
        if (!this.streamDeck || this.videoFrames.length === 0) {
            throw new Error("Cannot start playback: Device not connected or frames not loaded.");
        }

        let frameIndex = 0;
        this.isPlaying = true;
        console.log(`Starting playback loop at ${this.targetFPS} FPS...`);

        this.playbackInterval = setInterval(async () => {
            if (!this.isPlaying) return;

            const rawFrame = this.videoFrames[frameIndex];

            try {
                const largeSharpImage = sharp(rawFrame, {
                    raw: { width: this.gridWidth * this.keySize, height: this.gridHeight * this.keySize, channels: 3 }
                });

                const keyPromises = [];

                for (let y = 0; y < this.gridHeight; y++) {
                    for (let x = 0; x < this.gridWidth; x++) {
                        const keyIndex = y * this.gridWidth + x;

                        if (keyIndex < this.totalKeys) {
                            const segmentPromise = (async () => {
                                const segmentBuffer = await largeSharpImage
                                    .clone()
                                    .extract({
                                        left: x * this.keySize, top: y * this.keySize,
                                        width: this.keySize, height: this.keySize
                                    })
                                    .raw()
                                    .toBuffer();

                                await this.streamDeck.fillKeyBuffer(this.keyIndices[keyIndex], segmentBuffer);
                            })();
                            keyPromises.push(segmentPromise);
                        }
                    }
                }
                await Promise.all(keyPromises);

            } catch (err) {
                console.error(`Error processing frame ${frameIndex}:`, err);
            }

            frameIndex = (frameIndex + 1) % this.videoFrames.length;

        }, this.frameDelayMs);
    }

    /**
     * Stops the playback interval and marks the player as stopped.
     */
    stopPlayback() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        this.isPlaying = false;
        console.log("Playback stopped.");
    }

    /**
     * Performs a graceful shutdown of the device and process.
     */
    async shutdown() {
        this.stopPlayback();
        if (this.streamDeck) {
            await this.streamDeck.close();
        }
        console.log('Stream Deck connection closed. Exiting cleanly.');
    }
}

module.exports = StreamDeckVideoPlayer;