const { app, BrowserWindow, Menu, Tray, ipcMain, screen } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const {
  allowedMinutes,
  getDisplayTimeouts,
  setDisplayTimeouts,
} = require('./power-settings.cjs')

let mainWindow
let tray
let positionSaveTimer
let isQuitting = false
const WINDOW_WIDTH = 260
const WINDOW_HEIGHT = 82
const LOGIN_ITEM_NAME = '熄屏快捷框'

function getPositionFile() {
  return path.join(app.getPath('userData'), 'window-position.json')
}

function getSettingsFile() {
  return path.join(app.getPath('userData'), 'app-settings.json')
}

function loadAppSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsFile(), 'utf8'))
  } catch {
    return {}
  }
}

function saveAppSettings(settings) {
  fs.writeFileSync(getSettingsFile(), JSON.stringify(settings))
}

function getLoginExecutable() {
  // electron-builder portable target exposes the stable launcher path here.
  // Source: https://www.electron.build/nsis/#portable
  return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
}

function getLoginItemSettings() {
  return app.getLoginItemSettings({
    path: getLoginExecutable(),
    args: [],
  })
}

function isOpenAtLogin(settings = getLoginItemSettings()) {
  const targetPath = path.normalize(getLoginExecutable()).toLocaleLowerCase()
  return Boolean(settings.launchItems?.some((item) =>
    item.enabled &&
    path.normalize(item.path).toLocaleLowerCase() === targetPath &&
    item.args.length === 0,
  ))
}

function setOpenAtLogin(openAtLogin) {
  // Source: https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows
  app.setLoginItemSettings({
    openAtLogin,
    path: getLoginExecutable(),
    args: [],
    name: LOGIN_ITEM_NAME,
  })
  saveAppSettings({ ...loadAppSettings(), openAtLogin })
  return isOpenAtLogin()
}

function initializeLoginItem() {
  const saved = loadAppSettings()
  const current = getLoginItemSettings()
  const ownItem = current.launchItems?.find(({ name }) => name === LOGIN_ITEM_NAME)
  let desired = saved.openAtLogin ?? true

  // Respect a user disabling the entry from Windows Settings or Task Manager.
  if (desired && ownItem?.enabled === false) desired = false

  if (isOpenAtLogin(current) !== desired) {
    app.setLoginItemSettings({
      openAtLogin: desired,
      path: getLoginExecutable(),
      args: [],
      name: LOGIN_ITEM_NAME,
    })
  }

  saveAppSettings({ ...saved, openAtLogin: desired })
}

function loadPosition() {
  try {
    const saved = JSON.parse(fs.readFileSync(getPositionFile(), 'utf8'))
    const pointIsVisible = screen
      .getAllDisplays()
      .some(({ workArea }) =>
        saved.x >= workArea.x &&
        saved.y >= workArea.y &&
        saved.x < workArea.x + workArea.width &&
        saved.y < workArea.y + workArea.height,
      )
    return pointIsVisible ? saved : undefined
  } catch {
    return undefined
  }
}

function savePosition() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const { x, y } = mainWindow.getBounds()
  fs.writeFileSync(getPositionFile(), JSON.stringify({ x, y }))
}

function schedulePositionSave() {
  clearTimeout(positionSaveTimer)
  positionSaveTimer = setTimeout(savePosition, 180)
}

function refreshCurrentSettings() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload()
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
}

function toggleMainWindow() {
  if (mainWindow?.isVisible()) hideMainWindow()
  else showMainWindow()
}

function quitApp() {
  isQuitting = true
  app.quit()
}

function toggleLoginItem({ checked }) {
  setOpenAtLogin(checked)
  updateTrayMenu()
}

function showContextMenu() {
  const loginEnabled = isOpenAtLogin()
  Menu.buildFromTemplate([
    { label: '重新读取当前设置', click: refreshCurrentSettings },
    { type: 'separator' },
    {
      label: '开机自动启动',
      type: 'checkbox',
      checked: loginEnabled,
      click: toggleLoginItem,
    },
    { type: 'separator' },
    { label: '退出熄屏快捷框', click: quitApp },
  ]).popup({ window: mainWindow })
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? '隐藏快捷框' : '显示快捷框',
      click: toggleMainWindow,
    },
    { label: '重新读取当前设置', click: refreshCurrentSettings },
    { type: 'separator' },
    {
      label: '开机自动启动',
      type: 'checkbox',
      checked: isOpenAtLogin(),
      click: toggleLoginItem,
    },
    { type: 'separator' },
    { label: '退出熄屏快捷框', click: quitApp },
  ]))
}

function createTray() {
  // Windows tray icons render best from an ICO source.
  // Source: https://www.electronjs.org/docs/latest/api/tray#platform-considerations
  tray = new Tray(path.join(__dirname, '..', 'assets', 'app-icon.ico'))
  tray.setToolTip('熄屏快捷框')
  tray.on('click', toggleMainWindow)
  updateTrayMenu()
}

function createWindow() {
  const savedPosition = loadPosition()
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_WIDTH,
    maxWidth: WINDOW_WIDTH,
    minHeight: WINDOW_HEIGHT,
    maxHeight: WINDOW_HEIGHT,
    useContentSize: true,
    ...(savedPosition ?? {}),
    title: '熄屏快捷框',
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    alwaysOnTop: false,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, '..', 'assets', 'app-icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.setMenu(null)
  // Source: https://www.electronjs.org/docs/latest/api/browser-window#winsetskiptaskbarskip-macos-windows
  mainWindow.setSkipTaskbar(true)
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())
  mainWindow.webContents.on('context-menu', showContextMenu)
  mainWindow.on('system-context-menu', (event) => {
    event.preventDefault()
    showContextMenu()
  })
  mainWindow.on('moved', schedulePositionSave)
  mainWindow.on('show', updateTrayMenu)
  mainWindow.on('hide', updateTrayMenu)
  mainWindow.on('minimize', () => setImmediate(hideMainWindow))
  mainWindow.on('close', (event) => {
    clearTimeout(positionSaveTimer)
    savePosition()
    if (!isQuitting) {
      event.preventDefault()
      hideMainWindow()
    }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.handle('display-timeout:get', () => getDisplayTimeouts())
ipcMain.handle('display-timeout:set', (_event, minutes) => {
  if (!Number.isInteger(minutes) || !allowedMinutes.has(minutes)) {
    throw new TypeError('无效的屏幕关闭时间。')
  }
  return setDisplayTimeouts(minutes)
})

// Source: https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelockadditionaldata
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)
  app.on('before-quit', () => { isQuitting = true })
  app.whenReady().then(() => {
    initializeLoginItem()
    createWindow()
    createTray()
    app.on('activate', showMainWindow)
  })

  // Keep the tray process alive if the window is hidden or closed.
  // Source: https://www.electronjs.org/docs/latest/tutorial/tray#minimizing-to-tray
  app.on('window-all-closed', () => {})
}
