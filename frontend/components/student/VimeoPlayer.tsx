'use client';

import React from 'react';
import { UniversalVideoPlayer, UniversalVideoPlayerProps } from '@/components/classroom/UniversalVideoPlayer';

export interface VimeoPlayerProps extends UniversalVideoPlayerProps {}

export const VimeoPlayer: React.FC<VimeoPlayerProps> = (props) => {
  return <UniversalVideoPlayer {...props} />;
};

export { UniversalVideoPlayer };
export default VimeoPlayer;
