# 🔭 Sky Gazers



## ✨ About

Sky Gazers is an educational web app that lets users explore NASA's Astronomy Picture of the Day by date.  Explore the [demo](https://skygazers-demo.netlify.app/)

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
