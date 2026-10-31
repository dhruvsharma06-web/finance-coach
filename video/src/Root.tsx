import React from "react";
import { Composition } from "remotion";
import { Showcase, TOTAL_FRAMES } from "./Showcase";
import story from "./story.json";

export const Root: React.FC = () => (
  <Composition id="KoshShowcase" component={Showcase} durationInFrames={TOTAL_FRAMES} fps={story.fps} width={1920} height={1080} />
);
