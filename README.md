# OnHacks Project

## SitWell frontend

Open `frontend/index.html` in your browser. No installation, build, internet connection, or backend is required.

For a local web server, run this from the project root:

```sh
python3 -m http.server 5173 --directory frontend
```

Then visit http://localhost:5173.

### Try the demo

- Use **Sit down** and **Stand up** to simulate a single FSR detecting seat pressure.
- The signal display uses the Arduino ADC range (0–4095), threshold 500, and example readings 2400 seated / 12 away.
- The default reminder preview follows the Arduino demo: one 800 ms pulse after 20 seconds of continuous sitting. Standing up resets it immediately, even if the same session resumes within the buffer.
- **Stand up** pauses seated time and starts a 10-second interruption buffer.
- Return before 10 seconds to continue the same session. At 10 seconds away, the session closes; sitting again starts a new one.
- A washroom trip or other longer break usually ends the session. All time away is excluded from seated time.
- Explore session history, weekly insights, simulated device telemetry, reminder previews, and a timed 60-second reset.
- Save your name, reminder preview preset, and break goal in Preferences. The 30-minute preset only changes the browser preview; it does not reprogram the ESP32.
- Export a real CSV; illustrative sample history and interactive activity are labeled separately.
- Export completed demo sessions as JSON in your teammate’s three-field format. This excludes samples, unfinished sessions, and sessions shorter than 3 seconds.
- Open **Learn** for ten searchable fact cards with original-source links, saved reads, benefits and tradeoffs, a three-question myth quiz, a persistent desk checklist, and practical FAQs. The featured article summarizes Botlero et al. (2024), PMID 39053656, including its observational limitations. Reading lists and checklist choices stay in this browser.

### Files

- `frontend/index.html`: page structure, inline cushion illustration, and icons.
- `frontend/config.js`: Arduino/Python settings in one place, with comments explaining each group.
- `frontend/styles.css`: layout, colors, animations, and responsive styles.
- `frontend/app.js`: session state, timing, navigation, browser storage, and demo interactions.
- `frontend/learn.js`: educational content, source links, topic/search filters, saved reads, checklist, and quiz.

The frontend remains a standalone simulation, as requested. Arduino and Python are references; the page does not read USB, call the backend, or control a real motor.

### Arduino and Python reference

| Setting                      | Value                               |
| ---------------------------- | ----------------------------------- |
| FSR input                    | GPIO 36 / ADC1                      |
| Motor output                 | GPIO 2                              |
| ADC range                    | 0–4095                              |
| Sitting threshold            | 500                                 |
| Serial baud rate             | 115200                              |
| Normal sample interval       | 250 ms                              |
| Hackathon reminder           | 20 seconds, once per continuous sit |
| Motor pulse                  | 800 ms                              |
| Everyday firmware suggestion | 30 minutes                          |
| Python interruption buffer   | 10 seconds                          |
| Minimum saved session        | 3 seconds                           |

The Arduino reminder and Python session buffer are independent. A brief stand-up resets the reminder immediately, while Python can retain the same session for up to 10 seconds. The Arduino's blocking 800 ms buzz also pauses serial readings during the pulse, so sampling is not perfectly constant.

The supplied Python timer still counts a short absence when it resumes, because it uses time since the original start. This frontend excludes away time, as previously agreed; that difference remains to resolve before connecting the backend.

### What is sessions.json?

JSON is a plain-text format for structured records. In your teammate's code, `sessions.json` is a list of completed sessions, with these fields:

```json
[
  {
    "start_time": "2026-11-15 10:00:00",
    "end_time": "2026-11-15 10:02:10",
    "duration_seconds": 120
  }
]
```

Python creates the file automatically when it saves the first qualifying session. The path is relative to the folder where Python was started. You do not need to create the file manually.

The frontend stores its own demo in browser storage. Its JSON export downloads `sitwell-demo-sessions.json`; it does not overwrite the backend's `sessions.json`. The backend's `/data` route returns the latest five saved records even though the JSON file may contain more.

### Keeping the code readable

The frontend uses two-space indentation, consistent quotes and semicolons, and descriptive section comments. `.editorconfig` and `.prettierrc.json` keep those choices consistent.

To format it again:

```sh
npx prettier@3.6.2 --write "frontend/*.{html,css,js}"
```
