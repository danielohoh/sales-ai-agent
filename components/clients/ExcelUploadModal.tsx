'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { parseExcelFile, bulkImportClients } from '@/app/clients/excel-actions'

interface ExcelUploadModalProps {
  open: boolean
  onClose: () => void
}

export function ExcelUploadModal({ open, onClose }: ExcelUploadModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null)

  const columns = [
  { key: 'company_name', label: '회사명', required: true },
  { key: 'brand_name', label: '브랜드명', required: false },
  { key: 'industry', label: '업종', required: false },
  { key: 'store_count', label: '가맹점수', required: false },
  { key: 'ceo_name', label: '대표자명', required: false },
  { key: 'inquiry_source', label: '문의경로', required: false },
  { key: 'interest_product', label: '관심제품', required: false },
  { key: 'contact_name', label: '담당자명', required: false },
  { key: 'contact_position', label: '담당자직책', required: false },
  { key: 'contact_phone', label: '담당자전화', required: false },
  { key: 'contact_email', label: '담당자이메일', required: false },
]

  // 파일 선택
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)

    // 파일을 Base64로 변환
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      const { data, error } = await parseExcelFile(base64)
      
      if (error) {
        alert(error)
        return
      }

      const previewRows = Array.isArray(data)
        ? data.slice(0, 5).filter((row): row is Record<string, unknown> =>
            typeof row === 'object' && row !== null
          )
        : []

      setPreview(previewRows)
    }
    reader.readAsDataURL(selectedFile)
  }

  // 업로드 실행
  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      const { data } = await parseExcelFile(base64)
      
      const importRows = Array.isArray(data)
        ? data.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
        : []

      if (importRows.length > 0) {
        const importResult = await bulkImportClients(importRows)
        setResult(importResult)
        
        if (importResult.success > 0) {
          router.refresh()
        }
      }
      
      setIsLoading(false)
    }
    reader.readAsDataURL(file)
  }

  // 템플릿 다운로드
  const handleDownloadTemplate = () => {
    // CSV 형식 템플릿 생성
    const headers = columns.map(c => c.label).join(',')
    const example = '엠에스벤터,MSBENTER ERP,IT,50,김대표,홈페이지,POS시스템,2026-03-01,테스트 데이터,김담당,팀장,010-1234-5678,test@example.com'
    const csvContent = `\uFEFF${headers}\n${example}`
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '고객_업로드_템플릿.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // 모달 닫기
  const handleClose = () => {
    setFile(null)
    setPreview([])
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            엑셀 일괄 업로드
          </DialogTitle>
          <DialogDescription>
            엑셀 또는 CSV 파일로 고객을 일괄 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 템플릿 다운로드 */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">📋 템플릿 다운로드</p>
                <p className="text-sm text-blue-700">
                  양식에 맞춰 데이터를 입력 후 업로드하세요.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-1" />
                템플릿
              </Button>
            </div>
          </div>

          {/* 필수 컬럼 안내 */}
          <div className="text-sm">
            <p className="font-medium mb-2">필수 컬럼:</p>
            <div className="flex flex-wrap gap-2">
              {columns.filter(c => c.required).map(c => (
                <Badge key={c.key} variant="destructive">{c.label} *</Badge>
              ))}
              {columns.filter(c => !c.required).slice(0, 5).map(c => (
                <Badge key={c.key} variant="secondary">{c.label}</Badge>
              ))}
              <Badge variant="outline">...</Badge>
            </div>
          </div>

          {/* 파일 선택 */}
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {preview.length > 0 ? `${preview.length}개 행 미리보기 (전체 데이터 업로드됨)` : '파싱 중...'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-600">클릭하여 파일 선택</p>
                <p className="text-sm text-slate-400">.xlsx, .xls, .csv 지원</p>
              </div>
            )}
          </div>

          {/* 미리보기 */}
          {preview.length > 0 && !result && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 font-medium text-sm">
                미리보기 (상위 5개)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      {Object.keys(preview[0]).slice(0, 6).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).slice(0, 6).map((val, j) => (
                          <td key={j} className="px-3 py-2 truncate max-w-[150px]">
                            {String(val || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div className={`p-4 rounded-lg ${result.failed > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <div className="flex items-center gap-4">
                {result.success > 0 && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span>{result.success}건 성공</span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <span>{result.failed}건 실패</span>
                  </div>
                )}
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  <p className="font-medium">오류 내역:</p>
                  <ul className="list-disc list-inside">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? '닫기' : '취소'}
          </Button>
          {!result && (
            <Button 
              onClick={handleUpload} 
              disabled={!file || isLoading}
            >
              {isLoading ? '업로드 중...' : '업로드'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
