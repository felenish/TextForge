import { useState } from 'react';
import type { SeriesDto } from '../api/series';
import type { BookDto, SceneMetaDto } from '../api/books';
import * as booksApi from '../api/books';
import * as seriesApi from '../api/series';
import * as chaptersApi from '../api/chapters';
import * as scenesApi from '../api/scenes';
import * as shellApi from '../api/shell';
import { useToast } from '../contexts/ToastContext';

export interface UseSeriesExplorerResult {
  series: SeriesDto | null;
  loading: boolean;
  error: string | null;
  createSeries: () => Promise<void>;
  openSeries: () => Promise<void>;
  addBook: () => Promise<void>;
  renameBook: (bookId: string, title: string) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  addChapter: (bookId: string, title: string) => Promise<void>;
  renameChapter: (bookId: string, chapterId: string, title: string) => Promise<void>;
  deleteChapter: (bookId: string, chapterId: string) => Promise<void>;
  addScene: (bookId: string, chapterId: string, title: string) => Promise<void>;
  renameScene: (bookId: string, sceneId: string, title: string) => Promise<void>;
  deleteScene: (bookId: string, sceneId: string) => Promise<void>;
}

export function useSeriesExplorer(): UseSeriesExplorerResult {
  const [series, setSeries] = useState<SeriesDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function run(fn: () => Promise<void>): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      const message = (e as { message?: string }).message ?? 'An error occurred.';
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  }

  const patchBook = (bookId: string, fn: (b: BookDto) => BookDto) =>
    setSeries(s => s ? { ...s, books: s.books.map(b => b.id === bookId ? fn(b) : b) } : s);

  const createSeries = () => run(async () => {
    const folder = await shellApi.openFolderDialog('Choose series location');
    if (!folder) return;
    const title = window.prompt('Series title:');
    if (!title?.trim()) return;
    setSeries(await seriesApi.createSeries(title.trim(), folder));
  });

  const openSeries = () => run(async () => {
    const path = await shellApi.openFileDialog('Open Series', 'TextForge Series (*.tfseries)|*.tfseries');
    if (!path) return;
    setSeries(await seriesApi.openSeries(path));
  });

  const addBook = () => run(async () => {
    const title = window.prompt('Book title:');
    if (!title?.trim()) return;
    const book = await seriesApi.addBookToSeries(title.trim());
    setSeries(s => s ? { ...s, books: [...s.books, book] } : s);
  });

  const renameBook = (bookId: string, newTitle: string) => run(async () => {
    const prevTitle = series?.books.find(b => b.id === bookId)?.title ?? newTitle;
    setSeries(s => s ? { ...s, books: s.books.map(b => b.id === bookId ? { ...b, title: newTitle } : b) } : s);
    try {
      await booksApi.renameBook(bookId, newTitle);
    } catch (e) {
      setSeries(s => s ? { ...s, books: s.books.map(b => b.id === bookId ? { ...b, title: prevTitle } : b) } : s);
      throw e;
    }
  });

  const deleteBook = (bookId: string) => run(async () => {
    await seriesApi.removeBook(bookId);
    setSeries(s => s ? { ...s, books: s.books.filter(b => b.id !== bookId) } : s);
  });

  const addChapter = (bookId: string, title: string) => run(async () => {
    const chapter = await chaptersApi.addChapter(bookId, title);
    patchBook(bookId, b => ({ ...b, chapters: [...b.chapters, chapter] }));
  });

  const renameChapter = (bookId: string, chapterId: string, newTitle: string) => run(async () => {
    const prevTitle = series?.books.find(b => b.id === bookId)
      ?.chapters.find(c => c.id === chapterId)?.title ?? newTitle;
    patchBook(bookId, b => ({ ...b, chapters: b.chapters.map(c => c.id === chapterId ? { ...c, title: newTitle } : c) }));
    try {
      await chaptersApi.updateChapter(bookId, chapterId, newTitle);
    } catch (e) {
      patchBook(bookId, b => ({ ...b, chapters: b.chapters.map(c => c.id === chapterId ? { ...c, title: prevTitle } : c) }));
      throw e;
    }
  });

  const deleteChapter = (bookId: string, chapterId: string) => run(async () => {
    await chaptersApi.deleteChapter(bookId, chapterId);
    patchBook(bookId, b => ({ ...b, chapters: b.chapters.filter(c => c.id !== chapterId) }));
  });

  const addScene = (bookId: string, chapterId: string, title: string) => run(async () => {
    const scene = await scenesApi.addScene(bookId, chapterId, title);
    const meta: SceneMetaDto = { id: scene.id, title: scene.title, sortOrder: scene.sortOrder, status: scene.status };
    patchBook(bookId, b => ({
      ...b,
      chapters: b.chapters.map(c => c.id === chapterId ? { ...c, scenes: [...c.scenes, meta] } : c),
    }));
  });

  const renameScene = (bookId: string, sceneId: string, newTitle: string) => run(async () => {
    const prevTitle = series?.books.find(b => b.id === bookId)
      ?.chapters.flatMap(c => c.scenes).find(s => s.id === sceneId)?.title ?? newTitle;
    const applyTitle = (title: string) =>
      patchBook(bookId, b => ({
        ...b,
        chapters: b.chapters.map(c => ({
          ...c,
          scenes: c.scenes.map(s => s.id === sceneId ? { ...s, title } : s),
        })),
      }));
    applyTitle(newTitle);
    try {
      await scenesApi.renameScene(sceneId, newTitle);
    } catch (e) {
      applyTitle(prevTitle);
      throw e;
    }
  });

  const deleteScene = (bookId: string, sceneId: string) => run(async () => {
    await scenesApi.deleteScene(sceneId);
    patchBook(bookId, b => ({
      ...b,
      chapters: b.chapters.map(c => ({ ...c, scenes: c.scenes.filter(s => s.id !== sceneId) })),
    }));
  });

  return {
    series, loading, error,
    createSeries, openSeries, addBook, renameBook, deleteBook,
    addChapter, renameChapter, deleteChapter,
    addScene, renameScene, deleteScene,
  };
}
