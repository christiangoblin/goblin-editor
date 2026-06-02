import { openDB } from 'idb'

const DB_NAME    = 'goblin-editor'
const DB_VERSION = 1

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media', { keyPath: 'id' })
      }
    },
  })
  return _db
}

// ── Projects ──────────────────────────────────────────────

export async function saveProject(project) {
  const db = await getDB()
  await db.put('projects', { ...project, savedAt: Date.now() })
}

export async function loadProject(id) {
  const db = await getDB()
  return db.get('projects', id)
}

export async function listProjects() {
  const db = await getDB()
  return db.getAll('projects')
}

export async function deleteProject(id) {
  const db = await getDB()
  return db.delete('projects', id)
}

// ── Media blobs ───────────────────────────────────────────

export async function saveMediaBlob(id, blob) {
  const db = await getDB()
  await db.put('media', { id, blob, savedAt: Date.now() })
}

export async function loadMediaBlob(id) {
  const db = await getDB()
  const record = await db.get('media', id)
  if (!record) return null
  return URL.createObjectURL(record.blob)
}

export async function deleteMediaBlob(id) {
  const db = await getDB()
  return db.delete('media', id)
}
