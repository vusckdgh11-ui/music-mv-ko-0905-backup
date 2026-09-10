import React from 'react'
import type { CompositionProps } from './types'
import { getComposition } from './compositions'

export interface LyricVideoProps extends CompositionProps {
  ratio: '16:9' | '9:16'
}

export const LyricVideo: React.FC<LyricVideoProps> = ({ ratio, style = 'normal', ...props }) => {
  const Comp = getComposition(ratio, style)
  return <Comp {...props} style={style} />
}
