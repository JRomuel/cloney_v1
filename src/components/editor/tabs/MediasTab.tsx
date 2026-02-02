'use client';

import { useState, useCallback } from 'react';
import {
  BlockStack,
  Text,
  EmptyState,
  Card,
  InlineStack,
  Badge,
  Button,
  DropZone,
  Thumbnail,
  Banner,
  ProgressBar,
} from '@shopify/polaris';
import { DeleteIcon, DragHandleIcon } from '@shopify/polaris-icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '@/stores/editorStore';
import styles from './MediasTab.module.css';

interface SortableImageProps {
  url: string;
  productId: string;
  onDelete: () => void;
  isDeleting?: boolean;
}

function SortableImage({ url, onDelete, isDeleting }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isDeleting ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.mediaCard}>
      <div className={styles.imageWrapper}>
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          <DragHandleIcon />
        </div>
        <img
          src={url}
          alt="Product image"
          className={styles.image}
          loading="lazy"
        />
        <Button
          variant="tertiary"
          tone="critical"
          icon={DeleteIcon}
          onClick={onDelete}
          accessibilityLabel="Remove image"
          size="micro"
          disabled={isDeleting}
          loading={isDeleting}
        />
      </div>
    </div>
  );
}

interface ProductImageGridProps {
  productId: string;
  imageUrls: string[];
  sessionId: string | null;
}

function ProductImageGrid({ productId, imageUrls, sessionId }: ProductImageGridProps) {
  const { reorderProductImages, removeProductImage } = useEditorStore();
  const [deletingUrls, setDeletingUrls] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(async (url: string) => {
    if (!sessionId) {
      setDeleteError('Session not found');
      return;
    }

    setDeleteError(null);
    setDeletingUrls(prev => new Set(prev).add(url));

    try {
      // Call API to delete from R2
      const response = await fetch('/api/editor/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete image');
      }

      // Remove from store after successful R2 deletion
      removeProductImage(productId, url);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setDeletingUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  }, [sessionId, productId, removeProductImage]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = imageUrls.indexOf(active.id as string);
        const newIndex = imageUrls.indexOf(over.id as string);
        reorderProductImages(productId, oldIndex, newIndex);
      }
    },
    [productId, imageUrls, reorderProductImages]
  );

  if (imageUrls.length === 0) {
    return (
      <Text as="p" tone="subdued">
        No images
      </Text>
    );
  }

  return (
    <BlockStack gap="200">
      {deleteError && (
        <Banner tone="critical" onDismiss={() => setDeleteError(null)}>
          {deleteError}
        </Banner>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
          <div className={styles.grid}>
            {imageUrls.map((url) => (
              <SortableImage
                key={url}
                url={url}
                productId={productId}
                onDelete={() => handleDelete(url)}
                isDeleting={deletingUrls.has(url)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </BlockStack>
  );
}

interface FileUploadProps {
  productId: string;
  sessionId: string | null;
}

function FileUpload({ productId, sessionId }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { addProductImage } = useEditorStore();

  const handleDrop = useCallback(
    async (_dropFiles: File[], acceptedFiles: File[]) => {
      if (!sessionId) {
        setError('Session not found');
        return;
      }

      if (acceptedFiles.length === 0) {
        setError('No valid image files selected');
        return;
      }

      setError(null);
      setIsUploading(true);
      setPendingFiles(acceptedFiles);

      const totalFiles = acceptedFiles.length;
      let completedFiles = 0;

      for (const file of acceptedFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('sessionId', sessionId);

          const response = await fetch('/api/editor/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Upload failed');
          }

          const { url } = await response.json();
          addProductImage(productId, url);

          completedFiles++;
          setUploadProgress((completedFiles / totalFiles) * 100);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : `Failed to upload ${file.name}`
          );
        }
      }

      setIsUploading(false);
      setPendingFiles([]);
      setUploadProgress(0);
    },
    [sessionId, productId, addProductImage]
  );

  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  return (
    <div className={styles.uploadSection}>
      {error && (
        <div className={styles.errorBanner}>
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        </div>
      )}

      {isUploading && (
        <div className={styles.uploadProgress}>
          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              {pendingFiles.map((file, index) => (
                <Thumbnail
                  key={index}
                  source={URL.createObjectURL(file)}
                  alt={file.name}
                  size="small"
                />
              ))}
            </InlineStack>
            <ProgressBar progress={uploadProgress} size="small" />
            <Text as="p" tone="subdued" variant="bodySm">
              Uploading {pendingFiles.length} file
              {pendingFiles.length !== 1 ? 's' : ''}...
            </Text>
          </BlockStack>
        </div>
      )}

      {!isUploading && (
        <DropZone
          accept={validImageTypes.join(',')}
          type="image"
          onDrop={handleDrop}
          variableHeight
        >
          <DropZone.FileUpload actionHint="Accepts JPG, PNG, GIF, WebP up to 10MB" />
        </DropZone>
      )}
    </div>
  );
}

export function MediasTab() {
  const { products, sessionId } = useEditorStore();

  const totalImages = products.reduce((count, p) => {
    return count + (p.imageUrls?.length || (p.imageUrl ? 1 : 0));
  }, 0);

  if (products.length === 0) {
    return (
      <BlockStack gap="500">
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm">
            Product Images
          </Text>
          <Text as="p" tone="subdued">
            Manage images for your products.
          </Text>
        </BlockStack>
        <Card>
          <EmptyState heading="No products" image="">
            <p>Add products first to manage their images.</p>
          </EmptyState>
        </Card>
      </BlockStack>
    );
  }

  return (
    <BlockStack gap="500">
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Product Images
        </Text>
        <Text as="p" tone="subdued">
          {totalImages} image{totalImages !== 1 ? 's' : ''} across{' '}
          {products.length} product{products.length !== 1 ? 's' : ''}. Drag to
          reorder.
        </Text>
      </BlockStack>

      {products.map((product) => {
        // Combine imageUrl and imageUrls, ensuring no duplicates
        const allImages = product.imageUrls || [];
        if (product.imageUrl && !allImages.includes(product.imageUrl)) {
          allImages.unshift(product.imageUrl);
        }

        return (
          <Card key={product.id}>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  {allImages[0] && (
                    <div className={styles.productThumbnail}>
                      <img src={allImages[0]} alt={product.title} />
                    </div>
                  )}
                  <BlockStack gap="100">
                    <Text as="h4" variant="headingSm">
                      {product.title}
                    </Text>
                    <Badge tone="info">{`${allImages.length} images`}</Badge>
                  </BlockStack>
                </InlineStack>
              </InlineStack>

              <ProductImageGrid productId={product.id} imageUrls={allImages} sessionId={sessionId} />

              <FileUpload productId={product.id} sessionId={sessionId} />
            </BlockStack>
          </Card>
        );
      })}
    </BlockStack>
  );
}
