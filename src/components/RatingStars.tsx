interface Props {
  /** 지금 고른 점수. 0 = 아직 안 고름 */
  value: number
  onChange: (score: number) => void
  disabled?: boolean
  /** 화면 낭독기용 이름. 예: "민수 님 평가" */
  label: string
}

const SCORES = [1, 2, 3, 4, 5]

/** 기능 6 · 별 5개 중에서 점수를 고르는 입력. 별 하나가 버튼 하나다. */
export default function RatingStars({ value, onChange, disabled = false, label }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score}점`}
          disabled={disabled}
          onClick={() => onChange(score)}
          className={`h-11 w-11 text-3xl leading-none disabled:opacity-50 ${
            score <= value ? 'text-amber-500' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
