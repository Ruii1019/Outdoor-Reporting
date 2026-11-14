# Outdoor Reporting

A React prototype for recording maintenance issues in parks, paths and other outdoor spaces.

## Current features

- View a list of reports and summary counts
- Create, edit and delete reports
- Filter reports by status and search by text
- Add a report location using the browser Geolocation API
- Attach an image using the browser file input / camera capture option
- Save report data in browser Local Storage

## Run the project

You need Node.js and npm installed.

```bash
npm install
npm run dev
```

Open the local address printed in the terminal (usually `http://localhost:5173`).

## Notes

This is the first working frontend stage. Data is currently stored in the browser on the device where the app is used. A backend, database, IndexedDB offline queue, service worker and installable PWA setup are planned as later development stages.

Location access normally requires permission and a secure context. `localhost` is treated as secure for local development. Camera capture behaviour depends on the browser and device.
