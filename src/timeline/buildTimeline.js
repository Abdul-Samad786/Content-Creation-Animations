function buildTimeline(dialogue, fps = 30, defaultFrames = 90) {
  let frame = 0;
  return dialogue.map((line) => {
    const duration = defaultFrames + (line.pauseAfter || 0);
    const entry = {
      lineId: line.id,
      startFrame: frame,
      endFrame: frame + duration,
      speaker: line.speaker,
      text: line.text,
      camera: line.camera,
      mood: line.mood,
      state: line.state,
      otherState: line.otherState,
    };
    frame += duration;
    return entry;
  });
}

export { buildTimeline };
