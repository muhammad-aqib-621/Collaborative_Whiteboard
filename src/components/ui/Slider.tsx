import * as RadixSlider from '@radix-ui/react-slider'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <RadixSlider.Root
      className="relative flex h-5 w-full touch-none select-none items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([next]) => {
        if (next !== undefined) onChange(next)
      }}
    >
      <RadixSlider.Track className="relative h-1 grow rounded-full bg-line">
        <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={label}
        className="block size-4 rounded-full border-2 border-accent bg-white shadow"
      />
    </RadixSlider.Root>
  )
}
