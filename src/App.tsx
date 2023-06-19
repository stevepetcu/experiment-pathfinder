import type {Component} from 'solid-js';
import {createSignal, Show} from 'solid-js';

import GridMapSquarePixi from './components/GridMapSquarePixi';

const App: Component = () => {
  const [isGameRestarted, setIsGameRestarted] = createSignal(false);

  const restartGame = () => {
    // Dirty hack to refresh the component because the scope creep on this project is getting real.
    setIsGameRestarted(true);

    setTimeout(() => setIsGameRestarted(false), 50);
  };

  return (
    <Show when={!isGameRestarted()}><div id='my-app' class={'container m-0 font-vt323'}>
      <GridMapSquarePixi restartGameCallback={restartGame} />
    </div></Show>
  );
};

export default App;
