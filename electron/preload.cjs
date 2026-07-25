const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('screenTimeout', {
  get: () => ipcRenderer.invoke('display-timeout:get'),
  set: (minutes) => ipcRenderer.invoke('display-timeout:set', minutes),
})
