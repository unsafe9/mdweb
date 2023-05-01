// this is an example for run graph.py in background

const {app, BrowserWindow} = require('electron')
const path = require('path')
const {watch} = require('fs-extra')
const {spawn} = require('child_process')

let mainWindow
const htmlfile = 'index.html'

function createWindow() {
    // Run the Python script and continuously update the index.html file.
    const pythonProcess = spawn('python', ['graph.py'])
    pythonProcess.stdout.on('data', (data) => {
        console.log(data.toString())
    })
    pythonProcess.stderr.on('data', (data) => {
        console.error(data.toString())
    })

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
        },
        autoHideMenuBar: true,
    })

    // Load the index.html file.
    mainWindow.loadFile(htmlfile)

    // Open the DevTools.
    mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    // Watch the output file and reload the app when it changes
    watch(htmlfile, () => {
        mainWindow.reload()
    })
    createWindow()

    // app.on('activate', function () {
    //     if (BrowserWindow.getAllWindows().length === 0) createWindow()
    // })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})
