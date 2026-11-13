# Local start scripts

One command starts everything you need to try the app on your computer.

## Windows + Android emulator

Needs (one time): Docker Desktop, .NET 10 SDK, Node, Android Studio with one emulator created, and the repo at a short path such as `C:\dev\tb` (long paths break the Android build).

| What | How |
| --- | --- |
| Start everything | Double-click `scripts\windows\start.cmd`, or paste `C:\dev\tb\scripts\windows\start.cmd` in PowerShell |
| Stop everything | Double-click `scripts\windows\stop.cmd` (database data is kept) |
| Start, but leave the emulator alone (phone plugged in) | `C:\dev\tb\scripts\windows\start.cmd -NoEmulator` |
| Pick an emulator | `C:\dev\tb\scripts\windows\start.cmd -Avd Pixel_8` |
| Rebuild the Android app (after a new native library) | `C:\dev\tb\scripts\windows\start.cmd -Rebuild` |
| Start, but without the back office | `C:\dev\tb\scripts\windows\start.cmd -NoBackOffice` |
| Stop but keep the emulator open | `C:\dev\tb\scripts\windows\stop.cmd -KeepEmulator` |

`start` does, skipping anything already running: Docker Desktop → PostgreSQL + PowerSync (`docker compose`) → database tables (`dotnet ef database update`) → API in its own window on http://localhost:5001 → back office in its own window on http://localhost:5173 → Android emulator → app with `npx expo start --dev-client --android` in its own window (the first time it runs `npx expo run:android` to build and install the app).

## Mac + iOS

Not written yet.
