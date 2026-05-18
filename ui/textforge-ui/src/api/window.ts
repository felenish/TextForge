import { post } from './client';

export const minimizeWindow = (): Promise<void> => post('/api/window/minimize', {});
export const maximizeWindow = (): Promise<void> => post('/api/window/maximize', {});
export const closeWindow = (): Promise<void> => post('/api/window/close', {});
