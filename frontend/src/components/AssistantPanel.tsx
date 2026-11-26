import { isAxiosError } from 'axios'
import { SendHorizontal, Sparkles } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAskAssistant } from '@/hooks/useAskAssistant'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { AssistantAnswer } from '@/types/assistantTypes'
import type { UserRole } from '@/types/authTypes'
import { getAssistantReferenceLink } from '@/utils/getAssistantReferenceLink'

const MAX_QUESTION_LENGTH = 500

// Phạm vi trả lời theo vai trò (FR-127), để người dùng biết nên hỏi gì.
const SCOPE_HINTS: Record<UserRole, string> = {
  Tenant: 'Hỏi về hợp đồng, hóa đơn, sự cố của bạn hoặc cách dùng hệ thống.',
  Landlord: 'Hỏi về khu trọ, phòng, hợp đồng, hóa đơn, sự cố trên khu trọ của bạn hoặc cách dùng hệ thống.',
  Admin: 'Hỏi về cách dùng hệ thống.',
}

interface AssistantExchange {
  id: number
  question: string
  answer: AssistantAnswer
}

interface AssistantPanelProps {
  /** Gọi khi API trả `503`: layout ẩn nút trợ lý tới lần tải trang sau (FR-121). */
  onUnavailable: () => void
}

/**
 * Nút mở và khung trợ lý AI ở thanh trên của ba layout đã đăng nhập (docs/frontend-screens.md mục 1,
 * bảng component dùng chung ở docs/design-system.md). Các câu hỏi chỉ nằm trong state của component này: đóng khung rồi mở lại vẫn
 * còn, tải lại trang hoặc đăng xuất thì mất; server cũng không lưu (FR-131).
 */
export default function AssistantPanel({ onUnavailable }: AssistantPanelProps) {
  const { data: user } = useCurrentUser()
  const role = user?.roles[0]
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [exchanges, setExchanges] = useState<AssistantExchange[]>([])
  const nextId = useRef(1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const ask = useAskAssistant()

  const trimmed = question.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_QUESTION_LENGTH && !ask.isPending

  // Cuộn xuống câu mới nhất khi gửi câu hỏi và khi có câu trả lời.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [exchanges.length, ask.isPending, open])

  if (!role) {
    return null
  }

  const send = () => {
    if (!canSend) {
      return
    }
    const asked = trimmed
    ask.mutate(asked, {
      onSuccess: (answer) => {
        setExchanges((current) => [...current, { id: nextId.current++, question: asked, answer }])
        setQuestion('')
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 503) {
          toast.error('Trợ lý AI tạm thời không dùng được. Các chức năng khác vẫn hoạt động bình thường.')
          setOpen(false)
          onUnavailable()
        }
      },
    })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    send()
  }

  // Enter gửi, Shift + Enter xuống dòng.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  const isUnavailableError = isAxiosError(ask.error) && ask.error.response?.status === 503

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2.5" aria-label="Mở trợ lý AI">
          <Sparkles className="size-5 text-primary" />
          <span className="hidden sm:inline">Trợ lý AI</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Trợ lý AI
          </SheetTitle>
          <SheetDescription>{SCOPE_HINTS[role]}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4" aria-live="polite">
          {exchanges.length === 0 && !ask.isPending && (
            <p className="text-sm text-muted-foreground">
              Câu hỏi và câu trả lời chỉ hiện trong lần mở trang này, không được lưu lại.
            </p>
          )}

          {exchanges.map((exchange) => (
            <div key={exchange.id} className="flex flex-col gap-2">
              <QuestionBubble text={exchange.question} />
              <AnswerBlock answer={exchange.answer} role={role} onNavigate={() => setOpen(false)} />
            </div>
          ))}

          {ask.isPending && ask.variables && (
            <div className="flex flex-col gap-2">
              <QuestionBubble text={ask.variables} />
              <div aria-busy="true" aria-label="Đang chờ trợ lý trả lời" className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t p-4">
          {!ask.isPending && !isUnavailableError && <ApiErrorAlert error={ask.error} />}
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_QUESTION_LENGTH}
            rows={3}
            placeholder="Nhập câu hỏi…"
            aria-label="Câu hỏi cho trợ lý"
            className="resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {question.length}/{MAX_QUESTION_LENGTH}
            </span>
            <Button type="submit" disabled={!canSend}>
              {ask.isPending ? <Spinner /> : <SendHorizontal />}
              Gửi
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function QuestionBubble({ text }: { text: string }) {
  return (
    <p className="max-w-[85%] self-end rounded-xl bg-primary-soft px-3 py-2 text-sm whitespace-pre-line wrap-anywhere">
      {text}
    </p>
  )
}

interface AnswerBlockProps {
  answer: AssistantAnswer
  role: UserRole
  onNavigate: () => void
}

function AnswerBlock({ answer, role, onNavigate }: AnswerBlockProps) {
  const links = answer.references
    .map((reference) => getAssistantReferenceLink(reference, role))
    .filter((link) => link !== null)

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
      <p className="whitespace-pre-line wrap-anywhere">{answer.answer}</p>
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Bản ghi được nhắc tới">
          {links.map((link) => (
            <li key={link.to}>
              <Button asChild variant="outline" size="sm" className="h-7">
                <Link to={link.to} onClick={onNavigate}>
                  {link.label}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Câu trả lời mang tính tham khảo; bản ghi gốc là căn cứ.</p>
    </div>
  )
}
