'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GenerationListItem } from '@/types';
import styles from './RecentGenerations.module.css';

interface RecentGenerationsProps {
  shopDomain: string;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getStatusLabel(generation: GenerationListItem): { label: string; tone: string } {
  const { status, editorSession } = generation;
  if (status === 'failed') return { label: 'Failed', tone: 'critical' };
  if (status === 'analyzing' || status === 'editing') return { label: 'In Progress', tone: 'attention' };
  if (editorSession?.status === 'imported') return { label: 'Imported', tone: 'success' };
  return { label: 'Ready', tone: 'info' };
}

export function RecentGenerations({ shopDomain }: RecentGenerationsProps) {
  const router = useRouter();
  const [generations, setGenerations] = useState<GenerationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGenerations() {
      try {
        const response = await fetch(`/api/generations?shop=${shopDomain}&limit=5`);
        const data = await response.json();
        setGenerations(data.generations);
      } catch (error) {
        console.error('Failed to fetch generations:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGenerations();
  }, [shopDomain]);

  const handleClick = (generationId: string) => {
    router.push(`/generate?shop=${shopDomain}&generationId=${generationId}`);
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (generations.length === 0) {
    return <p className={styles.empty}>No generations yet. Start by creating your first one!</p>;
  }

  return (
    <ul className={styles.list}>
      {generations.map((gen) => {
        const status = getStatusLabel(gen);
        return (
          <li key={gen.id} className={styles.item} onClick={() => handleClick(gen.id)}>
            <span className={styles.title}>{getHostname(gen.sourceUrl)}</span>
            <span className={`${styles.status} ${styles[status.tone]}`}>{status.label}</span>
            <span className={styles.time}>{getRelativeTime(gen.createdAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}
