import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-lg flex items-center justify-center shrink-0 p-1.5">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          <path
            d="M12 2L22 7L12 12L2 7L12 2Z"
            fill="currentColor"
            className="text-white/90"
          />
          <path
            d="M2 7L12 12V22L2 17V7Z"
            fill="currentColor"
            className="text-white/70"
          />
          <path
            d="M12 12L22 7V17L12 22V12Z"
            fill="currentColor"
            className="text-white/80"
          />
          <path
            d="M12 2L12 12M2 7L12 12M22 7L12 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-white/50"
          />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-sm text-neutral-900 leading-tight">Tron</span>
        <span className="text-[10px] text-neutral-500 leading-none">by Grid Labs</span>
      </div>
    </Link>
  )
}
