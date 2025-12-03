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

  const hasItems = files.length > 0 || folders.length > 0;

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
      <div className="card media-toolbar">
        <div className="toolbar-header">
          <div>
            <p className="badge" style={{ margin: 0 }}>家庭相簿 · R2 即時同步</p>
            <h2 style={{ margin: '0.5rem 0 0' }}>資料夾與媒體管理</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'rgba(229, 231, 235, 0.8)' }}>
              重新命名、切換資料夾或上傳，所有操作都直接作用在 Cloudflare R2 貯體中。
            </p>
          </div>
          <div className="toolbar-actions">
            <button className="btn subtle" onClick={handleBack} disabled={!currentPrefix}>
              ← 返回上一層
            </button>
            <button className="btn" onClick={() => loadMedia(currentPrefix)} disabled={loading}>
              {loading ? '載入中...' : '重新整理列表'}
            </button>
          </div>
        </div>

        <div className="breadcrumb-row">
          <span className="label">目前路徑</span>
          <div className="breadcrumb">
            <button className="crumb" onClick={() => setCurrentPrefix('')}>
              根目錄
            </button>
            {breadcrumb.map((crumb) => (
              <button key={crumb.key} className="crumb" onClick={() => setCurrentPrefix(crumb.key)}>
                {crumb.label}
              </button>
            ))}
          </div>
          <div className="badge" style={{ marginLeft: 'auto' }}>
            📁 {folders.length} 個資料夾 · 🖼️ {files.length} 個媒體檔案
          </div>
        </div>

        <div className="panel-grid">
          <div className="card" style={{ margin: 0 }}>
            <div className="panel-heading">
              <div>
                <p className="label">建立資料夾</p>
                <h3 style={{ margin: '0.25rem 0 0' }}>整理新的分類</h3>
              </div>
              <span className="pill">立即生效</span>
            </div>
            <p className="muted">會在 R2 中建立虛擬資料夾，方便按照旅行、年份或活動分類。</p>
            <div className="inline-form">
              <input
                className="input"
                style={{ flex: 1, minWidth: '160px', marginBottom: 0 }}
                type="text"
                value={newFolderName}
                placeholder="輸入資料夾名稱（例如：taiwan-trip）"
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
      {message && <p className="notice warning">{message}</p>}
      {loading && <p className="notice">正在載入媒體...</p>}
      {!loading && !hasItems && (
        <p className="notice" style={{ textAlign: 'center' }}>
          目前還沒有任何媒體，先上傳一張照片或影片吧！
        </p>
      )}

      {folders.length > 0 && (
        <div className="collection">
          <div className="section-heading">
            <h3>資料夾</h3>
            <p className="muted">點擊可直接進入，名稱會同步更新到 R2。</p>
          </div>
          <div className="grid gallery-grid">
            {folders.map((folder) => (
              <article
                key={folder.key}
                className="folder-card"
                role="button"
                tabIndex={0}
                onClick={() => handleEnterFolder(folder.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleEnterFolder(folder.key);
                  }
                }}
              >
                <div className="folder-top">
                  <div className="folder-icon">📂</div>
                  <div className="folder-text">
                    <p className="label">Folder</p>
                    <h4>{folder.name || '未命名'}</h4>
                    <p className="muted folder-path">{folder.key || '根目錄'}</p>
                  </div>
                </div>
                <div className="folder-actions">
                  <button
                    className="text-btn"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      promptRename(folder.key, true);
                    }}
                  >
                    重新命名
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="collection">
          <div className="section-heading">
            <h3>媒體檔案</h3>
            <p className="muted">照片、影片會直接從 R2 讀取，重新命名後即可馬上生效。</p>
          </div>
          <div className="grid gallery-grid">
            {files.map((item) => (
              <article key={item.key} className="media-card">
                <div className="media-thumb">
                  {item.type === 'image' ? (
                    <Image src={item.url} alt={item.key} fill sizes="(max-width: 768px) 100vw, 33vw" priority />
                  ) : (
                    <video src={item.url} controls preload="metadata" />
                  )}
                </div>
                <footer>
                  <div className="media-meta">
                    <span className="pill outline">{item.type === 'image' ? 'Image' : 'Video'}</span>
                    {item.size && <small className="muted">{(item.size / 1024 / 1024).toFixed(1)} MB</small>}
                  </div>
                  <div className="media-title">{item.key.split('/').pop()}</div>
                  <div className="media-meta">
                    {item.lastModified && <small className="muted">{new Date(item.lastModified).toLocaleString()}</small>}
                    <button className="text-btn" type="button" onClick={() => promptRename(item.key, false)}>
                      重新命名
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
