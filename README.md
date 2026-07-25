<p align="center">
  <img src="assets/app-icon.png" width="128" alt="Screen Timeout Glass icon">
</p>

# Screen Timeout Glass

Change when your screen turns off without digging through Windows Settings.

Screen Timeout Glass is a tiny desktop bar with three buttons: **1min**, **5min**, and **1H**. Click once and the new screen timeout is applied right away.

It uses the default look and feel of [liquid-glass-react](https://github.com/rdev/liquid-glass-react), stays out of the taskbar, and lives quietly in the system tray when hidden.

> **Windows x64 only.** This project does not make 32-bit, ARM64, macOS, or Linux builds.

## Why it is useful

- Change the screen timeout in one click.
- Keep a small, clean glass bar on the desktop.
- Drag it from any empty space or edge without pointer drift.
- Hide it to the tray instead of filling the taskbar.
- Start it with Windows by default, or turn that off from the right-click menu.
- Change only the plugged-in desktop setting. Battery settings are never read or changed.

## Download

Download the latest portable `.exe` from [GitHub Releases](https://github.com/hybtc8888/screen-timeout-glass/releases/latest).

There is no installer. Put the file in a folder where you plan to keep it, then run it. The startup entry points to that exact file, so moving it later means you should run it again and re-enable **Start with Windows** from the right-click menu.

The current build is not code-signed. Windows may show a SmartScreen warning when you open it for the first time.

## How to use it

- Click **1min**, **5min**, or **1H** to set the screen timeout.
- Drag the bar from its edge or the small gaps around the buttons.
- Right-click the bar to refresh the current setting, turn startup on or off, or exit.
- Click the tray icon to show or hide the bar.
- Closing or minimizing the bar hides it in the tray. Opening the app again brings back the existing window instead of starting a duplicate.

## What it changes

The app uses Windows `powercfg` to update `monitor-timeout-ac` for the active power plan. That is the plugged-in screen timeout.

It does not read or change `monitor-timeout-dc`, so battery settings are left alone.

## Build from source

You need Windows x64 and Node.js 22.12 or newer.

```powershell
npm ci
npm test
npm run dist
```

The build output is:

```text
release/熄屏快捷框-1.2.7-Windows-x64-便携版.exe
```

`npm run dist` is deliberately locked to a Windows portable x64 build.

## Tech used

- Electron
- React
- Vite
- [liquid-glass-react](https://github.com/rdev/liquid-glass-react)

The app runs locally. It has no account, analytics, or cloud service.
