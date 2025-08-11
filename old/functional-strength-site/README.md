# Functional Strength Training (Minimalist Dark Mode)

A clean, modern, minimalist website (HTML + jQuery + Bootstrap) that lists common CrossFit-style functional movements, with a built-in countdown timer and a collapsible left pane.

> CrossFit® is a registered trademark of CrossFit, LLC. This project is not affiliated with CrossFit, LLC.

## Features
- **Dark mode** by default via Bootstrap 5.
- **Countdown timer** docked center-left with Start/Pause/Reset and minute/second inputs.
- **Collapsible left pane** with categories and exercises.
- **Client-side search** filter.
- **Data-driven**: exercises are loaded from `data/exercises.json` so you can update content without touching HTML/JS.

## File structure
```
functional-strength-site/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── data/
    └── exercises.json
```

## Local setup
Just open `index.html` in your browser. If you run into CORS issues loading `exercises.json`, launch a tiny static server:
```bash
# Python 3
python -m http.server 8000
# then visit http://localhost:8000/functional-strength-site/
```

## Customize
- Add/edit exercises in `data/exercises.json`.
- Adjust styles in `css/styles.css`.
- Modify interactivity in `js/app.js`.
