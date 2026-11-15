import { useMutation } from '@tanstack/react-query'
import { uploadFile } from '@/services/fileService'
import type { UploadPurpose } from '@/types/fileTypes'

export function useUploadFile() {
  return useMutation({
    mutationFn: ({ file, purpose }: { file: File; purpose: UploadPurpose }) => uploadFile(file, purpose),
  })
}
