import type {Component} from 'solid-js';
import {createSignal, onMount, Show} from 'solid-js';

import GridMapSquarePixi from './components/GridMapSquarePixi';

const App: Component = () => {
  const [containerWidth, setContainerWidth] = createSignal(0);

  onMount(() => {
    const containerElement = document.getElementById('my-app')?.clientWidth;
    setContainerWidth(containerElement || 0);
  });

  return (
    <div id='my-app' class={'container mx-auto'}>
      <h1 class={'text-5xl font-black text-center'}>Pathfinder app</h1>
      <Show when={containerWidth() > 0}>
        <GridMapSquarePixi width={containerWidth()}/>
      </Show>
    </div>
  );
};

export default App;
