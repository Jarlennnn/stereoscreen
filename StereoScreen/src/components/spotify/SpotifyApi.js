
import credentials from "./credentials";
import { writable, readable } from 'svelte/store';
const electron = window.require('electron');
const remote = electron.remote
const { BrowserWindow, dialog, Menu } = remote
const fs = window.require("fs");

const BASE_URL = "https://api.spotify.com/v1";
let TOKEN = null;

const currentlyPlayingWatcher = readable(null, function start(set) {
    const that = this;
    // const interval = setInterval(() => {
    //     getCurrentlyPlaying()
    //         .then((item) => {
    //             that.set(item)
    //         })
    //         .catch((error) => console.error(error));
    // }, 2500);
    getCurrentlyPlaying()
    .then((item) => {
        set(item)
    })
    .catch((error) => console.error(error));

    return function stop() {
        // clearInterval(interval);
    }
});

const isAuthenticated = () => TOKEN != null && TOKEN.expires > Date.now();

const loadPreviousAuthentication = () => {
    try{
        const data = fs.readFileSync("tokens.json", {
            encoding: 'utf8',
            flag: 'r'
        });

        if(data.length > 0){
            TOKEN = JSON.parse(data);
        }
    }
    catch(e) { console.error(e); }    
}

const doAuth = () => 
{       
    if(TOKEN == null){
        return new Promise((resolve, reject) => {
            var authWindow = new BrowserWindow({
                width: 1000,
                height: 800,
                show: false,
            });
        
            var scopes = "user-read-playback-state"
            authWindow.loadURL(`https://accounts.spotify.com/authorize?response_type=code&client_id=${credentials.client_id}&redirect_uri=${credentials.redirect_uri}&scope=${scopes}`);
            authWindow.show();
        
            function handleCallback(url) {
                console.log(url);
        
                let query = url.split("?")[1];
                let code = query.substr(5, query.length - 5);  
        
                if (code) {
                    // Close the browser if code found or error
                    authWindow.destroy();
                }  
                
                //save to file and fulfill promise
                requestAndSaveToken(code, function(boolResult){
                    if(boolResult){
                        resolve(true);
                    }
                    else{
                        reject();
                    }
                });
            }
        
            authWindow.webContents.on('will-navigate', function (event, url) {
                handleCallback(url);
            });
        
            authWindow.webContents.on('did-get-redirect-request', function (
                event,
                oldUrl,
                newUrl
            ) {
                handleCallback(newUrl);
            });
            // Reset the authWindow on close
            authWindow.on(
                'close',
                function () {
                    authWindow = null;
                },
                false
            ); 
        });
    }
    else{
        return new Promise((resolve, reject) => {
            refreshToken(TOKEN.refresh_token, function(boolResult){
                if(boolResult){
                    resolve(true);
                }
                else{
                    reject();
                }
            });
        });
    }    
}

const requestAndSaveToken = (code, callback) => {
    const promise = fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            'Authorization': 'Basic ' + (new Buffer(credentials.client_id + ':' + credentials.client_scret).toString('base64')),
            'Content-Type': "application/x-www-form-urlencoded"
        },
        body: `grant_type=authorization_code&code=${code}&redirect_uri=${credentials.redirect_uri}`
    })
    .then((resp) => resp.json())
    .then((json) => {
        let _tokens = {
            access_token: json.access_token,
            refresh_token: json.refresh_token,
            expires: Date.now() + (json.expires_in * 1000)
        };

        TOKEN = _tokens;

        fs.writeFileSync("tokens.json", JSON.stringify(_tokens));
        callback(true);
    })
    .catch((error) => {
        console.error(error);
        fs.writeFileSync("error.txt", error.toString());
        callback(false);
    })
}


const refreshToken = (refreshToken, callback) => {
    const promise = fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            'Authorization': 'Basic ' + (new Buffer(credentials.client_id + ':' + credentials.client_scret).toString('base64')),
            'Content-Type': "application/x-www-form-urlencoded"
        },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}`
    })
    .then((resp) => resp.json())
    .then((json) => {

        let _tokens = {
            access_token: json.access_token,
            refresh_token: refreshToken,
            expires: Date.now() + (json.expires_in * 1000)
        };

        TOKEN = _tokens;

        fs.writeFileSync("tokens.json", JSON.stringify(_tokens));
        callback(true);
    })
    .catch((error) => {
        console.error(error);
        fs.writeFileSync("error.txt", error.toString());
        callback(false);
    })
}

const getAuthHeaders = () => {
    return {
        "Authorization": `Bearer ${TOKEN.access_token}`,
        'Content-Type': "application/json"
    }
}

const getNewReleases = async () => {
    const promise = fetch(`${BASE_URL}/browse/new-releases?country=SE&limit=20&offset=0`, {
        method: "GET",
        headers: getAuthHeaders(),
    })
        .then((resp) => resp.json())
        .then((items) => console.log(items));


}

const getCurrentlyPlaying = async () => {

    console.log(TOKEN);
    

    const promise = fetch(`${BASE_URL}/me/player`, {
        headers: getAuthHeaders(),
    })
        .then((response) => {
            if (response.ok) {
                return response.json()
            }
            else {
                if (response.status == 429) {
                    //idk
                }
            }
        })
        .then((json) => json);

    return promise;
}

export { isAuthenticated, currentlyPlayingWatcher, doAuth, loadPreviousAuthentication }

