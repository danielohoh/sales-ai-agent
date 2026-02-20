'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  MessageSquare,
  Plus,
  Trash2,
  MessageCircle,
  Paperclip,
  X,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getChatSessions,
  createChatSession,
  deleteChatSession,
  getChatMessages,
  saveChatMessage,
} from '@/app/ai-assistant/actions'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface AttachedFile {
  name: string
  type: string
  data: string // base64
  preview?: string // 이미지 미리보기 URL
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: AttachedFile[]
  created_at?: string
}

interface AIChatWithHistoryProps {
  userId: string
}

const EXAMPLE_PROMPTS = [
  '오늘 해야 할 일 알려줘',
  '이번 달 영업 실적 보여줘',
  '맥스원이링크 상담이력 확인해줘',
  '이번 주 일정 알려줘',
  '새 고객 등록해줘',
]

export function AIChatWithHistory({ userId }: AIChatWithHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 파일을 base64로 변환
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  // 파일 첨부 처리
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.')
        continue
      }

      const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!supportedTypes.includes(file.type)) {
        alert('지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP, PDF만 지원)')
        continue
      }

      const base64 = await fileToBase64(file)
      const preview = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : undefined

      setAttachedFiles(prev => [...prev, {
        name: file.name,
        type: file.type,
        data: base64,
        preview,
      }])
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 첨부파일 제거
  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  // 세션 목록 로드
  useEffect(() => {
    loadSessions()
  }, [])

  // 새 메시지가 오면 스크롤 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadSessions = async () => {
    setIsLoadingSessions(true)
    const { data } = await getChatSessions()
    if (data) {
      setSessions(data)
    }
    setIsLoadingSessions(false)
  }

  const loadMessages = async (sessionId: string) => {
    const { data } = await getChatMessages(sessionId)
    if (data) {
      setMessages(data.map((m: { id: string; role: string; content: string; created_at: string }) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        created_at: m.created_at,
      })))
    }
  }

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    await loadMessages(sessionId)
  }

  const handleNewChat = async () => {
    const { data } = await createChatSession()
    if (data) {
      setSessions(prev => [data, ...prev])
      setCurrentSessionId(data.id)
      setMessages([])
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('이 대화를 삭제하시겠습니까?')) return

    await deleteChatSession(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
      setMessages([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return

    // 세션이 없으면 새로 생성
    let sessionId = currentSessionId
    if (!sessionId) {
      const { data } = await createChatSession()
      if (data) {
        sessionId = data.id
        setSessions(prev => [data, ...prev])
        setCurrentSessionId(sessionId)
      } else {
        return
      }
    }

    // 파일이 있을 때 기본 메시지 설정
    const messageContent = input.trim() || (attachedFiles.length > 0 ? '첨부된 파일을 확인해주세요.' : '')

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    }

    setMessages(prev => [...prev, userMessage])
    const filesToSend = [...attachedFiles]
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    if (!sessionId) {
      setIsLoading(false)
      return
    }

    // 사용자 메시지 저장 (파일 정보 포함)
    const saveContent = filesToSend.length > 0 
      ? `${messageContent}\n\n[첨부파일: ${filesToSend.map(f => f.name).join(', ')}]`
      : messageContent
    await saveChatMessage(sessionId, 'user', saveContent)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageContent }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          files: filesToSend.map(f => ({
            name: f.name,
            type: f.type,
            data: f.data,
          })),
          userId,
        }),
      })

      if (!response.ok) throw new Error('API 오류')

      const data = await response.json()
      
      const assistantContent = data.content || '응답을 받지 못했습니다.'
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
      }
      setMessages(prev => [...prev, assistantMessage])

      // AI 응답 저장
      await saveChatMessage(sessionId, 'assistant', assistantContent)

      // 세션 목록 새로고침 (제목 업데이트)
      loadSessions()
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <div className="grid h-[calc(100vh-132px)] grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <aside className="hidden lg:block">
        <Card className="h-full border-slate-200/80 bg-white/90">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">대화 목록</CardTitle>
              <Button size="sm" onClick={handleNewChat} className="rounded-lg">
                <Plus className="h-4 w-4 mr-1" />
                새 대화
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>대화가 없습니다</p>
                <p className="text-xs mt-1">새 대화를 시작하세요</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      'group flex items-center justify-between rounded-xl border p-2.5 cursor-pointer transition-colors',
                      currentSessionId === session.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'border-transparent hover:border-slate-200 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(session.updated_at), 'M/d HH:mm', { locale: ko })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white/92">
        <div className="border-b border-slate-200/80 px-5 py-3 text-sm font-semibold text-slate-700">
          AI 영업 비서
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2 sm:px-5 sm:pb-5">
          <div 
            ref={scrollRef}
            className="mb-4 flex-1 overflow-y-auto pr-1"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                  <MessageSquare className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">무엇을 도와드릴까요?</h3>
                <p className="text-sm text-slate-500 mb-4">
                  자연어로 영업 업무를 요청하세요
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {EXAMPLE_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(prompt)}
                      className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 max-w-[82%]',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100/80 text-slate-900'
                      )}
                    >
                      {/* 첨부 파일 표시 */}
                      {message.files && message.files.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {message.files.map((file, idx) => (
                            <div key={idx} className="rounded overflow-hidden">
                              {file.type.startsWith('image/') && file.preview ? (
                                <img
                                  src={file.preview}
                                  alt={file.name}
                                  className="max-w-[200px] max-h-[150px] object-cover rounded"
                                />
                              ) : (
                                <div className="flex items-center gap-2 bg-white/20 rounded px-2 py-1">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-xs">{file.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 첨부파일 미리보기 */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="relative group bg-slate-100 rounded-lg p-2 flex items-center gap-2"
                >
                  {file.type.startsWith('image/') ? (
                    <div className="w-12 h-12 rounded overflow-hidden">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded bg-red-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-red-600" />
                    </div>
                  )}
                  <div className="max-w-[100px]">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {file.type.startsWith('image/') ? '이미지' : 'PDF'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachedFile(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 입력 영역 */}
          <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-4xl gap-2">
            {/* 파일 첨부 버튼 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="파일 첨부 (이미지, PDF)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachedFiles.length > 0 ? "파일에 대해 질문하세요..." : "메시지를 입력하세요..."}
              disabled={isLoading}
              className="h-11 flex-1"
            />
            <Button type="submit" disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
