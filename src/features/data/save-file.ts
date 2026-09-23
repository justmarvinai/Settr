/**
 * Saving a file the user keeps (IMPORT_EXPORT.md §3 step 5). Backups are downloads: Brave asks
 * where to save each one. Phones share the file instead ("In Dateien sichern", AirDrop), falling
 * back to a download; desktop never shares (Brave on Windows refuses JSON files).
 */
export type SaveResult = 'downloaded' | 'shared' | 'cancelled';

const isPhone = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // The download has its own copy once it starts; keep the URL a while for slow Save-As dialogs.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function saveFile(blob: Blob, name: string): Promise<SaveResult> {
  if (isPhone()) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        // Sharing refused (e.g. NotAllowedError): download instead.
      }
    }
  }
  download(blob, name);
  return 'downloaded';
}
