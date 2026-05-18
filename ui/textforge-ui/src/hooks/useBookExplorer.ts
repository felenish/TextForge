import { useState } from 'react';
import type { BookDto, SceneMetaDto } from '../api/books';
import * as booksApi from '../api/books';
import * as chaptersApi from '../api/chapters';
import * as scenesApi from '../api/scenes';
import * as shellApi from '../api/shell';

export interface UseBookExplorerResult {
  book: BookDto | null;
  loading: boolean;
  error: string | null;
  createBook: () => Promise<void>;
  openBook: () => Promise<void>;
  addChapter: (title: string) => Promise<void>;
  renameChapter: (id: string, title: string) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  addScene: (chapterId: string, title: string) => Promise<void>;
  renameScene: (id: string, title: string) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
}

export function useBookExplorer(): UseBookExplorerResult {
  const [book, setBook] = useState<BookDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  const createBook = () => run(async () => {
    const folder = await shellApi.openFolderDialog('Choose book location');
    if (!folder) return;
    const title = window.prompt('Book title:');
    if (!title?.trim()) return;
    setBook(await booksApi.createBook(title.trim(), folder));
  });

  const openBook = () => run(async () => {
    const path = await shellApi.openFileDialog('Open Book', 'TextForge Book (*.tfbook)|*.tfbook');
    if (!path) return;
    setBook(await booksApi.openBook(path));
  });

  const addChapter = (title: string) => run(async () => {
    if (!book) return;
    const chapter = await chaptersApi.addChapter(book.id, title);
    setBook(b => b ? { ...b, chapters: [...b.chapters, chapter] } : b);
  });

  const renameChapter = (id: string, newTitle: string) => run(async () => {
    if (!book) return;
    const prevTitle = book.chapters.find(c => c.id === id)?.title ?? newTitle;
    setBook(b => b ? {
      ...b,
      chapters: b.chapters.map(c => c.id === id ? { ...c, title: newTitle } : c),
    } : b);
    try {
      await chaptersApi.updateChapter(book.id, id, newTitle);
    } catch (e) {
      setBook(b => b ? {
        ...b,
        chapters: b.chapters.map(c => c.id === id ? { ...c, title: prevTitle } : c),
      } : b);
      throw e;
    }
  });

  const deleteChapter = (id: string) => run(async () => {
    if (!book) return;
    await chaptersApi.deleteChapter(book.id, id);
    setBook(b => b ? { ...b, chapters: b.chapters.filter(c => c.id !== id) } : b);
  });

  const addScene = (chapterId: string, title: string) => run(async () => {
    if (!book) return;
    const scene = await scenesApi.addScene(book.id, chapterId, title);
    const meta: SceneMetaDto = { id: scene.id, title: scene.title, sortOrder: scene.sortOrder };
    setBook(b => b ? {
      ...b,
      chapters: b.chapters.map(c =>
        c.id === chapterId ? { ...c, scenes: [...c.scenes, meta] } : c
      ),
    } : b);
  });

  const renameScene = (id: string, newTitle: string) => run(async () => {
    if (!book) return;
    const prevTitle = book.chapters.flatMap(c => c.scenes).find(s => s.id === id)?.title ?? newTitle;
    setBook(b => b ? {
      ...b,
      chapters: b.chapters.map(c => ({
        ...c,
        scenes: c.scenes.map(s => s.id === id ? { ...s, title: newTitle } : s),
      })),
    } : b);
    try {
      await scenesApi.renameScene(id, newTitle);
    } catch (e) {
      setBook(b => b ? {
        ...b,
        chapters: b.chapters.map(c => ({
          ...c,
          scenes: c.scenes.map(s => s.id === id ? { ...s, title: prevTitle } : s),
        })),
      } : b);
      throw e;
    }
  });

  const deleteScene = (id: string) => run(async () => {
    await scenesApi.deleteScene(id);
    setBook(b => b ? {
      ...b,
      chapters: b.chapters.map(c => ({
        ...c,
        scenes: c.scenes.filter(s => s.id !== id),
      })),
    } : b);
  });

  return {
    book, loading, error,
    createBook, openBook,
    addChapter, renameChapter, deleteChapter,
    addScene, renameScene, deleteScene,
  };
}
