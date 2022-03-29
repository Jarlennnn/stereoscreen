<script>    
    import { isAuthenticated, currentlyPlayingWatcher, doAuth, loadPreviousAuthentication } from './SpotifyApi';          
    // import type { PlaybackState } from './playbackState';
    import CurrentlyPlaying from './CurrentlyPlaying.svelte';

    loadPreviousAuthentication();   
    const authenticationPromise = doAuth(); 
    
    let playbackState = null;
    authenticationPromise.then((authenticated) => {        
        if(authenticated){
            currentlyPlayingWatcher.subscribe(value => {
                playbackState = value;
                console.log(value);
            });
        }
    });
    // if(isAuthenticated() == false){
    //     doAuth()
    // }    

</script> 

<div class="container">    
    
    {#await authenticationPromise}
        <p>Authentisering pågår...</p>
    {:then authenticated}
        {#if authenticated}            
            <CurrentlyPlaying currentPlaybackState={playbackState} />
        {:else}
            <p>Failed to auth!</p>
        {/if}
    {:catch error}
        <p>Error! {error}</p>
    {/await}
</div>


<!-- <CurrentlyPlaying currentPlaybackState={playbackState}/> -->