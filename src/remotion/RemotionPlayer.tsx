import { Player, PlayerInternals } from '@remotion/player'
import { LyricVideo } from './LyricVideo'
import type { LyricVideoProps } from './LyricVideo'

interface RemotionPlayerProps {
  inputProps: LyricVideoProps
  duration: number
}

function LyricVideoWrapper(props: LyricVideoProps) {
  const player = PlayerInternals.usePlayer()
  return <LyricVideo {...props} playing={player.playing} />
}

export function RemotionPlayer({ inputProps, duration }: RemotionPlayerProps) {
  const isPortrait = inputProps.ratio === '9:16'
  const width = isPortrait ? 1080 : 1920
  const height = isPortrait ? 1920 : 1080
  const fps = 30

  return (
    <Player
      component={LyricVideoWrapper as unknown as React.FC<Record<string, unknown>>}
      inputProps={inputProps as unknown as Record<string, unknown>}
      durationInFrames={Math.max(1, Math.ceil(duration * fps))}
      fps={fps}
      compositionWidth={width}
      compositionHeight={height}
      style={{ width: '100%', height: '100%' }}
      autoPlay
      loop
      controls={true}
    />
  )
}
