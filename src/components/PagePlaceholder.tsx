import { Link } from 'react-router-dom'

interface Props {
  /** 화면 번호 (AGENTS.md 의 "화면 7개" 순서) */
  number: number
  title: string
  /** 이 화면 파일 위치. 예: src/pages/LoginPage.tsx */
  file: string
  /** 이 화면에 만들어야 할 것 */
  todos: string[]
  /** 뼈대 단계에서 화면을 오가기 위한 임시 링크 */
  links?: { to: string; label: string }[]
}

/**
 * 아직 만들지 않은 화면에 임시로 보여 주는 안내 카드.
 * 화면을 실제로 만들기 시작하면 이 부품을 지우고 진짜 내용으로 바꾼다.
 */
export default function PagePlaceholder({ number, title, file, todos, links = [] }: Props) {
  return (
    <section className="p-4">
      <p className="text-xs font-semibold text-brand">화면 {number}</p>
      <h1 className="mt-1 text-xl font-bold text-gray-900">{title}</h1>

      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-700">여기에 만들 것</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {todos.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-400">
          파일: <code>{file}</code>
        </p>
      </div>

      {links.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 active:bg-gray-100"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
