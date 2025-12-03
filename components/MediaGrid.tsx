'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { UploadForm } from './UploadForm';

type MediaFile = {
  key: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
  lastModified?: string;
};

type FolderItem = {
  key: string;
  name: string;
};

type MediaResponse = {
  prefix: string;
  folders: FolderItem[];
  files: MediaFile[];
};

export function MediaGrid({ refreshToken = 0 }: { refreshToken?: number }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [message, setMessage] = useState('');

  const breadcrumb = currentPrefix
    ? currentPrefix.split('/').filter(Boolean).map((part, index, arr) => ({
        label: part,
        key: arr.slice(0, index + 1).join('/')
      }))
    : [];

  const loadMedia = async (prefix = currentPrefix) => {
    setLoading(true);
    const response = await fetch(`/api/media?prefix=${encodeURIComponent(prefix)}`);
    if (!response.ok) {
      setMessage('無法載入媒體，請稍後再試。');
      setLoading(false);
      return;
    }

    const data: MediaResponse = await response.json();
    setFiles(data.files);
    setFolders(data.folders);
    setCurrentPrefix(data.prefix);
    setMessage('');
    setLoading(false);
  };

  useEffect(() => {
    void loadMedia(currentPrefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, currentPrefix]);

  const handleEnterFolder = (folderKey: string) => {
    setCurrentPrefix(folderKey);
  };

  const handleBack = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.join('/'));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setMessage('請輸入資料夾名稱');
      return;
    }

    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-folder', name: newFolderName, prefix: currentPrefix })
    });

    if (!response.ok) {
      setMessage('建立資料夾失敗');
      return;
    }

    setNewFolderName('');
    setMessage('');
    await loadMedia(currentPrefix);
  };

  const promptRename = async (key: string, isFolder: boolean) => {
    const currentName = key.split('/').pop() ?? key;
    const newName = window.prompt('輸入新名稱', currentName)?.trim();
    if (!newName || newName === currentName) return;

    const response = await fetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', key, newName, isFolder })
    });

    if (!response.ok) {
      setMessage('重新命名失敗，請稍後再試');
      return;
    }

    setMessage('');
    await loadMedia(currentPrefix);
  };

  return (
    <section className="section">
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p className="badge" style={{ margin: 0 }}>家庭相簿</p>
            <h2 style={{ margin: '0.5rem 0 0' }}>資料夾與媒體管理</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'rgba(229, 231, 235, 0.8)' }}>
              目錄結構與 Cloudflare R2 完全同步，重新命名也會更新遠端物件。
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleBack} disabled={!currentPrefix}>
              返回上層
            </button>
            <button className="btn" onClick={() => loadMedia(currentPrefix)} disabled={loading}>
              {loading ? '載入中...' : '重新整理'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>目前路徑：</span>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="badge" onClick={() => setCurrentPrefix('')} style={{ cursor: 'pointer' }}>
              根目錄
            </button>
            {breadcrumb.map((crumb) => (
              <button
                key={crumb.key}
                className="badge"
                onClick={() => setCurrentPrefix(crumb.key)}
                style={{ cursor: 'pointer' }}
              >
                {crumb.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>新增資料夾</h3>
            <p style={{ marginTop: 0, color: 'rgba(229, 231, 235, 0.8)' }}>
              會在 R2 中建立對應的虛擬資料夾，方便整理家族相簿。
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: '160px' }}
                type="text"
                value={newFolderName}
                placeholder="輸入資料夾名稱"
                onChange={(event) => setNewFolderName(event.target.value)}
              />
              <button className="btn" type="button" onClick={handleCreateFolder}>
                建立
              </button>
            </div>
          </div>

          <UploadForm currentPath={currentPrefix} onUploaded={() => loadMedia(currentPrefix)} />
        </div>
      </div>
      {message && <p style={{ color: '#fcd34d', margin: '0 0 0.75rem' }}>{message}</p>}
      {loading && <p style={{ textAlign: 'center', opacity: 0.8 }}>正在載入媒體...</p>}
      {!loading && files.length === 0 && folders.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.8 }}>目前還沒有任何媒體，先上傳一張照片或影片吧！</p>
      )}
      <div className="grid gallery-grid">
        {folders.map((folder) => (
          <article
            key={folder.key}
            className="media-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.5rem' }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}
            >
              📁 {folder.name}
            </div>
            <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" type="button" onClick={() => handleEnterFolder(folder.key)}>
                  開啟
                </button>
                <button className="btn" type="button" onClick={() => promptRename(folder.key, true)}>
                  重新命名
                </button>
              </div>
              <small style={{ opacity: 0.8 }}>{folder.key || '根目錄'}</small>
            </footer>
          </article>
        ))}

        {files.map((item) => (
          <article key={item.key} className="media-card">
            {item.type === 'image' ? (
              <Image src={item.url} alt={item.key} fill sizes="(max-width: 768px) 100vw, 33vw" priority />
            ) : (
              <video src={item.url} controls style={{ width: '100%', height: '100%' }} preload="metadata" />
            )}
            <footer>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.key.split('/').pop()}</span>
                {item.size && <small style={{ opacity: 0.8 }}>{(item.size / 1024 / 1024).toFixed(1)} MB</small>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                {item.lastModified && (
                  <small style={{ opacity: 0.75 }}>{new Date(item.lastModified).toLocaleString()}</small>
                )}
                <button className="btn" type="button" onClick={() => promptRename(item.key, false)}>
                  重新命名
                </button>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
