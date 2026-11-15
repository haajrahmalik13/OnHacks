window.SITWELL_CONFIG = Object.freeze({
  // Match the supplied ESP32 firmware. These are not live hardware controls.
  hardware: Object.freeze({
    fsrPin: 36,
    motorPin: 2,
    adcMax: 4095,
    pressureThreshold: 500,
    serialBaud: 115200,
    sampleIntervalMs: 250,
    reminderMs: 20000,
    everydayReminderMs: 1800000,
    buzzDurationMs: 800,
  }),

  // Python's logging rules, independent of the Arduino reminder timer.
  session: Object.freeze({
    interruptionBufferMs: 10000,
    minimumSavedMs: 3000,
  }),

  // Readings are inside the ranges used by the Python demo.
  demo: Object.freeze({
    seatedAdc: 2400,
    awayAdc: 12,
  }),
});
