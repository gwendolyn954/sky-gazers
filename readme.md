# 🔭 Sky Gazers

Sky Gazers is an educational web app that lets users explore NASA's Astronomy Picture of the Day by date.

Built as a portfolio project, it uses NASA's APOD API and a Netlify Function to keep the API key secure.

## ✨ About

Sky Gazers was created as an interactive way for young students to explore astronomy and discover NASA imagery.

Built with ♡ by me @ Sweetpea Labs.

## 🚀 Features

* Browse NASA's Astronomy Picture of the Day by date
* Jump to today's image
* Select a random APOD
* View image details and descriptions
* Open available HD images
* Responsive mission-control inspired interface

## 🛠️ Built With

* HTML
* CSS
* JavaScript
* NASA APOD API
* Netlify Functions
* Netlify

## 🔐 API Security

The NASA API key is stored as a Netlify environment variable and is accessed through a server-side Netlify Function.


## 🌠 How It Works

```text
Browser
   ↓
Netlify Function
   ↓
NASA APOD API
```

## 📁 Project Structure

```text
sky-gazers/
├── index.html
├── style.css
├── main.js
├── galaxynightlandscape.jpg
└── netlify/
    └── functions/
        └── apod.js
```
