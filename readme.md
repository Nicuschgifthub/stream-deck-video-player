# Stream Deck Video Player

A Node.js application that turns your Elgato Stream Deck Mini into a video player. It splits a video file across the buttons of the Stream Deck, playing them in sync to create a unified display.

## Features

- **Video Playback**: Plays standard video files (e.g., MP4) directly on the Stream Deck buttons.
- **synchronized Display**: Splits the video into a e.g 3x2 grid to match the Stream Deck Mini layout.
- **Configurable**: Adjustable target FPS and key size.
- **Efficient**: Preloads frames into memory for smooth playback.

## Video Demo

You can find it inside the **./_readme** folder.

<video src="https://raw.githubusercontent.com/Nicuschgifthub/stream-deck-video-player/master/_readme/example-video.mp4" controls muted loop autoplay width="50%"></video>

Video stream on the Stream Deck Mini looks a lot better irl.

## Prerequisites

- **Hardware**: Elgato Stream Deck Mini.
- **Software**:
    - Node.js (v14 or higher recommended).
    - FFmpeg (installed and available in your system PATH, or provided via `ffmpeg-static`).

## Installation

1.  **Clone the repository:**
    ```bash
    Download the Zip or clone this repo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Usage

1.  **Prepare your video:**
    - Place your video file in the `assets` folder.
    - By default, the example-video loads the `assets/example-video.mp4`.

2.  **Run the application:**
    ```bash
    npm start
    ```

3.  **Stop the application:**
    - Press `Ctrl+C` in the terminal to stop playback.

## Configuration

You can modify the configuration in `example-video.js`:

```javascript
const CONFIG = {
    VIDEO_PATH: path.join(__dirname, 'assets', 'example-video.mp4'), // Path to your video
    TARGET_FPS: 30,      // Desired playback FPS, higher than 40fps is not stable on the Stream Deck Mini
    GRID_WIDTH: 3,       // Number of keys wide (3 for Stream Deck Mini)
    GRID_HEIGHT: 2,      // Number of keys high (2 for Stream Deck Mini)
    KEY_SIZE: 80,        // Pixel size of a single key
};
```

## Troubleshooting

- **"No Stream Deck found"**: Ensure your Stream Deck is connected via USB.
- **No Video Playing / Video play errors**: Make sure you have a valid video file in the correct path.