<script>
	import Spotify from "./components/spotify/Spotify.svelte"
</script>

<main>
	<Spotify/>
	
</main>

<style>
	main {
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgb(43, 54, 61);
		height: 100%;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>