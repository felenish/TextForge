import { useState } from 'react';
import type { SeriesDto } from '../api/series';
import type { BookDto, SceneMetaDto } from '../api/books';
import type { CharacterDto } from '../api/characters';
import type { LocationDto } from '../api/locations';
import type { OutlineDto } from '../api/outlines';
import type { PlotGridDto, PlotGridMeta } from '../api/plotGrids';
import * as booksApi from '../api/books';
import * as seriesApi from '../api/series';
import * as chaptersApi from '../api/chapters';
import * as scenesApi from '../api/scenes';
import * as shellApi from '../api/shell';
import * as charactersApi from '../api/characters';
import type { WorldFolderDto as CharacterFolderDto } from '../api/characters';
import * as locationsApi from '../api/locations';
import type { WorldFolderDto as LocationFolderDto } from '../api/locations';
import * as outlinesApi from '../api/outlines';
import * as plotGridsApi from '../api/plotGrids';
import { useToast } from '../contexts/ToastContext';
import { useDialog } from '../contexts/DialogContext';

export interface UseSeriesExplorerResult {
  series: SeriesDto | null;
  loading: boolean;
  error: string | null;
  networkError: boolean;
  clearNetworkError: () => void;
  characters: CharacterDto[];
  charactersLoaded: boolean;
  createSeries: () => Promise<void>;
  openSeries: () => Promise<void>;
  openSeriesFromPath: (path: string) => Promise<void>;
  closeSeries: () => Promise<void>;
  addBook: () => Promise<void>;
  renameBook: (bookId: string, title: string) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  reorderBooks: (ids: string[]) => void;
  addChapter: (bookId: string, title: string) => Promise<void>;
  renameChapter: (bookId: string, chapterId: string, title: string) => Promise<void>;
  deleteChapter: (bookId: string, chapterId: string) => Promise<void>;
  reorderChapters: (bookId: string, ids: string[]) => void;
  addScene: (bookId: string, chapterId: string, title: string) => Promise<void>;
  renameScene: (bookId: string, sceneId: string, title: string) => Promise<void>;
  deleteScene: (bookId: string, sceneId: string) => Promise<void>;
  reorderScenes: (bookId: string, chapterId: string, ids: string[]) => void;
  moveScene: (bookId: string, sceneId: string, targetChapterId: string, targetIndex: number) => void;
  loadCharacters: () => Promise<void>;
  addCharacter: (name: string, role: string) => Promise<void>;
  renameCharacter: (id: string, name: string) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  reorderCharacters: (ids: string[]) => void;
  patchCharacterInList: (character: CharacterDto) => void;
  characterFolders: CharacterFolderDto[];
  characterFoldersLoaded: boolean;
  loadCharacterFolders: () => Promise<void>;
  addCharacterFolder: (name: string) => Promise<void>;
  renameCharacterFolder: (id: string, name: string) => Promise<void>;
  deleteCharacterFolder: (id: string) => Promise<void>;
  reorderCharacterFolders: (ids: string[]) => void;
  setCharacterFolder: (characterId: string, folderId: string | null) => Promise<void>;
  locations: LocationDto[];
  locationsLoaded: boolean;
  loadLocations: () => Promise<void>;
  addLocation: (name: string) => Promise<void>;
  renameLocation: (id: string, name: string) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  reorderLocations: (ids: string[]) => void;
  patchLocationInList: (location: LocationDto) => void;
  locationFolders: LocationFolderDto[];
  locationFoldersLoaded: boolean;
  loadLocationFolders: () => Promise<void>;
  addLocationFolder: (name: string) => Promise<void>;
  renameLocationFolder: (id: string, name: string) => Promise<void>;
  deleteLocationFolder: (id: string) => Promise<void>;
  reorderLocationFolders: (ids: string[]) => void;
  setLocationFolder: (locationId: string, folderId: string | null) => Promise<void>;
  outlines: OutlineDto[];
  outlinesLoaded: boolean;
  loadOutlines: () => Promise<void>;
  addOutline: (name: string) => Promise<void>;
  renameOutline: (id: string, name: string) => Promise<void>;
  deleteOutline: (id: string) => Promise<void>;
  reorderOutlines: (ids: string[]) => void;
  patchOutlineInList: (outline: OutlineDto) => void;
  plotGrids: PlotGridMeta[];
  plotGridsLoaded: boolean;
  loadPlotGrids: () => Promise<void>;
  addPlotGrid: (name: string) => Promise<void>;
  renamePlotGrid: (id: string, name: string) => Promise<void>;
  deletePlotGrid: (id: string) => Promise<void>;
  reorderPlotGrids: (ids: string[]) => void;
  patchPlotGridInList: (dto: PlotGridDto) => void;
}

export function useSeriesExplorer(): UseSeriesExplorerResult {
  const [series, setSeries] = useState<SeriesDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [characters, setCharacters] = useState<CharacterDto[]>([]);
  const [charactersLoaded, setCharactersLoaded] = useState(false);
  const [characterFolders, setCharacterFolders] = useState<CharacterFolderDto[]>([]);
  const [characterFoldersLoaded, setCharacterFoldersLoaded] = useState(false);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [locationFolders, setLocationFolders] = useState<LocationFolderDto[]>([]);
  const [locationFoldersLoaded, setLocationFoldersLoaded] = useState(false);
  const [outlines, setOutlines] = useState<OutlineDto[]>([]);
  const [outlinesLoaded, setOutlinesLoaded] = useState(false);
  const [plotGrids, setPlotGrids] = useState<PlotGridMeta[]>([]);
  const [plotGridsLoaded, setPlotGridsLoaded] = useState(false);
  const { showToast } = useToast();
  const { prompt } = useDialog();

  async function run(fn: () => Promise<void>): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await fn();
      setNetworkError(false);
    } catch (e: unknown) {
      const err = e as { message?: string; name?: string };
      const message = err.message ?? 'An error occurred.';
      setError(message);
      showToast(message);
      const isNetwork = message === 'Failed to fetch' ||
        err.name === 'TimeoutError' || err.name === 'AbortError' ||
        message.toLowerCase().includes('networkerror');
      if (isNetwork) setNetworkError(true);
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
    setCharacterFolders([]);
    setCharacterFoldersLoaded(false);
    setLocations([]);
    setLocationsLoaded(false);
    setLocationFolders([]);
    setLocationFoldersLoaded(false);
    setOutlines([]);
    setOutlinesLoaded(false);
    setPlotGrids([]);
    setPlotGridsLoaded(false);
  }

  const createSeries = () => run(async () => {
    const folder = await shellApi.openFolderDialog('Choose series location');
    if (!folder) return;
    const title = await prompt({ title: 'New Series', placeholder: 'Series title', confirmLabel: 'Create' });
    if (!title) return;
    resetSeries(await seriesApi.createSeries(title, folder));
  });

  const openSeries = () => run(async () => {
    const path = await shellApi.openFileDialog('Open Series', 'TextForge Series (*.tfseries)|*.tfseries');
    if (!path) return;
    resetSeries(await seriesApi.openSeries(path));
    localStorage.setItem('tf-last-series', path);
  });

  const openSeriesFromPath = (path: string) => run(async () => {
    resetSeries(await seriesApi.openSeries(path));
    localStorage.setItem('tf-last-series', path);
  });

  const closeSeries = () => run(async () => {
    await seriesApi.closeSeries();
    localStorage.removeItem('tf-last-series');
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
    setCharacters(prev => prev.map(c => c.id === character.id ? character : c));
  };

  const reorderCharacters = (ids: string[]) => {
    setCharacters(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      const ordered = ids.map(id => map.get(id)).filter(Boolean) as CharacterDto[];
      const rest = prev.filter(c => !ids.includes(c.id));
      return [...ordered, ...rest];
    });
    charactersApi.reorderCharacters(ids).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder characters.')
    );
  };

  const loadCharacterFolders = () => run(async () => {
    const list = await charactersApi.getCharacterFolders();
    setCharacterFolders(list.sort((a, b) => a.sortOrder - b.sortOrder));
    setCharacterFoldersLoaded(true);
  });

  const addCharacterFolder = (name: string) => run(async () => {
    const folder: CharacterFolderDto = { id: crypto.randomUUID(), name, sortOrder: characterFolders.length + 1 };
    const updated = [...characterFolders, folder];
    await charactersApi.saveCharacterFolders(updated);
    setCharacterFolders(updated);
    setCharacterFoldersLoaded(true);
  });

  const renameCharacterFolder = (id: string, name: string) => run(async () => {
    const updated = characterFolders.map(f => f.id === id ? { ...f, name } : f);
    await charactersApi.saveCharacterFolders(updated);
    setCharacterFolders(updated);
  });

  const deleteCharacterFolder = (id: string) => run(async () => {
    const updated = characterFolders.filter(f => f.id !== id);
    await charactersApi.saveCharacterFolders(updated);
    setCharacterFolders(updated);
    setCharacters(prev => prev.map(c => c.folderId === id ? { ...c, folderId: null } : c));
  });

  const reorderCharacterFolders = (ids: string[]) => {
    const updated = ids
      .map(id => characterFolders.find(f => f.id === id))
      .filter(Boolean)
      .map((f, i) => ({ ...f!, sortOrder: i + 1 }));
    setCharacterFolders(updated);
    charactersApi.saveCharacterFolders(updated).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder folders.')
    );
  };

  const setCharacterFolder = (characterId: string, folderId: string | null) => run(async () => {
    const updated = await charactersApi.setCharacterFolder(characterId, folderId);
    setCharacters(prev => prev.map(c => c.id === characterId ? updated : c));
  });

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
    setLocations(prev => prev.map(l => l.id === location.id ? location : l));
  };

  const reorderLocations = (ids: string[]) => {
    setLocations(prev => {
      const map = new Map(prev.map(l => [l.id, l]));
      const ordered = ids.map(id => map.get(id)).filter(Boolean) as LocationDto[];
      const rest = prev.filter(l => !ids.includes(l.id));
      return [...ordered, ...rest];
    });
    locationsApi.reorderLocations(ids).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder locations.')
    );
  };

  const loadLocationFolders = () => run(async () => {
    const list = await locationsApi.getLocationFolders();
    setLocationFolders(list.sort((a, b) => a.sortOrder - b.sortOrder));
    setLocationFoldersLoaded(true);
  });

  const addLocationFolder = (name: string) => run(async () => {
    const folder: LocationFolderDto = { id: crypto.randomUUID(), name, sortOrder: locationFolders.length + 1 };
    const updated = [...locationFolders, folder];
    await locationsApi.saveLocationFolders(updated);
    setLocationFolders(updated);
    setLocationFoldersLoaded(true);
  });

  const renameLocationFolder = (id: string, name: string) => run(async () => {
    const updated = locationFolders.map(f => f.id === id ? { ...f, name } : f);
    await locationsApi.saveLocationFolders(updated);
    setLocationFolders(updated);
  });

  const deleteLocationFolder = (id: string) => run(async () => {
    const updated = locationFolders.filter(f => f.id !== id);
    await locationsApi.saveLocationFolders(updated);
    setLocationFolders(updated);
    setLocations(prev => prev.map(l => l.folderId === id ? { ...l, folderId: null } : l));
  });

  const reorderLocationFolders = (ids: string[]) => {
    const updated = ids
      .map(id => locationFolders.find(f => f.id === id))
      .filter(Boolean)
      .map((f, i) => ({ ...f!, sortOrder: i + 1 }));
    setLocationFolders(updated);
    locationsApi.saveLocationFolders(updated).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder folders.')
    );
  };

  const setLocationFolder = (locationId: string, folderId: string | null) => run(async () => {
    const updated = await locationsApi.setLocationFolder(locationId, folderId);
    setLocations(prev => prev.map(l => l.id === locationId ? updated : l));
  });

  const loadOutlines = () => run(async () => {
    const list = await outlinesApi.getOutlines();
    setOutlines(list);
    setOutlinesLoaded(true);
  });

  const addOutline = (name: string) => run(async () => {
    const outline = await outlinesApi.createOutline(name);
    setOutlines(prev => [...prev, outline].sort((a, b) => a.name.localeCompare(b.name)));
  });

  const renameOutline = (id: string, name: string) => run(async () => {
    await outlinesApi.updateOutline(id, { name });
    setOutlines(prev =>
      prev.map(o => o.id === id ? { ...o, name } : o)
          .sort((a, b) => a.name.localeCompare(b.name))
    );
  });

  const deleteOutline = (id: string) => run(async () => {
    await outlinesApi.deleteOutline(id);
    setOutlines(prev => prev.filter(o => o.id !== id));
  });

  const reorderOutlines = (ids: string[]) => {
    setOutlines(prev => {
      const map = new Map(prev.map(o => [o.id, o]));
      const ordered = ids.map(id => map.get(id)).filter(Boolean) as OutlineDto[];
      const rest = prev.filter(o => !ids.includes(o.id));
      return [...ordered, ...rest];
    });
    outlinesApi.reorderOutlines(ids).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder outlines.')
    );
  };

  const loadPlotGrids = () => run(async () => {
    const list = await plotGridsApi.getPlotGrids();
    setPlotGrids(list);
    setPlotGridsLoaded(true);
  });

  const addPlotGrid = (name: string) => run(async () => {
    const dto = await plotGridsApi.createPlotGrid(name);
    setPlotGrids(prev => [...prev, { id: dto.id, name: dto.name }].sort((a, b) => a.name.localeCompare(b.name)));
  });

  const renamePlotGrid = (id: string, name: string) => run(async () => {
    await plotGridsApi.updatePlotGrid(id, { name });
    setPlotGrids(prev =>
      prev.map(g => g.id === id ? { ...g, name } : g).sort((a, b) => a.name.localeCompare(b.name))
    );
  });

  const deletePlotGrid = (id: string) => run(async () => {
    await plotGridsApi.deletePlotGrid(id);
    setPlotGrids(prev => prev.filter(g => g.id !== id));
  });

  const patchPlotGridInList = (dto: PlotGridDto) => {
    setPlotGrids(prev => prev.map(g => g.id === dto.id ? { ...g, name: dto.name } : g));
  };

  const reorderPlotGrids = (ids: string[]) => {
    setPlotGrids(prev => {
      const map = new Map(prev.map(g => [g.id, g]));
      const ordered = ids.map(id => map.get(id)).filter(Boolean) as PlotGridMeta[];
      const rest = prev.filter(g => !ids.includes(g.id));
      return [...ordered, ...rest];
    });
    plotGridsApi.reorderPlotGrids(ids).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder plot grids.')
    );
  };

  const patchOutlineInList = (outline: OutlineDto) => {
    setOutlines(prev => prev.map(o => o.id === outline.id ? { ...o, name: outline.name } : o));
  };

  const addBook = () => run(async () => {
    const title = await prompt({ title: 'Add Book', placeholder: 'Book title', confirmLabel: 'Add' });
    if (!title) return;
    const book = await seriesApi.addBookToSeries(title);
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

  const reorderBooks = (ids: string[]) => {
    setSeries(s => {
      if (!s) return s;
      const ordered = ids.map(id => s.books.find(b => b.id === id)).filter(Boolean) as BookDto[];
      return { ...s, books: ordered };
    });
    seriesApi.reorderBooks(ids).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder books.')
    );
  };

  const reorderChapters = (bookId: string, ids: string[]) => {
    patchBook(bookId, b => {
      const ordered = ids.map(id => b.chapters.find(c => c.id === id)).filter(Boolean) as typeof b.chapters;
      return { ...b, chapters: ordered };
    });
    chaptersApi.reorderChapters(bookId, ids).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder chapters.')
    );
  };

  const reorderScenes = (bookId: string, chapterId: string, ids: string[]) => {
    patchBook(bookId, b => ({
      ...b,
      chapters: b.chapters.map(c => {
        if (c.id !== chapterId) return c;
        const ordered = ids.map(id => c.scenes.find(s => s.id === id)).filter(Boolean) as typeof c.scenes;
        return { ...c, scenes: ordered };
      }),
    }));
    chaptersApi.reorderScenes(bookId, chapterId, ids).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to reorder scenes.')
    );
  };

  const moveScene = (bookId: string, sceneId: string, targetChapterId: string, targetIndex: number) => {
    patchBook(bookId, b => {
      let moved: SceneMetaDto | undefined;
      const withoutScene = b.chapters.map(c => {
        const s = c.scenes.find(s => s.id === sceneId);
        if (s) { moved = s; return { ...c, scenes: c.scenes.filter(s => s.id !== sceneId) }; }
        return c;
      });
      if (!moved) return b;
      return {
        ...b,
        chapters: withoutScene.map(c => {
          if (c.id !== targetChapterId) return c;
          const scenes = [...c.scenes];
          scenes.splice(Math.min(targetIndex, scenes.length), 0, moved!);
          return { ...c, scenes };
        }),
      };
    });
    chaptersApi.moveScene(bookId, sceneId, targetChapterId, targetIndex).catch(e =>
      showToast((e as { message?: string }).message ?? 'Failed to move scene.')
    );
  };

  const clearNetworkError = () => setNetworkError(false);

  return {
    series, loading, error, networkError, clearNetworkError,
    characters, charactersLoaded,
    createSeries, openSeries, openSeriesFromPath, closeSeries,
    addBook, renameBook, deleteBook, reorderBooks,
    addChapter, renameChapter, deleteChapter, reorderChapters,
    addScene, renameScene, deleteScene, reorderScenes, moveScene,
    loadCharacters, addCharacter, renameCharacter, deleteCharacter,
    reorderCharacters, patchCharacterInList,
    characterFolders, characterFoldersLoaded,
    loadCharacterFolders, addCharacterFolder, renameCharacterFolder, deleteCharacterFolder,
    reorderCharacterFolders, setCharacterFolder,
    locations, locationsLoaded,
    loadLocations, addLocation, renameLocation, deleteLocation,
    reorderLocations, patchLocationInList,
    locationFolders, locationFoldersLoaded,
    loadLocationFolders, addLocationFolder, renameLocationFolder, deleteLocationFolder,
    reorderLocationFolders, setLocationFolder,
    outlines, outlinesLoaded,
    loadOutlines, addOutline, renameOutline, deleteOutline, reorderOutlines, patchOutlineInList,
    plotGrids, plotGridsLoaded,
    loadPlotGrids, addPlotGrid, renamePlotGrid, deletePlotGrid, reorderPlotGrids, patchPlotGridInList,
  };
}
