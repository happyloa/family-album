import { NextRequest } from 'next/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  PATCH,
  POST,
  validateCreateFolder,
  validateMoveTarget,
  validateRenameFolder
} from './route';

import { MAX_FOLDER_NAME_LENGTH } from '@/components/media/constants';
import { moveFile, moveFolder, renameFile, renameFolder, createFolder } from '@/lib/r2';

vi.mock('@/lib/r2', () => ({
  createFolder: vi.fn(async (prefix: string, name: string) => ({ key: `${prefix ? `${prefix}/` : ''}${name}/` })),
  deleteFile: vi.fn(),
  deleteFolder: vi.fn(),
  listMedia: vi.fn(),
  moveFile: vi.fn(async (key: string, targetPrefix: string) => ({ key: `${targetPrefix}${key}` })),
  moveFolder: vi.fn(async (key: string, targetPrefix: string) => ({ key: `${targetPrefix ? `${targetPrefix}/` : ''}${key}` })),
  renameFile: vi.fn(async (key: string, newName: string) => ({ key: key.replace(/[^/]+$/, newName) })),
  renameFolder: vi.fn(async (key: string, newName: string) => ({ key: key.replace(/[^/]+\/?$/, `${newName}/`) }))
}));

const createRequest = (method: 'POST' | 'PATCH', body: Record<string, unknown>) =>
  new NextRequest('https://example.com/api/media', {
    method,
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-admin-token': 'admin-token'
    }
  });

const longName = 'a'.repeat(MAX_FOLDER_NAME_LENGTH + 1);

describe('media route validation helpers', () => {
  it('validates create requests', () => {
    expect(validateCreateFolder('albums', 'new-folder')).toBeNull();
    expect(validateCreateFolder('albums/2024', longName)).toBe('資料夾名稱最多 30 個字');
    expect(validateCreateFolder('albums/2024', 'april')).toBe('資料夾層數最多兩層，無法在此建立新資料夾');
  });

  it('validates rename requests for folders only', () => {
    expect(validateRenameFolder(true, longName)).toBe('資料夾名稱最多 30 個字');
    expect(validateRenameFolder(true, 'short-name')).toBeNull();
    expect(validateRenameFolder(false, longName)).toBeNull();
  });

  it('validates move targets', () => {
    expect(validateMoveTarget('too/deep/path', false)).toBe('資料夾層數最多兩層，請選擇較淺的目標路徑');
    expect(validateMoveTarget('albums/2024', true)).toBe('移動後會超過資料夾層數上限（2 層）');
    expect(validateMoveTarget('albums', true)).toBeNull();
    expect(validateMoveTarget('', false)).toBeNull();
  });
});

describe('media route handlers', () => {
  beforeEach(() => {
    process.env.ADMIN_ACCESS_TOKEN = 'admin-token';
    vi.clearAllMocks();
  });

  it('returns 400 when creating a folder with an invalid name', async () => {
    const request = createRequest('POST', { action: 'create-folder', name: longName, prefix: '' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '資料夾名稱最多 30 個字' });
    expect(createFolder).not.toHaveBeenCalled();
  });

  it('allows creating a folder when within constraints', async () => {
    const request = createRequest('POST', { action: 'create-folder', name: 'new', prefix: 'albums' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(createFolder).toHaveBeenCalledWith('albums', 'new');
  });

  it('returns 400 when renaming a folder beyond the length limit', async () => {
    const request = createRequest('PATCH', {
      action: 'rename',
      key: 'albums/2024/',
      isFolder: true,
      newName: longName
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '資料夾名稱最多 30 個字' });
    expect(renameFolder).not.toHaveBeenCalled();
    expect(renameFile).not.toHaveBeenCalled();
  });

  it('returns 400 when moving into a too-deep target', async () => {
    const request = createRequest('PATCH', {
      action: 'move',
      key: 'albums/2024',
      isFolder: true,
      targetPrefix: 'too/deep/path'
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '資料夾層數最多兩層，請選擇較淺的目標路徑' });
    expect(moveFolder).not.toHaveBeenCalled();
    expect(moveFile).not.toHaveBeenCalled();
  });

  it('returns 400 when moving a folder would exceed depth', async () => {
    const request = createRequest('PATCH', {
      action: 'move',
      key: 'albums/2024',
      isFolder: true,
      targetPrefix: 'albums/2024'
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '移動後會超過資料夾層數上限（2 層）' });
  });

  it('allows moving within allowed depth', async () => {
    const request = createRequest('PATCH', {
      action: 'move',
      key: 'albums/2024',
      isFolder: true,
      targetPrefix: 'albums'
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(moveFolder).toHaveBeenCalledWith('albums/2024', 'albums');
  });
});
