const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  get: (key) => ipcRenderer.invoke('store-get', key),
  set: (key, value) => ipcRenderer.invoke('store-set', key, value),
  onInitDates: (cb) => ipcRenderer.on('init-dates', (_, stats, settings, data, projectListData) => cb(stats, settings, data, projectListData)),
  submitWork: (tasks) => ipcRenderer.invoke('submitWork', tasks)
});
