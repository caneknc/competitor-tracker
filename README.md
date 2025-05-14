# Competitor Sales Tracker

A simple web application for tracking competitor sales and stock information.

## Features

- Mobile-friendly interface
- Easy data entry for promoters
- Dynamic competitor model selection
- Google Sheets integration for data storage
- No login required

## Setup Instructions

### 1. Set up Google Apps Script

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Replace the default code with the contents of `google-apps-script.js`
4. Deploy the script as a web app:
   - Click "Deploy" > "New deployment"
   - Select "Web app"
   - Set "Execute as" to "Me"
   - Set "Who has access" to "Anyone"
   - Click "Deploy"
   - Copy the web app URL

### 2. Configure the Web App

1. Open `js/script.js`
2. Replace `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL` with the URL you copied from the Google Apps Script deployment

### 3. Host the Application

You can host this application on any static web hosting service like GitHub Pages, Netlify, or Vercel.

## Usage

1. Open the web app in a browser
2. Fill in your name and store name
3. Select the date (defaults to today)
4. Choose your smartphone model
5. Enter sales and stock information for each competitor
6. Click "Submit Data"

## Data Storage

All data is stored in a Google Sheet. Each submission creates a new row with the following columns:
- Timestamp
- Promoter Name
- Store Name
- Date
- Our Model
- Competitor Model
- Sales
- Stock

## Customization

You can customize the models and competitors by editing the `modelCompetitors` object in `js/script.js`.

## License

This project is open source and available under the MIT License.
