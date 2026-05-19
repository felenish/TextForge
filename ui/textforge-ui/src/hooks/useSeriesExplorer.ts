import { useState } from 'react';
import type { SeriesDto } from '../api/series';
import type { BookDto, SceneMetaDto } from '../api/books';
import type { CharacterDto } from '../api/characters';
import type { LocationDto } from '../api/locations';
import * as booksApi from '../api/books';
import * as seriesApi from '../api/series';
import * as chaptersApi from '../api/chapters';
import * as scenesApi from '../api/scenes';
import * as shellApi from '../api/shell';
import * as charactersApi from '../api/characters';
import * as locationsApi from '../api/locations';
import { useToast } from '../contexts/ToastContext';

export interface UseSeriesExplorerResult {
  series: SeriesDto | null;
  loading: boolean;
  error: string | null;
  characters: CharacterDto[];
  charactersLoaded: boolean;
  createSeries: () => Promise<void>;
  openSeries: () => Promise<void>;
  openSeriesFromPath: (path: string) => Promise<void>;
  closeSeries: () => Promise<void>;
  addBook: () => Promise<void>;
  renameBook: (bookId: string, title: string) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  addChapter: (bookId: string, title: string) => Promise<void>;
  renameChapter: (bookId: string, chapterId: string, title: string) => Promise<void>;
  deleteChapter: (bookId: string, chapterId: string) => Promise<void>;
  addScene: (bookId: string, chapterId: string, title: string) => Promise<void>;
  renameScene: (bookId: string, sceneId: string, title: string) => Promise<void>;
  deleteScene: (bookId: string, sceneId: string) => Promise<void>;
  loadCharacters: () => Promise<void>;
  addCharacter: (name: string, role: string) => Promise<void>;
  renameCharacter: (id: string, name: string) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  patchCharacterInList: (character: CharacterDto) => void;
  locations: LocationDto[];
  locationsLoaded: boolean;
  loadLocations: () => Promise<void>;
  addLocation: (name: string) => Promise<void>;
  renameLocation: (id: string, name: string) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  patchLocationInList: (location: LocationDto) => void;
}

export function useSeriesExplorer(): UseSeriesExplorerResult {
  const [series, setSeries] = useState<SeriesDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterDto[]>([]);
  const [charactersLoaded, setCharactersLoaded] = useState(false);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
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

  function resetSeries(s: SeriesDto | null) {
    setSeries(s);
    setCharacters([]);
    setCharactersLoaded(false);
    setLocations([]);
    setLocationsLoaded(false);
  }

  const createSeries = () => run(async () => {
    const folder = await shellApi.openFolderDialog('Choose series location');
    if (!folder) return;
    const title = window.prompt('Series title:');
    if (!title?.trim()) return;
    resetSeries(await seriesApi.createSeries(title.trim(), folder));
  });

  const openSeries = () => run(async () => {
    const path = await shellApi.openFileDialog('Open Series', 'TextForge Series (*.tfseries)|*.tfseries');
    if (!path) return;
    resetSeries(await seriesApi.openSeries(path));
  });

  const openSeriesFromPath = (path: string) => run(async () => {
    resetSeries(await seriesApi.openSeries(path));
  });

  const closeSeries = () => run(async () => {
    await seriesApi.closeSeries();
    resetSeries(null);
  });

  const loadCharacters = () => run(async () => {
    const list = await charactersApi.getCharacters();
    setCharacters(list);
    setCharactersLoaded(true);
  });

  const addCharacter = (name: string, role: string) => run(async () => {
    const character = await charactersApi.createCharacter(name, role);
    setCharacters(prev => [...prev, character].sort((a, b) => a.name.localeCompare(b.name)));
  });

  const renameCharacter = (id: string, name: string) => run(async () => {
    await charactersApi.updateCharacter(id, { name });
    setCharacters(prev =>
      prev.map(c => c.id === id ? { ...c, name } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
    );
  });

  const deleteCharacter = (id: string) => run(async () => {
    await charactersApi.deleteCharacter(id);
    setCharacters(prev => prev.filter(c => c.id !== id));
  });

  const patchCharacterInList = (character: CharacterDto) => {
    setCharacters(prev =>
      prev.map(c => c.id === character.id ? character : c)
          .sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const loadLocations = () => run(async () => {
    const list = await locationsApi.getLocations();
    setLocations(list);
    setLocationsLoaded(true);
  });

  const addLocation = (name: string) => run(async () => {
    const location = await locationsApi.createLocation(name);
    setLocations(prev => [...prev, location].sort((a, b) => a.name.localeCompare(b.name)));
  });

  const renameLocation = (id: string, name: string) => run(async () => {
    await locationsApi.updateLocation(id, { name });
    setLocations(prev =>
      prev.map(l => l.id === id ? { ...l, name } : l)
          .sort((a, b) => a.name.localeCompare(b.name))
    );
  });

  const deleteLocation = (id: string) => run(async () => {
    await locationsApi.deleteLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
  });

  const patchLocationInList = (location: LocationDto) => {
    setLocations(prev =>
      prev.map(l => l.id === location.id ? location : l)
          .sort((a, b) => a.name.localeCompare(b.name))
    );
  };

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
    characters, charactersLoaded,
    createSeries, openSeries, openSeriesFromPath, closeSeries,
    addBook, renameBook, deleteBook,
    addChapter, renameChapter, deleteChapter,
    addScene, renameScene, deleteScene,
    loadCharacters, addCharacter, renameCharacter, deleteCharacter, patchCharacterInList,
    locations, locationsLoaded,
    loadLocations, addLocation, renameLocation, deleteLocation, patchLocationInList,
  };
}
