'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
  Badge,
  buttonClasses,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  SpinnerIcon,
  StarIcon,
  TrashIcon,
} from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { resolveCatalogImageUrl } from '@/features/catalog/mappers';
import {
  deleteProductImage,
  setPrimaryProductImage,
  uploadProductImages,
} from './admin-catalog-api';
import type { AdminProduct, AdminProductImage } from './types';

const MAX_FILES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProductImageManagerProps {
  product: AdminProduct;
  onImagesChange: (images: AdminProductImage[]) => void;
  onSuccessMessage: (message: string) => void;
  onErrorMessage: (message: string) => void;
}

interface FilePreview {
  file: File;
  previewUrl: string;
}

export function ProductImageManager({
  product,
  onImagesChange,
  onSuccessMessage,
  onErrorMessage,
}: ProductImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const images = product.images || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      setValidationError(`You can select a maximum of ${MAX_FILES} images at once.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validPreviews: FilePreview[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported format (JPEG, PNG, WebP only).`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" exceeds the 5 MB maximum size limit.`);
        continue;
      }
      validPreviews.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (errors.length > 0) {
      setValidationError(errors.join(' '));
    }

    setSelectedFiles(validPreviews);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearSelectedFiles = () => {
    selectedFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setValidationError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setValidationError(null);

    const formData = new FormData();
    selectedFiles.forEach((p) => {
      formData.append('files', p.file);
    });

    try {
      const uploaded = await uploadProductImages(product.id, formData);
      onImagesChange([...images, ...uploaded]);
      onSuccessMessage(
        uploaded.length === 1
          ? 'Image uploaded successfully.'
          : `${uploaded.length} images uploaded successfully.`,
      );
      clearSelectedFiles();
    } catch (err) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : 'Upload failed.';
      onErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    setActionPendingId(imageId);
    try {
      await setPrimaryProductImage(product.id, imageId);
      const updated = images.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }));
      onImagesChange(updated);
      onSuccessMessage('Primary image updated.');
    } catch (err) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : 'Failed to update primary image.';
      onErrorMessage(msg);
    } finally {
      setActionPendingId(null);
    }
  };

  const handleDelete = async (imageId: string) => {
    setActionPendingId(imageId);
    setConfirmDeleteId(null);
    try {
      const res = await deleteProductImage(product.id, imageId);
      const remaining = images.filter((img) => img.id !== imageId);
      // If backend promoted another primary image, reflect it in local state
      const updated = remaining.map((img) => ({
        ...img,
        isPrimary: img.id === (res as any).promotedPrimaryImageId ? true : img.isPrimary,
      }));
      onImagesChange(updated);
      onSuccessMessage('Image deleted successfully.');
    } catch (err) {
      const msg = err instanceof ApiError || err instanceof Error ? err.message : 'Failed to delete image.';
      onErrorMessage(msg);
    } finally {
      setActionPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Images Gallery */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">
            Product Images ({images.length})
          </h3>
          <span className="text-xs text-ink-muted">
            The primary image is displayed on storefront listings.
          </span>
        </div>

        {images.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-muted">
            No images uploaded yet. Upload JPEG, PNG, or WebP images below.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image) => {
              const isPrimary = image.isPrimary;
              const isPending = actionPendingId === image.id;
              const isConfirming = confirmDeleteId === image.id;
              const src = resolveCatalogImageUrl(image.imageUrl);

              return (
                <div
                  key={image.id}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-xl border bg-surface transition-all',
                    isPrimary ? 'border-accent ring-2 ring-accent/20' : 'border-line',
                  )}
                >
                  {/* Image Preview Container */}
                  <div className="relative aspect-square w-full bg-surface-muted">
                    <Image
                      src={src}
                      alt={image.altText || product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                    />

                    {/* Primary Badge */}
                    {isPrimary && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge variant="success" className="gap-1 bg-surface shadow-sm">
                          <StarIcon className="h-3 w-3 text-warning fill-warning" />
                          Primary
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Image Actions */}
                  <div className="flex items-center justify-between gap-1 p-2 bg-surface border-t border-line">
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(image.id)}
                        disabled={isPending}
                        className={buttonClasses({
                          variant: 'ghost',
                          size: 'sm',
                          className: 'h-8 px-2 text-xs text-ink-muted hover:text-accent',
                        })}
                        title="Set as primary image"
                      >
                        {isPending ? (
                          <SpinnerIcon className="h-3.5 w-3.5" />
                        ) : (
                          <StarIcon className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline ml-1">Make Primary</span>
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-success px-2 py-1 flex items-center gap-1">
                        <CheckIcon className="h-3.5 w-3.5" />
                        Default
                      </span>
                    )}

                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(image.id)}
                          disabled={isPending}
                          className={buttonClasses({
                            variant: 'primary',
                            size: 'sm',
                            className: 'h-8 px-2 text-xs bg-danger hover:bg-danger-600 text-white',
                          })}
                        >
                          {isPending ? <SpinnerIcon className="h-3 w-3" /> : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className={buttonClasses({
                            variant: 'ghost',
                            size: 'sm',
                            className: 'h-8 px-1.5 text-xs',
                          })}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(image.id)}
                        disabled={isPending}
                        className={buttonClasses({
                          variant: 'ghost',
                          size: 'sm',
                          className: 'h-8 px-2 text-xs text-danger hover:bg-danger/10',
                        })}
                        title="Delete this image"
                        aria-label={`Delete image for ${product.name}`}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dropzone & Controls */}
      <div className="rounded-xl border border-line bg-surface-muted/50 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-ink mb-1">Add New Images</h4>
        <p className="text-xs text-ink-muted mb-4">
          Select up to 8 images at once. Allowed formats: JPEG, PNG, WebP (Max 5 MB each).
        </p>

        {validationError && (
          <div className="mb-4 rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs text-danger">
            {validationError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            id="product-images-input"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={buttonClasses({
              variant: 'secondary',
              size: 'sm',
              className: 'h-10 gap-1.5',
            })}
          >
            <PlusIcon className="h-4 w-4" />
            Select Images...
          </button>

          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className={buttonClasses({
                  variant: 'primary',
                  size: 'sm',
                  className: 'h-10 min-w-[7rem] gap-1.5',
                })}
              >
                {uploading ? (
                  <>
                    <SpinnerIcon className="h-4 w-4" />
                    Uploading...
                  </>
                ) : (
                  <>Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'Image' : 'Images'}</>
                )}
              </button>
              <button
                type="button"
                onClick={clearSelectedFiles}
                disabled={uploading}
                className={buttonClasses({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'h-10 text-ink-muted',
                })}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Selected Previews */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs font-medium text-ink mb-2">
              Selected for Upload ({selectedFiles.length}):
            </p>
            <div className="flex flex-wrap gap-3">
              {selectedFiles.map((preview, idx) => (
                <div
                  key={idx}
                  className="relative group h-20 w-20 overflow-hidden rounded-lg border border-line bg-surface"
                >
                  <Image
                    src={preview.previewUrl}
                    alt={preview.file.name}
                    fill
                    sizes="80px"
                    unoptimized
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(idx)}
                    disabled={uploading}
                    className="absolute top-1 right-1 rounded-full bg-surface/80 p-1 text-danger hover:bg-surface shadow-sm"
                    title="Remove from selection"
                    aria-label={`Remove ${preview.file.name}`}
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
