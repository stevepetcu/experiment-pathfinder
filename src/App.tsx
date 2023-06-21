import type {Component, JSXElement} from 'solid-js';
import {createSignal, onMount, Show} from 'solid-js';
import { HttpHeader } from 'solid-start/server';

import GridMapSquarePixi from './components/GridMapSquarePixi';

const App: Component = () => {
  const [isGameRestarted, setIsGameRestarted] = createSignal(false);
  const [gameScreen, setGameScreen] = createSignal<JSXElement>();

  const restartGame = () => {
    // Dirty hack to free the memory because the scope creep on this project is getting real.
    setIsGameRestarted(true);
    setGameScreen(null);

    setTimeout(() => {
      setIsGameRestarted(false);
      setGameScreen(<GridMapSquarePixi restartGameCallback={restartGame} />);
    }, 300);
  };

  onMount(() => {
    setGameScreen(<GridMapSquarePixi restartGameCallback={restartGame} />);
  });

  return (
    <>
      <HttpHeader name={'my-header'} value={'bruv'}/>
      <Show when={!isGameRestarted() && gameScreen()}>
        <div id='my-app' class={'m-0 font-vt323'}>
          {gameScreen()}
        </div>
      </Show>
    </>
  );
};

export default App;
