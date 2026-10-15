# Nexus Workspace

A student engineering workspace: dashboard, academics and GPA, tasks, focus timer, notes,
engineering lab calculators, resources, calendar, analytics, goals, profile, settings and backup.

Plain HTML, CSS and JavaScript. No build step, no dependencies. Data stays in your browser (localStorage).

## Run it
Open this folder in VS Code and start Live Server on `index.html`.

## Files
- `js/store.js`   data layer: validation, import/export, reset (localStorage keys `nexus.v1.*`)
- `js/ui.js`      modal forms, confirm dialogs, toasts
- `js/app.js`     sidebar and page router
- `js/*.js`       one file per section

## Back up your data
Use **Data Backup** in the sidebar to download a JSON file. Do this regularly: browser data is erased
by a Windows reset, clearing site data, or a private window. The source code is backed up by pushing this
folder to GitHub; your *data* is only backed up by the export.

## Status
Rebuilt from scratch after a drive reset (all code is newly implemented, none recovered).
