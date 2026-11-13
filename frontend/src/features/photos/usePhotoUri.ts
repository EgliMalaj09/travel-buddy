import { useEffect, useState } from 'react';

import { repositories } from '@/data';
import type { Media } from '@/data/types';
import { deletePhotoFiles, downloadPhoto, localPhoto, type PhotoPart } from '@/services/photoFiles';
import { forgetUpload } from '@/services/photoUpload';

/**
 * The file address of a photo part on this phone. When it is not here (added on another phone),
 * it is downloaded once the server has it; until then null (grey placeholder, D4).
 */
export function usePhotoUri(
  photo: Pick<Media, 'id' | 'thumbnailKey' | 'uploadedAt'>,
  part: PhotoPart,
) {
  // Downloaded files, by "<id>/<part>"; the photo's own files on this phone are read directly.
  const [downloaded, setDownloaded] = useState<Record<string, string>>({});
  const here = localPhoto(photo.id, part)?.uri ?? null;
  const onServer = part === 'thumb' ? !!photo.thumbnailKey : !!photo.uploadedAt;
  const key = `${photo.id}/${part}`;

  useEffect(() => {
    if (here || !onServer) return;
    let live = true;
    void downloadPhoto(photo.id, part).then((file) => {
      if (live && file) setDownloaded((d) => ({ ...d, [key]: file.uri }));
    });
    return () => {
      live = false;
    };
  }, [here, onServer, photo.id, part, key]);

  return here ?? downloaded[key] ?? null;
}

/** Deletes a photo: the record (synced), its files on this phone and its upload state. */
export async function removePhoto(id: string): Promise<void> {
  await repositories.media.deletePhoto(id);
  deletePhotoFiles(id);
  forgetUpload(id);
}
