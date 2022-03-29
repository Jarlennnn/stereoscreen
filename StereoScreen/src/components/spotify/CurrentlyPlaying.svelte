<script>
    // import type { PlaybackState } from './playbackState';
    export let currentPlaybackState;
</script>

<div class="currently-playing">
    <span class="album-cover">
        Very nice
    </span>
    <div class="title-and-time">
        <span class="title">
            {#if currentPlaybackState != null && currentPlaybackState.is_playing}
                <p>{currentPlaybackState.item.name}</p>
            {:else}
                <p>Nothing is playing.</p>
            {/if}
        </span>
        <span class="time-container">
            <span class="track">
                <span class="ball"></span>
            </span>
        </span>
    </div>
    

</div>

<style>
    .currently-playing {
        display: flex;
        
        padding: 2rem;
        border: 1px solid white;
        color: white;
        justify-content: center;
        flex-direction: column;
        align-items: center;
    }

    .title-and-time{
        
    }

    .title{
        font-family: Arial, Helvetica, sans-serif;
        font-weight: bold;        
    }

    .track{
        width: 100%;
        background-color: white;
        height: 8px;
    }
    
    .album-cover{
        height: 400px;
        background-color: red;
        width: 400px;
    }
</style>
