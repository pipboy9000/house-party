import Home from './Home.svelte';
import Station from './Station.svelte';

export const routes = {
    // Exact path
    '/': Home,

    // Using named parameters, with last being optional
    '/:stationId': Station
}