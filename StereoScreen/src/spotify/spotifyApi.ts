
import credentials from "./credentials"

const BASE_URL = "https://api.spotify.com";

const authenticate = async () : Promise<Boolean> => {     
    const promise = fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
        'Authorization': 'Basic ' + (new Buffer(credentials.client_id + ':' + credentials.client_scret).toString('base64')),
        'Content-Type': "application/json"
    },
    body: JSON.stringify({
        grant_type: 'client_credentials'
    })             
    }).then((response) => {
        if(response.ok){
            return response.json();
        }
        else{
            throw Error(`${response.status}: ${response.statusText}`);
        }
    }).then((json: TokenResponse) => {
        
    });    


    return promise;    
}

export { authenticate }

class TokenResponse{
    access_token: String;
    token_type: String;
    expires_in: Number;
}