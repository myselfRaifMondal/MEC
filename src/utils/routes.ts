import type { FolderId } from '../types'
import { isSystemFolder } from '../store/queries'

/** URL segment for a folder: system folders use their name, custom folders use "f-<id>". */
export function folderToPath(folder: FolderId): string {
  if (isSystemFolder(folder)) return `/${folder}`
  return `/f-${folder.replace(/^custom:/, '')}`
}

export function segmentToFolder(segment: string | undefined): FolderId | null {
  if (!segment) return null
  if (isSystemFolder(segment)) return segment
  if (segment.startsWith('f-')) return `custom:${segment.slice(2)}`
  return null
}

export function messagePath(folder: FolderId, id: string): string {
  return `${folderToPath(folder)}/${id}`
}
